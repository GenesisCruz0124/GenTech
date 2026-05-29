import { getDB } from '../db/database';

export interface DevicePurchase {
  id: number;
  customer_id: number;
  device_name: string;
  device_model: string;
  imei: string | null;
  purchase_price: number;
  notes: string | null;
  purchased_at: string;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
}

export interface CreateDevicePurchaseInput {
  customer_id: number;
  device_name: string;
  device_model: string;
  imei?: string;
  purchase_price: number;
  notes?: string;
}

export async function createDevicePurchase(input: CreateDevicePurchaseInput): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO device_purchases (customer_id, device_name, device_model, imei, purchase_price, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.customer_id, input.device_name, input.device_model, input.imei ?? null, input.purchase_price, input.notes ?? null]
  );
  return result.lastInsertRowId;
}

export async function getAllDevicePurchases(): Promise<DevicePurchase[]> {
  const db = await getDB();
  return db.getAllAsync<DevicePurchase>(
    `SELECT dp.*, c.name as customer_name, c.phone as customer_phone
     FROM device_purchases dp
     JOIN customers c ON c.id = dp.customer_id
     ORDER BY dp.purchased_at DESC`
  );
}

export async function getDevicePurchaseById(id: number): Promise<DevicePurchase | null> {
  const db = await getDB();
  return db.getFirstAsync<DevicePurchase>(
    `SELECT dp.*, c.name as customer_name, c.phone as customer_phone
     FROM device_purchases dp
     JOIN customers c ON c.id = dp.customer_id
     WHERE dp.id = ?`,
    [id]
  );
}

export async function deleteDevicePurchase(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM device_purchases WHERE id = ?', [id]);
}
