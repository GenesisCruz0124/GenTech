import { getDB } from '../db/database';
import * as FileSystem from 'expo-file-system/legacy';

export interface RepairImage {
  id: number;
  repair_id: number;
  image_uri: string;
  created_at: string;
}

const IMAGE_DIR = FileSystem.documentDirectory + 'repair_images/';

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
}

export async function saveRepairImage(repairId: number, tempUri: string): Promise<string> {
  await ensureDir();
  const filename = `repair_${repairId}_${Date.now()}.jpg`;
  const dest = IMAGE_DIR + filename;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  const db = await getDB();
  await db.runAsync(
    'INSERT INTO repair_images (repair_id, image_uri) VALUES (?, ?)',
    [repairId, dest]
  );
  return dest;
}

export async function getRepairImages(repairId: number): Promise<RepairImage[]> {
  const db = await getDB();
  return db.getAllAsync<RepairImage>(
    'SELECT * FROM repair_images WHERE repair_id = ? ORDER BY created_at ASC',
    [repairId]
  );
}

export async function deleteRepairImage(id: number, imageUri: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM repair_images WHERE id = ?', [id]);
  try { await FileSystem.deleteAsync(imageUri, { idempotent: true }); } catch {}
}
