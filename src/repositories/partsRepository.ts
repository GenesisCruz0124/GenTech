import { getDB } from '../db/database';

export interface Part {
  id: number;
  name: string;
  sku: string | null;
  quantity: number;
  low_stock_threshold: number;
  cost_price: number;
  selling_price: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePartInput {
  name: string;
  sku?: string;
  quantity: number;
  low_stock_threshold?: number;
  cost_price: number;
  selling_price: number;
}

export async function createPart(input: CreatePartInput): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO parts (name, sku, quantity, low_stock_threshold, cost_price, selling_price)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.sku ?? null,
      input.quantity,
      input.low_stock_threshold ?? 5,
      input.cost_price,
      input.selling_price,
    ]
  );
  return result.lastInsertRowId;
}

export async function getAllParts(): Promise<Part[]> {
  const db = await getDB();
  return db.getAllAsync<Part>('SELECT * FROM parts ORDER BY name ASC');
}

export async function getPartById(id: number): Promise<Part | null> {
  const db = await getDB();
  return db.getFirstAsync<Part>('SELECT * FROM parts WHERE id = ?', [id]);
}

export async function updatePart(id: number, data: Partial<CreatePartInput>): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  const allowed = ['name', 'sku', 'quantity', 'low_stock_threshold', 'cost_price', 'selling_price'];
  const entries = Object.entries(data).filter(([k]) => allowed.includes(k));
  if (!entries.length) return;
  const fields = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = [...entries.map(([, v]) => v), now, id];
  await db.runAsync(`UPDATE parts SET ${fields}, updated_at = ? WHERE id = ?`, values);
}

export async function adjustStock(partId: number, delta: number): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE parts SET quantity = MAX(0, quantity + ?), updated_at = ? WHERE id = ?',
    [delta, now, partId]
  );
}

export async function deletePart(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM parts WHERE id = ?', [id]);
}

export async function getLowStockParts(): Promise<Part[]> {
  const db = await getDB();
  return db.getAllAsync<Part>(
    'SELECT * FROM parts WHERE quantity <= low_stock_threshold ORDER BY quantity ASC'
  );
}

export async function addRepairPart(repairId: number, partId: number, quantity: number, unitPrice: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'INSERT INTO repair_parts (repair_id, part_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
    [repairId, partId, quantity, unitPrice]
  );
  await adjustStock(partId, -quantity);
}

export async function getRepairParts(repairId: number): Promise<{ id: number; part_id: number; name: string; quantity: number; unit_price: number }[]> {
  const db = await getDB();
  return db.getAllAsync(
    `SELECT rp.id, rp.part_id, p.name, rp.quantity, rp.unit_price
     FROM repair_parts rp
     JOIN parts p ON p.id = rp.part_id
     WHERE rp.repair_id = ?`,
    [repairId]
  );
}

export async function removeRepairPart(repairPartId: number, partId: number, quantity: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM repair_parts WHERE id = ?', [repairPartId]);
  await adjustStock(partId, quantity);
}
