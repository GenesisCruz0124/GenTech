import { getDB } from '../db/database';

export interface DeviceModel {
  id: number;
  name: string;
  brand_id: number | null;
  brand_name: string | null;
  year_released: number | null;
  created_at: string;
}

export async function getAllDeviceModels(): Promise<DeviceModel[]> {
  const db = await getDB();
  return db.getAllAsync<DeviceModel>(
    `SELECT dm.*, b.name as brand_name
     FROM device_models dm
     LEFT JOIN device_brands b ON b.id = dm.brand_id
     ORDER BY b.name ASC, dm.name ASC`
  );
}

export async function searchDeviceModels(query: string): Promise<DeviceModel[]> {
  const db = await getDB();
  const q = `%${query}%`;
  return db.getAllAsync<DeviceModel>(
    `SELECT dm.*, b.name as brand_name
     FROM device_models dm
     LEFT JOIN device_brands b ON b.id = dm.brand_id
     WHERE dm.name LIKE ? OR b.name LIKE ?
     ORDER BY dm.name ASC
     LIMIT 8`,
    [q, q]
  );
}

export async function createDeviceModel(name: string, brandId?: number): Promise<number> {
  const db = await getDB();
  await db.runAsync(
    'INSERT OR IGNORE INTO device_models (name, brand_id) VALUES (?, ?)',
    [name.trim(), brandId ?? null]
  );
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM device_models WHERE name = ? LIMIT 1',
    [name.trim()]
  );
  return existing?.id ?? 0;
}

export async function updateDeviceModel(id: number, name: string, brandId?: number, yearReleased?: number | null): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'UPDATE device_models SET name = ?, brand_id = ?, year_released = ? WHERE id = ?',
    [name.trim(), brandId ?? null, yearReleased ?? null, id]
  );
}

export async function deleteDeviceModel(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM device_models WHERE id = ?', [id]);
}
