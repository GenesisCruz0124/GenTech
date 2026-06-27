import { getDB } from '../db/database';
import { markDirty } from './syncQueueService';
import { schedulePush } from './syncService';

type DB = Awaited<ReturnType<typeof getDB>>;

// Appended at the end of insert functions across the repositories. Assigns
// the new row's uuid/updated_at (new rows are created without them — the
// uuid column has no SQLite-level default) and queues it for push.
export async function trackInsert(db: DB, table: string, id: number): Promise<void> {
  try {
    await db.runAsync(
      `UPDATE ${table} SET uuid = lower(hex(randomblob(16))), updated_at = datetime('now') WHERE id = ? AND uuid IS NULL`,
      [id]
    );
    const row = await db.getFirstAsync<{ uuid: string }>(`SELECT uuid FROM ${table} WHERE id = ?`, [id]);
    if (row?.uuid) {
      await markDirty(table, row.uuid, 'insert');
      schedulePush();
    }
  } catch {}
}

// Appended at the end of update functions. Bumps updated_at so the change
// wins under last-write-wins conflict resolution, and queues it for push.
export async function trackUpdate(db: DB, table: string, id: number): Promise<void> {
  try {
    await db.runAsync(`UPDATE ${table} SET updated_at = datetime('now') WHERE id = ?`, [id]);
    let row = await db.getFirstAsync<{ uuid: string }>(`SELECT uuid FROM ${table} WHERE id = ?`, [id]);
    if (!row?.uuid) {
      await db.runAsync(`UPDATE ${table} SET uuid = lower(hex(randomblob(16))) WHERE id = ? AND uuid IS NULL`, [id]);
      row = await db.getFirstAsync<{ uuid: string }>(`SELECT uuid FROM ${table} WHERE id = ?`, [id]);
    }
    if (row?.uuid) {
      await markDirty(table, row.uuid, 'update');
      schedulePush();
    }
  } catch {}
}

// Call BEFORE the row is deleted, with its uuid looked up while it still exists.
export async function trackDelete(table: string, uuid: string | null | undefined): Promise<void> {
  if (!uuid) return;
  await markDirty(table, uuid, 'delete');
  schedulePush();
}

export async function getUuid(db: DB, table: string, id: number): Promise<string | null> {
  try {
    const row = await db.getFirstAsync<{ uuid: string }>(`SELECT uuid FROM ${table} WHERE id = ?`, [id]);
    return row?.uuid ?? null;
  } catch {
    return null;
  }
}
