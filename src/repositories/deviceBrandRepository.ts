import { getDB } from '../db/database';

export interface DeviceBrand {
  id: number;
  name: string;
  created_at: string;
}

export async function getAllDeviceBrands(): Promise<DeviceBrand[]> {
  const db = await getDB();
  return db.getAllAsync<DeviceBrand>('SELECT * FROM device_brands ORDER BY name ASC');
}

export async function createDeviceBrand(name: string): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync('INSERT INTO device_brands (name) VALUES (?)', [name.trim()]);
  return result.lastInsertRowId;
}

export async function updateDeviceBrand(id: number, name: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('UPDATE device_brands SET name = ? WHERE id = ?', [name.trim(), id]);
}

export async function deleteDeviceBrand(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('UPDATE parts SET brand_id = NULL WHERE brand_id = ?', [id]);
  await db.runAsync('DELETE FROM device_brands WHERE id = ?', [id]);
}
