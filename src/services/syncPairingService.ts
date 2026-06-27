import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getSetting, setSetting } from '../repositories/settingsRepository';
import { getDeviceId } from './licenseService';

const SETTING_SHOP_ID = 'sync_shop_id';
const SETTING_SHOP_CODE = 'sync_shop_code';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — avoids misreads

function generateShopCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function ensureAnonymousSession(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user?.id) return data.session.user.id;

  const { data: signInData, error } = await supabase.auth.signInAnonymously();
  if (error || !signInData.session?.user?.id) {
    throw new Error(error?.message ?? 'Could not start a secure session.');
  }
  return signInData.session.user.id;
}

export interface SyncShopInfo {
  shopId: string;
  shopCode: string;
}

export async function getLinkedShop(): Promise<SyncShopInfo | null> {
  const shopId = await getSetting(SETTING_SHOP_ID);
  const shopCode = await getSetting(SETTING_SHOP_CODE);
  if (!shopId || !shopCode) return null;
  return { shopId, shopCode };
}

export async function unlinkShop(): Promise<void> {
  await setSetting(SETTING_SHOP_ID, '');
  await setSetting(SETTING_SHOP_CODE, '');
}

export async function createShop(): Promise<SyncShopInfo> {
  if (!isSupabaseConfigured) throw new Error('Cloud sync is not configured for this app build.');

  const authUserId = await ensureAnonymousSession();
  const deviceId = await getDeviceId();

  let code = generateShopCode();
  // Extremely unlikely collision, but verify uniqueness before insert.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase.from('shops').select('id').eq('code', code).maybeSingle();
    if (!existing) break;
    code = generateShopCode();
  }

  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .insert({ code })
    .select('id, code')
    .single();
  if (shopError || !shop) throw new Error(shopError?.message ?? 'Could not create shop.');

  const { error: deviceError } = await supabase
    .from('shop_devices')
    .insert({ shop_id: shop.id, device_id: deviceId, auth_user_id: authUserId });
  if (deviceError) throw new Error(deviceError.message);

  await setSetting(SETTING_SHOP_ID, shop.id);
  await setSetting(SETTING_SHOP_CODE, shop.code);
  return { shopId: shop.id, shopCode: shop.code };
}

export async function joinShop(rawCode: string): Promise<SyncShopInfo> {
  if (!isSupabaseConfigured) throw new Error('Cloud sync is not configured for this app build.');

  const code = rawCode.trim().toUpperCase();
  const authUserId = await ensureAnonymousSession();
  const deviceId = await getDeviceId();

  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('id, code')
    .eq('code', code)
    .maybeSingle();
  if (shopError) throw new Error(shopError.message);
  if (!shop) throw new Error('Sync code not found. Check the code and try again.');

  const { error: deviceError } = await supabase
    .from('shop_devices')
    .upsert({ shop_id: shop.id, device_id: deviceId, auth_user_id: authUserId }, { onConflict: 'shop_id,device_id' });
  if (deviceError) throw new Error(deviceError.message);

  await setSetting(SETTING_SHOP_ID, shop.id);
  await setSetting(SETTING_SHOP_CODE, shop.code);
  return { shopId: shop.id, shopCode: shop.code };
}
