import { getDB } from '../db/database';

// ── Constants ─────────────────────────────────────────────────────────────────
const TRIAL_DAYS = 1;
const SECRET = 'GT2025_GENTECH_SEC'; // keep private

// ── Limits during free trial ──────────────────────────────────────────────────
export const TRIAL_LIMITS = {
  repairs:   10,
  customers: 10,
  suppliers: 3,
  cotechs:   3,
};

// ── Hash utility (FNV-1a, pure JS) ───────────────────────────────────────────
function fnv32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function hex4(n: number): string {
  return (n & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

// ── Device ID — stable per device, shown to user for key generation ──────────
let _deviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (_deviceId) return _deviceId;
  try {
    const db = await getDB();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'device_id'`
    );
    if (row?.value) {
      _deviceId = row.value;
      return _deviceId;
    }
    // Generate a stable UUID on first launch and persist it
    const a = Date.now().toString(36).toUpperCase();
    const b = Math.random().toString(36).slice(2, 8).toUpperCase();
    const c = Math.random().toString(36).slice(2, 6).toUpperCase();
    _deviceId = `${a}${b}${c}`.slice(0, 12);
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES ('device_id', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [_deviceId]
    );
  } catch {
    _deviceId = Math.random().toString(36).slice(2, 14).toUpperCase();
  }
  return _deviceId;
}

// ── Key generation (device-bound) ─────────────────────────────────────────────
// Run in scripts/generate-license.js — NOT in the app
export function generateLicenseKey(deviceId: string): string {
  const id = deviceId.trim().toUpperCase();
  const p1 = hex4(fnv32(id + SECRET));
  const p2 = hex4(fnv32(SECRET + id));
  const ck = hex4(fnv32(p1 + p2 + SECRET + id)); // device ID in checksum
  return `GT-${p1}-${p2}-${ck}`;
}

// ── Key validation (device-bound) ─────────────────────────────────────────────
// Only the key generated for THIS device's ID will pass
export async function validateLicenseKey(key: string): Promise<boolean> {
  const deviceId = await getDeviceId();
  const expected = generateLicenseKey(deviceId);
  const clean = key.trim().toUpperCase().replace(/[\s-]/g, '');
  const exp   = expected.replace(/[\s-]/g, '');
  return clean === exp;
}

// ── Settings helpers ──────────────────────────────────────────────────────────
async function getSetting(key: string): Promise<string | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`, [key]
  );
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

// ── Public API ─────────────────────────────────────────────────────────────────
export interface LicenseStatus {
  isPro: boolean;
  isTrialActive: boolean;
  isExpired: boolean;
  daysLeft: number;
  hoursLeft: number;
  trialStartedAt: string | null;
  deviceId: string;
}

export async function getLicenseStatus(): Promise<LicenseStatus> {
  const deviceId = await getDeviceId();

  // Check pro activation
  const storedKey = await getSetting('license_key');
  if (storedKey && await validateLicenseKey(storedKey)) {
    return { isPro: true, isTrialActive: false, isExpired: false, daysLeft: 0, hoursLeft: 0, trialStartedAt: null, deviceId };
  }

  // Initialise trial on first launch
  let trialStart = await getSetting('trial_started_at');
  if (!trialStart) {
    trialStart = new Date().toISOString();
    await setSetting('trial_started_at', trialStart);
  }

  const elapsedMs  = Date.now() - new Date(trialStart).getTime();
  const trialMs    = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const remaining  = trialMs - elapsedMs;
  const isExpired  = remaining <= 0;

  return {
    isPro: false,
    isTrialActive: !isExpired,
    isExpired,
    daysLeft:  isExpired ? 0 : Math.ceil(remaining / (24 * 60 * 60 * 1000)),
    hoursLeft: isExpired ? 0 : Math.ceil(remaining / (60 * 60 * 1000)),
    trialStartedAt: trialStart,
    deviceId,
  };
}

export async function activateLicense(key: string): Promise<{ success: boolean; error?: string }> {
  const valid = await validateLicenseKey(key);
  if (!valid) {
    return { success: false, error: 'Invalid key or this key was generated for a different device.\n\nShare your Device ID with the developer to get a key for this device.' };
  }
  await setSetting('license_key', key.trim().toUpperCase());
  return { success: true };
}

export async function getTrialCounts(): Promise<{ repairs: number; customers: number; suppliers: number; cotechs: number }> {
  const db = await getDB();
  const r  = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM repairs');
  const cu = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM customers WHERE is_deleted = 0');
  const s  = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM suppliers');
  const ct = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM co_techs');
  return {
    repairs:   r?.c  ?? 0,
    customers: cu?.c ?? 0,
    suppliers: s?.c  ?? 0,
    cotechs:   ct?.c ?? 0,
  };
}
