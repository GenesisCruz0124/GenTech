import { getDB } from '../db/database';
import { trackInsert, trackDelete, getUuid } from '../services/syncTrackHelpers';

export interface DeviceSale {
  id: number;
  customer_id: number;
  device_name: string;
  device_model: string;
  imei: string | null;
  sale_price: number;
  notes: string | null;
  image_uri: string | null;
  sold_at: string;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
}

export interface CreateDeviceSaleInput {
  customer_id: number;
  device_name: string;
  device_model: string;
  imei?: string;
  sale_price: number;
  notes?: string;
  image_uri?: string;
}

export async function createDeviceSale(input: CreateDeviceSaleInput): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO device_sales (customer_id, device_name, device_model, imei, sale_price, notes, image_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.customer_id, input.device_name, input.device_model, input.imei ?? null, input.sale_price, input.notes ?? null, input.image_uri ?? null]
  );
  await trackInsert(db, 'device_sales', result.lastInsertRowId);
  return result.lastInsertRowId;
}

export async function getAllDeviceSales(): Promise<DeviceSale[]> {
  const db = await getDB();
  return db.getAllAsync<DeviceSale>(
    `SELECT ds.*, c.name as customer_name, c.phone as customer_phone
     FROM device_sales ds
     JOIN customers c ON c.id = ds.customer_id
     ORDER BY ds.sold_at DESC`
  );
}

export async function getDeviceSaleById(id: number): Promise<DeviceSale | null> {
  const db = await getDB();
  return db.getFirstAsync<DeviceSale>(
    `SELECT ds.*, c.name as customer_name, c.phone as customer_phone
     FROM device_sales ds
     JOIN customers c ON c.id = ds.customer_id
     WHERE ds.id = ?`,
    [id]
  );
}

export async function deleteDeviceSale(id: number): Promise<void> {
  const db = await getDB();
  const uuid = await getUuid(db, 'device_sales', id);
  await db.runAsync('DELETE FROM device_sales WHERE id = ?', [id]);
  await trackDelete('device_sales', uuid);
}
