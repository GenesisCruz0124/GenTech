import { getDB } from '../db/database';

export interface CoTech {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  facebook: string | null;
  photo_uri: string | null;
  notes: string | null;
  created_at: string;
}

export async function getAllCoTechs(): Promise<CoTech[]> {
  const db = await getDB();
  return db.getAllAsync<CoTech>(
    `SELECT id, name, phone, address, email, facebook, photo_uri, notes, created_at
     FROM co_techs ORDER BY name ASC`
  );
}

export async function getCoTechById(id: number): Promise<CoTech | null> {
  const db = await getDB();
  return db.getFirstAsync<CoTech>('SELECT * FROM co_techs WHERE id = ?', [id]);
}

export async function createCoTech(input: { name: string; phone?: string; address?: string; email?: string; facebook?: string; photo_uri?: string | null }): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    'INSERT INTO co_techs (name, phone, address, email, facebook, photo_uri) VALUES (?, ?, ?, ?, ?, ?)',
    [input.name.trim(), input.phone ?? null, input.address ?? null, input.email ?? null, input.facebook ?? null, input.photo_uri ?? null]
  );
  return result.lastInsertRowId;
}

export async function updateCoTech(id: number, input: { name: string; phone?: string; address?: string; email?: string; facebook?: string; photo_uri?: string | null }): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'UPDATE co_techs SET name = ?, phone = ?, address = ?, email = ?, facebook = ?, photo_uri = ? WHERE id = ?',
    [input.name.trim(), input.phone ?? null, input.address ?? null, input.email ?? null, input.facebook ?? null, input.photo_uri ?? null, id]
  );
}

export async function deleteCoTech(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM co_techs WHERE id = ?', [id]);
}
