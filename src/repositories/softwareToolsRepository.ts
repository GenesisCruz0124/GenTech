import { getDB } from '../db/database';

export interface SoftwareTool {
  id: number;
  name: string;
  created_at: string;
}

export interface RepairSoftwareTool {
  id: number;
  tool_id: number;
  tool_name: string;
  cost: number;
  created_at: string;
}

export async function listSoftwareTools(): Promise<SoftwareTool[]> {
  const db = await getDB();
  return db.getAllAsync<SoftwareTool>('SELECT * FROM software_tools ORDER BY name ASC');
}

export async function addSoftwareTool(name: string): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync('INSERT INTO software_tools (name) VALUES (?)', [name.trim()]);
  return result.lastInsertRowId;
}

export async function updateSoftwareTool(id: number, name: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('UPDATE software_tools SET name = ? WHERE id = ?', [name.trim(), id]);
}

export async function deleteSoftwareTool(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM software_tools WHERE id = ?', [id]);
}

export async function addToolToRepair(repairId: number, toolId: number, cost: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'INSERT INTO repair_software_tools (repair_id, tool_id, cost) VALUES (?, ?, ?)',
    [repairId, toolId, cost]
  );
}

export async function getToolsForRepair(repairId: number): Promise<RepairSoftwareTool[]> {
  const db = await getDB();
  return db.getAllAsync<RepairSoftwareTool>(
    `SELECT rst.id, rst.tool_id, st.name as tool_name, rst.cost, rst.created_at
     FROM repair_software_tools rst
     JOIN software_tools st ON st.id = rst.tool_id
     WHERE rst.repair_id = ?
     ORDER BY rst.created_at ASC`,
    [repairId]
  );
}

export async function updateToolOnRepair(id: number, cost: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('UPDATE repair_software_tools SET cost = ? WHERE id = ?', [cost, id]);
}

export async function removeToolFromRepair(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM repair_software_tools WHERE id = ?', [id]);
}
