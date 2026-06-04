import { getDB } from '../db/database';

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  facebook: string | null;
  photo_uri: string | null;
  unpaid_amount?: number;
  active_repair_count?: number;
  last_transaction_at?: string | null;
  is_deleted: number;
  created_at: string;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  facebook?: string | null;
  photo_uri?: string | null;
}

export async function upsertCustomerByPhone(input: CreateCustomerInput): Promise<number> {
  const db = await getDB();

  // 1. Match by phone (most reliable)
  if (input.phone) {
    const byPhone = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM customers WHERE phone = ? AND is_deleted = 0',
      [input.phone]
    );
    if (byPhone) {
      await db.runAsync(
        'UPDATE customers SET name = ?, email = ?, address = ? WHERE id = ?',
        [input.name, input.email ?? null, input.address ?? null, byPhone.id]
      );
      return byPhone.id;
    }
  }

  // 2. Match by name (case-insensitive) to avoid duplicates when phone is empty
  const byName = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM customers
     WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND is_deleted = 0
     LIMIT 1`,
    [input.name]
  );
  if (byName) {
    // Update phone if we now have one
    if (input.phone) {
      await db.runAsync(
        'UPDATE customers SET phone = ?, email = ?, address = ? WHERE id = ?',
        [input.phone, input.email ?? null, input.address ?? null, byName.id]
      );
    }
    return byName.id;
  }

  // 3. Create new customer only if no match found
  const result = await db.runAsync(
    'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
    [input.name, input.phone || '', input.email ?? null, input.address ?? null]
  );
  return result.lastInsertRowId;
}

export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDB();
  return db.getAllAsync<Customer>(
    `SELECT c.*,
       COALESCE((
         SELECT SUM(COALESCE(r.final_cost, r.estimated_cost))
         FROM repairs r
         WHERE r.customer_id = c.id
           AND r.status = 'delivered'
           AND r.is_paid = 0
       ), 0) AS unpaid_amount,
       COALESCE((
         SELECT COUNT(*)
         FROM repairs r
         WHERE r.customer_id = c.id
           AND r.status NOT IN ('delivered', 'not_repaired')
       ), 0) AS active_repair_count,
       (
         SELECT MAX(t) FROM (
           SELECT MAX(r.created_at) AS t FROM repairs r WHERE r.customer_id = c.id
           UNION ALL
           SELECT MAX(ds.sold_at) AS t FROM device_sales ds WHERE ds.customer_id = c.id
           UNION ALL
           SELECT MAX(dp.purchased_at) AS t FROM device_purchases dp WHERE dp.customer_id = c.id
         )
       ) AS last_transaction_at
     FROM customers c
     WHERE c.is_deleted = 0
     ORDER BY c.name ASC`
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
