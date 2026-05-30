import { getDB } from '../db/database';
import * as FileSystem from 'expo-file-system/legacy';

export interface RepairPayment {
  id: number;
  repair_id: number;
  amount: number;
  payment_date: string;
  payment_mode: string | null;
  notes: string | null;
  image_uri: string | null;
  created_at: string;
}

const PAYMENT_IMAGE_DIR = FileSystem.documentDirectory + 'payment_proofs/';

export async function savePaymentProof(tempUri: string): Promise<string> {
  const info = await FileSystem.getInfoAsync(PAYMENT_IMAGE_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(PAYMENT_IMAGE_DIR, { intermediates: true });
  const dest = PAYMENT_IMAGE_DIR + `proof_${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

export async function addRepairPayment(
  repairId: number,
  amount: number,
  paymentDate: string,
  options?: { notes?: string; paymentMode?: string; imageUri?: string }
): Promise<void> {
  const db = await getDB();
  let storedUri: string | null = null;
  if (options?.imageUri) {
    storedUri = await savePaymentProof(options.imageUri);
  }
  await db.runAsync(
    `INSERT INTO repair_payments (repair_id, amount, payment_date, notes, payment_mode, image_uri)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [repairId, amount, paymentDate, options?.notes ?? null, options?.paymentMode ?? null, storedUri]
  );
  await syncPaymentStatus(repairId);
}

export async function getRepairPayments(repairId: number): Promise<RepairPayment[]> {
  const db = await getDB();
  return db.getAllAsync<RepairPayment>(
    `SELECT * FROM repair_payments WHERE repair_id = ? ORDER BY payment_date ASC`,
    [repairId]
  );
}

export async function getTotalPaid(repairId: number): Promise<number> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM repair_payments WHERE repair_id = ?`,
    [repairId]
  );
  return row?.total ?? 0;
}

export async function deleteRepairPayment(id: number, repairId: number): Promise<void> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ image_uri: string | null }>(
    'SELECT image_uri FROM repair_payments WHERE id = ?', [id]
  );
  await db.runAsync('DELETE FROM repair_payments WHERE id = ?', [id]);
  if (row?.image_uri) {
    try { await FileSystem.deleteAsync(row.image_uri, { idempotent: true }); } catch {}
  }
  await syncPaymentStatus(repairId);
}

async function syncPaymentStatus(repairId: number): Promise<void> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ total_paid: number; total_owed: number }>(
    `SELECT
       COALESCE((SELECT SUM(amount) FROM repair_payments WHERE repair_id = ?), 0) as total_paid,
       COALESCE(final_cost, estimated_cost) as total_owed
     FROM repairs WHERE id = ?`,
    [repairId, repairId]
  );
  if (!row) return;
  const isPaid = row.total_paid >= row.total_owed ? 1 : 0;
  await db.runAsync('UPDATE repairs SET is_paid = ? WHERE id = ?', [isPaid, repairId]);
}

export const PAYMENT_MODES = ['Cash', 'GCash', 'PayMaya', 'Bank Transfer', 'Debit Card', 'Credit Card', 'Other'];
