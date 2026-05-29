import { getDB } from '../db/database';

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
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
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM customers WHERE phone = ?',
    [input.phone]
  );
  if (existing) {
    await db.runAsync(
      'UPDATE customers SET name = ?, email = ?, address = ? WHERE id = ?',
      [input.name, input.email ?? null, input.address ?? null, existing.id]
    );
    return existing.id;
  }
  const result = await db.runAsync(
    'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
    [input.name, input.phone, input.email ?? null, input.address ?? null]
  );
  return result.lastInsertRowId;
}

export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDB();
  return db.getAllAsync<Customer>('SELECT * FROM customers ORDER BY name ASC');
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
  await db.runAsync('DELETE FROM customers WHERE id = ?', [id]);
}
