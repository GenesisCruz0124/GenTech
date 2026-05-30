import { getDB } from '../db/database';

export interface Part {
  id: number;
  name: string;
  sku: string | null;
  quantity: number;
  low_stock_threshold: number;
  cost_price: number;
  selling_price: number;
  category_id: number | null;
  category_name: string | null;
  brand_id: number | null;
  brand_name: string | null;
  total_purchase_value: number;
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
  category_id?: number;
  brand_id?: number;
}

export async function createPart(input: CreatePartInput): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO parts (name, sku, quantity, low_stock_threshold, cost_price, selling_price, category_id, brand_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.sku ?? null,
      input.quantity,
      input.low_stock_threshold ?? 2,
      input.cost_price,
      input.selling_price,
      input.category_id ?? null,
      input.brand_id ?? null,
    ]
  );
  return result.lastInsertRowId;
}

export async function getAllParts(): Promise<Part[]> {
  const db = await getDB();
  return db.getAllAsync<Part>(
    `SELECT p.*, c.name as category_name, b.name as brand_name,
            COALESCE((SELECT SUM(pp.quantity * pp.cost_price)
                      FROM parts_purchases pp WHERE pp.part_id = p.id), 0) as total_purchase_value
     FROM parts p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN device_brands b ON b.id = p.brand_id
     ORDER BY p.name ASC`
  );
}

export async function getPartById(id: number): Promise<Part | null> {
  const db = await getDB();
  return db.getFirstAsync<Part>(
    `SELECT p.*, c.name as category_name, b.name as brand_name,
            COALESCE((SELECT SUM(pp.quantity * pp.cost_price)
                      FROM parts_purchases pp WHERE pp.part_id = p.id), 0) as total_purchase_value
     FROM parts p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN device_brands b ON b.id = p.brand_id
     WHERE p.id = ?`,
    [id]
  );
}

export async function updatePart(id: number, data: Partial<CreatePartInput>): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  const allowed = ['name', 'sku', 'quantity', 'low_stock_threshold', 'cost_price', 'selling_price', 'category_id', 'brand_id'];
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

export interface PartsPurchase {
  id: number;
  part_id: number;
  part_name: string;
  quantity: number;
  cost_price: number;
  supplier_name: string | null;
  notes: string | null;
  image_uri: string | null;
  purchased_at: string;
  created_at: string;
}

export async function recordPartsPurchase(input: {
  part_id: number;
  quantity: number;
  cost_price: number;
  supplier_name?: string;
  notes?: string;
  image_uri?: string;
}): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO parts_purchases (part_id, quantity, cost_price, supplier_name, notes, image_uri)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.part_id, input.quantity, input.cost_price, input.supplier_name ?? null, input.notes ?? null, input.image_uri ?? null]
  );
  await adjustStock(input.part_id, input.quantity);
  // Always keep the part's cost_price in sync with the latest purchase
  const now = new Date().toISOString();
  await db.runAsync('UPDATE parts SET cost_price = ?, updated_at = ? WHERE id = ?', [input.cost_price, now, input.part_id]);
}

export async function getPartsPurchaseHistory(partId?: number): Promise<PartsPurchase[]> {
  const db = await getDB();
  const where = partId ? 'WHERE pp.part_id = ?' : '';
  const params = partId ? [partId] : [];
  return db.getAllAsync<PartsPurchase>(
    `SELECT pp.*, p.name as part_name
     FROM parts_purchases pp
     JOIN parts p ON p.id = pp.part_id
     ${where}
     ORDER BY pp.purchased_at DESC`,
    params
  );
}

export async function updatePartsPurchase(
  id: number,
  data: { quantity: number; cost_price: number; supplier_name?: string; notes?: string; image_uri?: string | null }
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE parts_purchases SET quantity = ?, cost_price = ?, supplier_name = ?, notes = ?, image_uri = ?
     WHERE id = ?`,
    [data.quantity, data.cost_price, data.supplier_name ?? null, data.notes ?? null, data.image_uri ?? null, id]
  );
}

export async function syncCostPriceFromLastPurchase(partId: number): Promise<void> {
  const db = await getDB();
  const latest = await db.getFirstAsync<{ cost_price: number }>(
    `SELECT cost_price FROM parts_purchases WHERE part_id = ? ORDER BY purchased_at DESC LIMIT 1`,
    [partId]
  );
  if (latest) {
    const now = new Date().toISOString();
    await db.runAsync('UPDATE parts SET cost_price = ?, updated_at = ? WHERE id = ?', [latest.cost_price, now, partId]);
  }
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
