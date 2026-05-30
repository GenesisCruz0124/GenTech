import { getDB } from '../db/database';

export async function resetCustomers(): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM repair_payments');
  await db.runAsync('DELETE FROM repair_images');
  await db.runAsync('DELETE FROM repair_notes');
  await db.runAsync('DELETE FROM repair_parts');
  await db.runAsync('DELETE FROM repairs');
  await db.runAsync('DELETE FROM invoices');
  await db.runAsync('DELETE FROM device_sales');
  await db.runAsync('DELETE FROM device_purchases');
  await db.runAsync('DELETE FROM customers');
}

export async function resetRepairs(): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM repair_payments');
  await db.runAsync('DELETE FROM repair_images');
  await db.runAsync('DELETE FROM repair_notes');
  await db.runAsync('DELETE FROM repair_parts');
  await db.runAsync('DELETE FROM repairs');
}

export async function resetDevices(): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM device_sales');
  await db.runAsync('DELETE FROM device_purchases');
}

export async function resetStocks(): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM parts_purchases');
  await db.runAsync('DELETE FROM repair_parts');
  await db.runAsync('DELETE FROM parts');
}
