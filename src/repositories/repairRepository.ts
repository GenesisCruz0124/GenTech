import { getDB } from '../db/database';
import { RepairStatus } from '../constants/statusOptions';

export interface Repair {
  id: number;
  customer_id: number;
  assigned_staff_id: number | null;
  device_model: string;
  issue_desc: string;
  estimated_cost: number;
  final_cost: number | null;
  status: RepairStatus;
  is_paid: number;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepairWithCustomer extends Repair {
  customer_name: string;
  customer_phone: string;
}

export interface CreateRepairInput {
  customer_id: number;
  assigned_staff_id?: number;
  device_model: string;
  issue_desc: string;
  estimated_cost: number;
  notes?: string;
}

export interface RepairFilter {
  status?: RepairStatus;
  not_paid?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function createRepair(input: CreateRepairInput): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO repairs (customer_id, assigned_staff_id, device_model, issue_desc, estimated_cost, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.customer_id,
      input.assigned_staff_id ?? null,
      input.device_model,
      input.issue_desc,
      input.estimated_cost,
      input.notes ?? null,
    ]
  );
  return result.lastInsertRowId;
}

export async function getRepairById(id: number): Promise<RepairWithCustomer | null> {
  const db = await getDB();
  return db.getFirstAsync<RepairWithCustomer>(
    `SELECT r.*, c.name as customer_name, c.phone as customer_phone
     FROM repairs r
     JOIN customers c ON c.id = r.customer_id
     WHERE r.id = ?`,
    [id]
  );
}

export async function listRepairs(filter?: RepairFilter): Promise<RepairWithCustomer[]> {
  const db = await getDB();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filter?.status) {
    conditions.push('r.status = ?');
    params.push(filter.status);
  }
  if (filter?.not_paid) {
    conditions.push('r.is_paid = 0');
    conditions.push("r.status NOT IN ('not_repaired')");
  }
  if (filter?.search) {
    conditions.push('(c.name LIKE ? OR r.device_model LIKE ? OR c.phone LIKE ?)');
    const q = `%${filter.search}%`;
    params.push(q, q, q);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filter?.limit ?? 100;
  const offset = filter?.offset ?? 0;
  params.push(limit, offset);

  return db.getAllAsync<RepairWithCustomer>(
    `SELECT r.*, c.name as customer_name, c.phone as customer_phone
     FROM repairs r
     JOIN customers c ON c.id = r.customer_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    params
  );
}

export async function updateRepairStatus(id: number, status: RepairStatus): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  const timestampFields: Partial<Record<RepairStatus, string>> = {
    in_progress: 'started_at',
    ready: 'completed_at',
    delivered: 'delivered_at',
  };
  const tsField = timestampFields[status];
  const extra = tsField ? `, ${tsField} = ?` : '';
  const params = tsField ? [status, now, now, id] : [status, now, id];
  await db.runAsync(
    `UPDATE repairs SET status = ?, updated_at = ?${extra} WHERE id = ?`,
    params
  );
}

export async function markNotRepaired(id: number): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE repairs SET status = 'not_repaired', is_paid = 0, updated_at = ? WHERE id = ?`,
    [now, id]
  );
}

export async function deliverRepair(id: number, isPaid: boolean): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE repairs SET status = 'delivered', is_paid = ?, delivered_at = ?, updated_at = ? WHERE id = ?`,
    [isPaid ? 1 : 0, now, now, id]
  );
}

export async function updateRepair(id: number, data: Partial<CreateRepairInput> & { final_cost?: number; image_uri?: string | null; customer_id?: number }): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  const allowed = ['device_model', 'issue_desc', 'estimated_cost', 'final_cost', 'notes', 'assigned_staff_id', 'image_uri', 'customer_id'];
  const entries = Object.entries(data).filter(([k]) => allowed.includes(k));
  if (!entries.length) return;
  const fields = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = [...entries.map(([, v]) => v), now, id];
  await db.runAsync(`UPDATE repairs SET ${fields}, updated_at = ? WHERE id = ?`, values);
}

export async function deleteRepair(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM repairs WHERE id = ?', [id]);
}

export async function getNotPaidCount(): Promise<number> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM repairs WHERE is_paid = 0 AND status != 'not_repaired'`
  );
  return row?.count ?? 0;
}

export async function getStatusCounts(): Promise<Record<RepairStatus, number>> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count FROM repairs GROUP BY status`
  );
  const counts: Record<RepairStatus, number> = { pending: 0, in_progress: 0, ready: 0, delivered: 0, not_repaired: 0 };
  for (const row of rows) {
    counts[row.status as RepairStatus] = row.count;
  }
  return counts;
}

export async function addRepairNote(repairId: number, content: string, staffId?: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'INSERT INTO repair_notes (repair_id, staff_id, content) VALUES (?, ?, ?)',
    [repairId, staffId ?? null, content]
  );
}

export async function getRepairNotes(repairId: number): Promise<{ id: number; content: string; created_at: string; staff_name: string | null }[]> {
  const db = await getDB();
  return db.getAllAsync(
    `SELECT rn.id, rn.content, rn.created_at, s.name as staff_name
     FROM repair_notes rn
     LEFT JOIN staff s ON s.id = rn.staff_id
     WHERE rn.repair_id = ?
     ORDER BY rn.created_at ASC`,
    [repairId]
  );
}
