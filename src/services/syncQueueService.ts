import { getDB } from '../db/database';

export type SyncOp = 'insert' | 'update' | 'delete';

export interface SyncQueueRow {
  id: number;
  table_name: string;
  record_uuid: string;
  op: SyncOp;
  created_at: string;
}

// Appended at the end of every repository write function. Cheap local
// insert only — the actual push to Supabase happens later, debounced, in
// syncService.ts. Never throws: a sync-tracking failure must never break
// the write it's attached to.
export async function markDirty(tableName: string, uuid: string | null | undefined, op: SyncOp): Promise<void> {
  if (!uuid) return;
  try {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO sync_queue (table_name, record_uuid, op) VALUES (?, ?, ?)`,
      [tableName, uuid, op]
    );
  } catch {}
}

export async function getQueuedChanges(limit = 200): Promise<SyncQueueRow[]> {
  const db = await getDB();
  return db.getAllAsync<SyncQueueRow>(
    `SELECT * FROM sync_queue ORDER BY id ASC LIMIT ?`,
    [limit]
  );
}

export async function clearQueuedChanges(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDB();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM sync_queue WHERE id IN (${placeholders})`, ids);
}

export async function getQueueLength(): Promise<number> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM sync_queue`);
  return row?.c ?? 0;
}

// Bulk-populate the queue with one "insert" per existing row across every
// syncable table — used for the baseline push when a shop is first created.
export async function enqueueFullBaseline(tables: readonly string[]): Promise<void> {
  const db = await getDB();
  for (const table of tables) {
    try {
      await db.runAsync(
        `INSERT INTO sync_queue (table_name, record_uuid, op)
         SELECT ?, uuid, 'insert' FROM ${table} WHERE uuid IS NOT NULL`,
        [table]
      );
    } catch {}
  }
}
