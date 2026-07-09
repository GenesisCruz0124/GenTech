import { getDB } from '../db/database';

export interface ConsumablePurchase {
  id: number;
  name: string;
  quantity: number;
  unit: string | null;
  unit_cost: number;
  notes: string | null;
  created_at: string;
}

export async function listConsumablePurchases(): Promise<ConsumablePurchase[]> {
  const db = await getDB();
  return db.getAllAsync<ConsumablePurchase>(
    `SELECT * FROM consumable_purchases ORDER BY created_at DESC`
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

export async function deleteConsumablePurchase(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM consumable_purchases WHERE id = ?`, [id]);
}
