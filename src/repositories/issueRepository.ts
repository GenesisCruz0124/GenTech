import { getDB } from '../db/database';

export interface Issue {
  id: number;
  name: string;
  created_at: string;
}

export async function getAllIssues(): Promise<Issue[]> {
  const db = await getDB();
  return db.getAllAsync<Issue>('SELECT * FROM issues ORDER BY name ASC');
}

export async function createIssue(name: string): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync('INSERT INTO issues (name) VALUES (?)', [name.trim()]);
  return result.lastInsertRowId;
}

export async function updateIssue(id: number, name: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('UPDATE issues SET name = ? WHERE id = ?', [name.trim(), id]);
}

export async function deleteIssue(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM issues WHERE id = ?', [id]);
}
