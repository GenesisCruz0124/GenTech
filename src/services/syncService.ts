import { AppState, AppStateStatus } from 'react-native';
import { getDB } from '../db/database';
import { getSetting, setSetting } from '../repositories/settingsRepository';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getLinkedShop } from './syncPairingService';
import { getQueuedChanges, clearQueuedChanges, enqueueFullBaseline, SyncQueueRow } from './syncQueueService';
import { SYNCABLE_TABLES } from '../db/migrations';

const SETTING_LAST_PULLED_AT = 'sync_last_pulled_at';
const PUSH_DEBOUNCE_MS = 5000;

// Tables referencing another syncable table via a local INTEGER id. On push
// the id is translated to the referenced row's uuid; on pull it's translated
// back to whatever local id that uuid maps to on this device.
const FK_MAP: Record<string, Record<string, string>> = {
  repairs: { customer_id: 'customers', assigned_staff_id: 'staff' },
  repair_notes: { repair_id: 'repairs', staff_id: 'staff' },
  repair_payments: { repair_id: 'repairs' },
  repair_parts: { repair_id: 'repairs', part_id: 'parts' },
  repair_images: { repair_id: 'repairs' },
  device_sales: { customer_id: 'customers' },
  device_purchases: { customer_id: 'customers' },
  device_sale_payments: { device_sale_id: 'device_sales' },
  parts_purchases: { part_id: 'parts' },
  invoices: { customer_id: 'customers' }, // ref_id is handled separately (type-dependent)
};

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let appStateSub: { remove: () => void } | null = null;
let syncing = false;

export interface SyncResult {
  pushed: number;
  pulled: number;
}

export function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushQueue().catch(() => {});
  }, PUSH_DEBOUNCE_MS);
}

async function lookupUuid(db: Awaited<ReturnType<typeof getDB>>, table: string, localId: number | null): Promise<string | null> {
  if (localId == null) return null;
  const row = await db.getFirstAsync<{ uuid: string }>(`SELECT uuid FROM ${table} WHERE id = ?`, [localId]);
  return row?.uuid ?? null;
}

async function lookupLocalId(db: Awaited<ReturnType<typeof getDB>>, table: string, uuid: string | null): Promise<number | null> {
  if (!uuid) return null;
  const row = await db.getFirstAsync<{ id: number }>(`SELECT id FROM ${table} WHERE uuid = ?`, [uuid]);
  return row?.id ?? null;
}

export async function pushQueue(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const shop = await getLinkedShop();
  if (!shop) return 0;

  const db = await getDB();
  const queued = await getQueuedChanges(500);
  if (queued.length === 0) return 0;

  // Dedupe: keep only the latest op per (table, uuid).
  const latest = new Map<string, SyncQueueRow>();
  for (const q of queued) latest.set(`${q.table_name}:${q.record_uuid}`, q);

  let pushedCount = 0;
  for (const change of latest.values()) {
    try {
      if (change.op === 'delete') {
        await supabase.from('sync_records').upsert({
          shop_id: shop.shopId,
          table_name: change.table_name,
          record_uuid: change.record_uuid,
          payload: null,
          updated_at: new Date().toISOString(),
          deleted_at: new Date().toISOString(),
        }, { onConflict: 'shop_id,table_name,record_uuid' });
      } else {
        const row = await db.getFirstAsync<Record<string, any>>(
          `SELECT * FROM ${change.table_name} WHERE uuid = ?`, [change.record_uuid]
        );
        if (!row) continue; // already gone locally — nothing to push

        const payload: Record<string, any> = { ...row };
        delete payload.id;

        const fkCols = FK_MAP[change.table_name] ?? {};
        for (const [col, refTable] of Object.entries(fkCols)) {
          payload[col] = await lookupUuid(db, refTable, row[col] ?? null);
        }
        if (change.table_name === 'invoices' && typeof row.ref_id === 'number') {
          const refTable = row.type === 'repair' ? 'repairs' : 'device_sales';
          payload.ref_id = await lookupUuid(db, refTable, row.ref_id);
          payload.ref_table = refTable;
        }

        await supabase.from('sync_records').upsert({
          shop_id: shop.shopId,
          table_name: change.table_name,
          record_uuid: change.record_uuid,
          payload,
          updated_at: row.updated_at ?? new Date().toISOString(),
          deleted_at: null,
        }, { onConflict: 'shop_id,table_name,record_uuid' });
      }
      pushedCount++;
    } catch {
      continue; // leave this change in the queue; retried on next push
    }
  }

  const allIds = queued.map(q => q.id);
  await clearQueuedChanges(allIds);
  return pushedCount;
}

export async function pullChanges(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const shop = await getLinkedShop();
  if (!shop) return 0;

  const lastPulledAt = (await getSetting(SETTING_LAST_PULLED_AT)) ?? '1970-01-01T00:00:00.000Z';

  const { data: records, error } = await supabase
    .from('sync_records')
    .select('table_name, record_uuid, payload, updated_at, deleted_at')
    .eq('shop_id', shop.shopId)
    .gt('updated_at', lastPulledAt)
    .order('updated_at', { ascending: true })
    .limit(1000);
  if (error || !records || records.length === 0) return 0;

  const db = await getDB();
  let maxUpdatedAt = lastPulledAt;

  for (const record of records) {
    try {
      if (record.updated_at > maxUpdatedAt) maxUpdatedAt = record.updated_at;
      const table = record.table_name;
      if (!SYNCABLE_TABLES.includes(table as any)) continue;

      if (record.deleted_at) {
        await db.runAsync(`DELETE FROM ${table} WHERE uuid = ?`, [record.record_uuid]);
        continue;
      }

      const payload: Record<string, any> = { ...record.payload };
      const fkCols = FK_MAP[table] ?? {};
      for (const [col, refTable] of Object.entries(fkCols)) {
        payload[col] = await lookupLocalId(db, refTable, payload[col] ?? null);
      }
      if (table === 'invoices' && payload.ref_table) {
        payload.ref_id = await lookupLocalId(db, payload.ref_table, payload.ref_id ?? null);
        delete payload.ref_table;
      }
      delete payload.id;

      const existingId = await lookupLocalId(db, table, record.record_uuid);
      const columns = Object.keys(payload);
      const values = columns.map(c => payload[c]);

      if (existingId != null) {
        const setClause = columns.map(c => `${c} = ?`).join(', ');
        await db.runAsync(`UPDATE ${table} SET ${setClause} WHERE id = ?`, [...values, existingId]);
      } else {
        const colList = columns.join(', ');
        const placeholders = columns.map(() => '?').join(', ');
        await db.runAsync(`INSERT INTO ${table} (${colList}) VALUES (${placeholders})`, values);
      }
    } catch {
      continue; // skip this record (e.g. an FK dependency that hasn't synced yet); retried next pull
    }
  }

  await setSetting(SETTING_LAST_PULLED_AT, maxUpdatedAt);
  return records.length;
}

export async function syncNow(): Promise<SyncResult> {
  if (syncing) return { pushed: 0, pulled: 0 };
  syncing = true;
  try {
    const pushed = await pushQueue();
    const pulled = await pullChanges();
    return { pushed, pulled };
  } finally {
    syncing = false;
  }
}

// Returns true if local data is small enough to safely auto-overwrite when
// joining an existing shop (a handful of rows from just opening the app).
export async function isLocalDataEmpty(threshold = 3): Promise<boolean> {
  const db = await getDB();
  let total = 0;
  for (const table of SYNCABLE_TABLES) {
    try {
      const row = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM ${table}`);
      total += row?.c ?? 0;
      if (total > threshold) return false;
    } catch {}
  }
  return true;
}

// Used right after joining an existing shop: discards local rows in
// syncable tables and pulls the shop's full history from scratch. Callers
// must back up local data first if isLocalDataEmpty() is false.
export async function wipeAndPullAll(): Promise<number> {
  const db = await getDB();
  for (const table of SYNCABLE_TABLES) {
    try { await db.runAsync(`DELETE FROM ${table}`); } catch {}
  }
  await setSetting(SETTING_LAST_PULLED_AT, '1970-01-01T00:00:00.000Z');
  return pullChanges();
}

// Used right after creating a new shop on the first device: queues every
// existing local row so the next push uploads the shop's starting dataset.
export async function pushFullBaseline(): Promise<number> {
  await enqueueFullBaseline(SYNCABLE_TABLES);
  return pushQueue();
}

export function startSyncListeners(): void {
  if (appStateSub) return;
  appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') {
      pullChanges().catch(() => {});
    }
  });
}

export function stopSyncListeners(): void {
  appStateSub?.remove();
  appStateSub = null;
}
