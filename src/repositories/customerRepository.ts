import { getDB } from '../db/database';

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  is_deleted: number;
  created_at: string;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export async function upsertCustomerByPhone(input: CreateCustomerInput): Promise<number> {
  const db = await getDB();
  // Only look up by phone if one was provided
  if (input.phone) {
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM customers WHERE phone = ? AND is_deleted = 0',
      [input.phone]
    );
    if (existing) {
      await db.runAsync(
        'UPDATE customers SET name = ?, email = ?, address = ? WHERE id = ?',
        [input.name, input.email ?? null, input.address ?? null, existing.id]
      );
      return existing.id;
    }
  }
  const result = await db.runAsync(
    'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
    [input.name, input.phone || '', input.email ?? null, input.address ?? null]
  );
  return result.lastInsertRowId;
}

export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDB();
  return db.getAllAsync<Customer>(
    'SELECT * FROM customers WHERE is_deleted = 0 ORDER BY name ASC'
  );
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const db = await getDB();
  const q = `%${query}%`;
  return db.getAllAsync<Customer>(
    `SELECT * FROM customers WHERE is_deleted = 0 AND (name LIKE ? OR phone LIKE ?) ORDER BY name ASC LIMIT 8`,
    [q, q]
  );
}

export async function findDuplicateCustomers(): Promise<{ name: string; customers: Customer[] }[]> {
  const db = await getDB();
  // Group by normalized name (lowercase, trimmed)
  const all = await db.getAllAsync<Customer>('SELECT * FROM customers WHERE is_deleted = 0 ORDER BY name ASC');
  const groups = new Map<string, Customer[]>();
  for (const c of all) {
    const key = c.name.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  // Also check by phone (non-empty duplicates)
  const phoneGroups = new Map<string, Customer[]>();
  for (const c of all) {
    if (!c.phone) continue;
    const key = c.phone.replace(/\D/g, '');
    if (!key) continue;
    if (!phoneGroups.has(key)) phoneGroups.set(key, []);
    phoneGroups.get(key)!.push(c);
  }
  const result: { name: string; customers: Customer[] }[] = [];
  for (const [name, list] of groups) {
    if (list.length > 1) result.push({ name: `Same name: "${list[0].name}"`, customers: list });
  }
  for (const [phone, list] of phoneGroups) {
    if (list.length > 1) result.push({ name: `Same phone: ${list[0].phone}`, customers: list });
  }
  return result;
}

export async function getCustomerById(id: number): Promise<Customer | null> {
  const db = await getDB();
  return db.getFirstAsync<Customer>('SELECT * FROM customers WHERE id = ?', [id]);
}

export async function createCustomer(input: CreateCustomerInput): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
    [input.name, input.phone, input.email ?? null, input.address ?? null]
  );
  return result.lastInsertRowId;
}

export async function updateCustomer(id: number, input: Partial<CreateCustomerInput>): Promise<void> {
  const db = await getDB();
  const fields = Object.keys(input).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(input), id];
  await db.runAsync(`UPDATE customers SET ${fields} WHERE id = ?`, values);
}

export async function deleteCustomer(id: number): Promise<void> {
  const db = await getDB();
  // Soft delete — keeps customer_id references valid in repairs/devices/invoices
  await db.runAsync('UPDATE customers SET is_deleted = 1 WHERE id = ?', [id]);
}
