import { getDB } from '../db/database';
import { trackInsert, trackDelete, trackUpdate, getUuid } from '../services/syncTrackHelpers';

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

export interface UpdateDevicePurchaseInput {
  device_name?: string;
  device_model?: string;
  imei?: string | null;
  purchase_price?: number;
  notes?: string | null;
  image_uri?: string | null;
}

export interface CreateDevicePurchaseInput {
  customer_id: number;
  device_name: string;
  device_model: string;
  imei?: string;
  purchase_price: number;
  notes?: string;
  image_uri?: string;
}

export async function createDevicePurchase(input: CreateDevicePurchaseInput): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO device_purchases (customer_id, device_name, device_model, imei, purchase_price, notes, image_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.customer_id, input.device_name, input.device_model, input.imei ?? null, input.purchase_price, input.notes ?? null, input.image_uri ?? null]
  );
  await trackInsert(db, 'device_purchases', result.lastInsertRowId);
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

export async function updateDevicePurchase(id: number, input: UpdateDevicePurchaseInput): Promise<void> {
  const db = await getDB();
  const fields: string[] = [];
  const values: any[] = [];
  if (input.device_name !== undefined) { fields.push('device_name = ?'); values.push(input.device_name); }
  if (input.device_model !== undefined) { fields.push('device_model = ?'); values.push(input.device_model); }
  if (input.imei !== undefined) { fields.push('imei = ?'); values.push(input.imei); }
  if (input.purchase_price !== undefined) { fields.push('purchase_price = ?'); values.push(input.purchase_price); }
  if (input.notes !== undefined) { fields.push('notes = ?'); values.push(input.notes); }
  if (input.image_uri !== undefined) { fields.push('image_uri = ?'); values.push(input.image_uri); }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE device_purchases SET ${fields.join(', ')} WHERE id = ?`, values);
  await trackUpdate(db, 'device_purchases', id);
}

export async function deleteDevicePurchase(id: number): Promise<void> {
  const db = await getDB();
  const uuid = await getUuid(db, 'device_purchases', id);
  await db.runAsync('DELETE FROM device_purchases WHERE id = ?', [id]);
  await trackDelete('device_purchases', uuid);
}
