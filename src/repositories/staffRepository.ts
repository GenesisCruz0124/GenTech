import { getDB } from '../db/database';

export interface Staff {
  id: number;
  name: string;
  role: string | null;
  phone: string | null;
  is_active: number;
  created_at: string;
}

export interface CreateStaffInput {
  name: string;
  role?: string;
  phone?: string;
}

export interface StaffPerformance extends Staff {
  total_repairs: number;
  delivered_repairs: number;
  avg_hours: number | null;
}

export async function createStaff(input: CreateStaffInput): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    'INSERT INTO staff (name, role, phone) VALUES (?, ?, ?)',
    [input.name, input.role ?? null, input.phone ?? null]
  );
  return result.lastInsertRowId;
}

export async function getAllStaff(): Promise<Staff[]> {
  const db = await getDB();
  return db.getAllAsync<Staff>('SELECT * FROM staff WHERE is_active = 1 ORDER BY name ASC');
}

export async function getStaffById(id: number): Promise<Staff | null> {
  const db = await getDB();
  return db.getFirstAsync<Staff>('SELECT * FROM staff WHERE id = ?', [id]);
}

export async function updateStaff(id: number, data: Partial<CreateStaffInput>): Promise<void> {
  const db = await getDB();
  const allowed = ['name', 'role', 'phone'];
  const entries = Object.entries(data).filter(([k]) => allowed.includes(k));
  if (!entries.length) return;
  const fields = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = [...entries.map(([, v]) => v), id];
  await db.runAsync(`UPDATE staff SET ${fields} WHERE id = ?`, values);
}

export async function deactivateStaff(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('UPDATE staff SET is_active = 0 WHERE id = ?', [id]);
}

export async function getStaffPerformance(): Promise<StaffPerformance[]> {
  const db = await getDB();
  return db.getAllAsync<StaffPerformance>(
    `SELECT
       s.*,
       COUNT(r.id) as total_repairs,
       SUM(CASE WHEN r.status = 'delivered' THEN 1 ELSE 0 END) as delivered_repairs,
       AVG(
         CASE WHEN r.delivered_at IS NOT NULL AND r.started_at IS NOT NULL
         THEN (julianday(r.delivered_at) - julianday(r.started_at)) * 24
         ELSE NULL END
       ) as avg_hours
     FROM staff s
     LEFT JOIN repairs r ON r.assigned_staff_id = s.id
     WHERE s.is_active = 1
     GROUP BY s.id
     ORDER BY delivered_repairs DESC`
  );
}
