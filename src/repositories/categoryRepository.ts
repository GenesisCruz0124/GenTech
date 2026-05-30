import { getDB } from '../db/database';

export interface Category {
  id: number;
  name: string;
  created_at: string;
}

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB();
  return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name ASC');
}

export async function createCategory(name: string): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    'INSERT INTO categories (name) VALUES (?)',
    [name.trim()]
  );
  return result.lastInsertRowId;
}

export async function updateCategory(id: number, name: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', [name.trim(), id]);
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDB();
  // Unlink parts before deleting
  await db.runAsync('UPDATE parts SET category_id = NULL WHERE category_id = ?', [id]);
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}
