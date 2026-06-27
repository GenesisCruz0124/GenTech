import { getDB } from '../db/database';
import * as FileSystem from 'expo-file-system/legacy';
import { savePaymentProof, PAYMENT_MODES } from './repairPaymentRepository';
import { trackInsert, trackDelete, getUuid } from '../services/syncTrackHelpers';

export interface DeviceSalePayment {
  id: number;
  device_sale_id: number;
  amount: number;
  payment_date: string;
  payment_mode: string | null;
  notes: string | null;
  image_uri: string | null;
  created_at: string;
}

export async function addDeviceSalePayment(
  saleId: number,
  amount: number,
  paymentDate: string,
  options?: { notes?: string; paymentMode?: string; imageUri?: string }
): Promise<void> {
  const db = await getDB();
  let storedUri: string | null = null;
  if (options?.imageUri) {
    storedUri = await savePaymentProof(options.imageUri);
  }
  const result = await db.runAsync(
    `INSERT INTO device_sale_payments (device_sale_id, amount, payment_date, notes, payment_mode, image_uri)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [saleId, amount, paymentDate, options?.notes ?? null, options?.paymentMode ?? null, storedUri]
  );
  await trackInsert(db, 'device_sale_payments', result.lastInsertRowId);
}

export async function getDeviceSalePayments(saleId: number): Promise<DeviceSalePayment[]> {
  const db = await getDB();
  return db.getAllAsync<DeviceSalePayment>(
    `SELECT * FROM device_sale_payments WHERE device_sale_id = ? ORDER BY payment_date ASC`,
    [saleId]
  );
}

export async function getTotalPaid(saleId: number): Promise<number> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM device_sale_payments WHERE device_sale_id = ?`,
    [saleId]
  );
  return row?.total ?? 0;
}

export async function deleteDeviceSalePayment(id: number, saleId: number): Promise<void> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ image_uri: string | null }>(
    'SELECT image_uri FROM device_sale_payments WHERE id = ?', [id]
  );
  const uuid = await getUuid(db, 'device_sale_payments', id);
  await db.runAsync('DELETE FROM device_sale_payments WHERE id = ?', [id]);
  await trackDelete('device_sale_payments', uuid);
  if (row?.image_uri) {
    try { await FileSystem.deleteAsync(row.image_uri, { idempotent: true }); } catch {}
  }
}

export { PAYMENT_MODES };
