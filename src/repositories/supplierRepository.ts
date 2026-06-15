import { getDB } from '../db/database';

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  facebook: string | null;
  shopee_url: string | null;
  photo_uri: string | null;
  notes: string | null;
  created_at: string;
  purchase_count?: number;
  last_purchase_at?: string | null;
  has_battery_purchase?: boolean;
  has_display_purchase?: boolean;
}

async function supplierHasCategoryPurchase(db: Awaited<ReturnType<typeof getDB>>, supplierName: string, categoryName: string): Promise<boolean> {
  try {
    const row = await db.getFirstAsync<{ found: number }>(
      `SELECT EXISTS(
         SELECT 1 FROM parts_purchases pp
         JOIN parts p ON p.id = pp.part_id
         JOIN categories c ON c.id = p.category_id
         WHERE LOWER(TRIM(COALESCE(pp.supplier_name,''))) = LOWER(TRIM(?))
           AND LOWER(c.name) = LOWER(?)
       ) as found`,
      [supplierName, categoryName]
    );
    return !!row?.found;
  } catch {
    return false;
  }
}

export async function getAllSuppliers(): Promise<Supplier[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, name, phone, address, notes, shopee_url, created_at FROM suppliers ORDER BY name ASC`
  );
  const result: Supplier[] = await Promise.all(rows.map(async (s: any) => {
    // Safely fetch columns added by later migrations
    let facebook: string | null = null;
    let email: string | null = null;
    let photo_uri: string | null = null;
    try {
      const extra = await db.getFirstAsync<any>(
        'SELECT facebook, email, photo_uri FROM suppliers WHERE id = ?', [s.id]
      );
      facebook = extra?.facebook ?? null;
      email = extra?.email ?? null;
      photo_uri = extra?.photo_uri ?? null;
    } catch {}
    let purchase_count = 0;
    let last_purchase_at: string | null = null;
    try {
      const row = await db.getFirstAsync<{ count: number; last_at: string | null }>(
        `SELECT COUNT(*) as count, MAX(purchased_at) as last_at
         FROM parts_purchases
         WHERE LOWER(TRIM(COALESCE(supplier_name,''))) = LOWER(TRIM(?))`,
        [s.name]
      );
      purchase_count = row?.count ?? 0;
      last_purchase_at = row?.last_at ?? null;
    } catch {}
    const has_battery_purchase = await supplierHasCategoryPurchase(db, s.name, 'Battery');
    const has_display_purchase = await supplierHasCategoryPurchase(db, s.name, 'Display');
    return { ...s, facebook, email, photo_uri, purchase_count, last_purchase_at, has_battery_purchase, has_display_purchase };
  }));
  return result;
}

export async function createSupplier(input: { name: string; phone?: string; address?: string; email?: string; facebook?: string; shopee_url?: string; photo_uri?: string | null; notes?: string }): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    'INSERT INTO suppliers (name, phone, address, notes) VALUES (?, ?, ?, ?)',
    [input.name.trim(), input.phone ?? null, input.address ?? null, input.notes ?? null]
  );
  const id = result.lastInsertRowId;
  const extras: [string, any][] = [
    ['facebook',   input.facebook   || null],
    ['email',      input.email      || null],
    ['shopee_url', input.shopee_url || null],
    ['photo_uri',  input.photo_uri  ?? null],
  ];
  for (const [col, val] of extras) {
    try { await db.runAsync(`UPDATE suppliers SET ${col} = ? WHERE id = ?`, [val, id]); } catch {}
  }
  return id;
}

export async function updateSupplier(id: number, input: { name: string; phone?: string; address?: string; email?: string; facebook?: string; shopee_url?: string; photo_uri?: string | null; notes?: string }): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'UPDATE suppliers SET name = ?, phone = ?, address = ?, notes = ? WHERE id = ?',
    [input.name.trim(), input.phone ?? null, input.address ?? null, input.notes ?? null, id]
  );
  const extras: [string, any][] = [
    ['facebook',   input.facebook   !== undefined ? (input.facebook   || null) : undefined],
    ['email',      input.email      !== undefined ? (input.email      || null) : undefined],
    ['shopee_url', input.shopee_url !== undefined ? (input.shopee_url || null) : undefined],
    ['photo_uri',  'photo_uri' in input ? (input.photo_uri ?? null) : undefined],
  ];
  for (const [col, val] of extras) {
    if (val !== undefined) {
      try { await db.runAsync(`UPDATE suppliers SET ${col} = ? WHERE id = ?`, [val, id]); } catch {}
    }
  }
}

export async function deleteSupplier(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM suppliers WHERE id = ?', [id]);
}
