import { getDB } from '../db/database';

export interface ConsumablePurchase {
  id: number;
  name: string;
  quantity: number;
  unit: string | null;
  unit_cost: number;
  notes: string | null;
  created_at: string;
  archived: number;
}

export interface ConsumableGroup {
  name: string;
  unit: string | null;
  total_qty: number;
  total_spent: number;
  last_purchase: string;
  purchase_count: number;
  latest_unit_cost: number;
}

export async function listConsumablePurchases(): Promise<ConsumablePurchase[]> {
  const db = await getDB();
  return db.getAllAsync<ConsumablePurchase>(
    `SELECT * FROM consumable_purchases WHERE archived = 0 ORDER BY created_at DESC`
  );
}

export async function listConsumableGroups(): Promise<ConsumableGroup[]> {
  const db = await getDB();
  return db.getAllAsync<ConsumableGroup>(`
    SELECT
      name, unit,
      SUM(quantity) as total_qty,
      SUM(quantity * unit_cost) as total_spent,
      MAX(created_at) as last_purchase,
      COUNT(*) as purchase_count,
      (SELECT unit_cost FROM consumable_purchases cp2
       WHERE cp2.name = cp.name AND cp2.archived = 0
       ORDER BY created_at DESC LIMIT 1) as latest_unit_cost
    FROM consumable_purchases cp
    WHERE archived = 0
    GROUP BY name
    ORDER BY last_purchase DESC
  `);
}

export async function getConsumableHistory(name: string): Promise<ConsumablePurchase[]> {
  const db = await getDB();
  return db.getAllAsync<ConsumablePurchase>(
    `SELECT * FROM consumable_purchases WHERE name = ? AND archived = 0 ORDER BY created_at DESC`,
    [name]
  );
}

export async function addConsumablePurchase(data: {
  name: string;
  quantity: number;
  unit?: string;
  unit_cost: number;
  notes?: string;
}): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO consumable_purchases (name, quantity, unit, unit_cost, notes) VALUES (?, ?, ?, ?, ?)`,
    [data.name, data.quantity, data.unit ?? null, data.unit_cost, data.notes ?? null]
  );
  return result.lastInsertRowId;
}

export async function updateConsumablePurchase(id: number, data: {
  name: string;
  quantity: number;
  unit?: string;
  unit_cost: number;
  notes?: string;
}): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE consumable_purchases SET name = ?, quantity = ?, unit = ?, unit_cost = ?, notes = ? WHERE id = ?`,
    [data.name, data.quantity, data.unit ?? null, data.unit_cost, data.notes ?? null, id]
  );
}

// Hides from the consumables list but keeps the amount in expense reports
export async function archiveConsumablePurchase(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`UPDATE consumable_purchases SET archived = 1 WHERE id = ?`, [id]);
}

// Removes completely — also disappears from expense reports
export async function deleteConsumablePurchase(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM consumable_purchases WHERE id = ?`, [id]);
}

export async function archiveConsumablesByName(name: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`UPDATE consumable_purchases SET archived = 1 WHERE name = ?`, [name]);
}

export async function deleteConsumablesByName(name: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM consumable_purchases WHERE name = ?`, [name]);
}
