import { getDB } from '../db/database';
import { generateInvoiceNumber } from '../utils/formatters';

export interface Invoice {
  id: number;
  invoice_no: string;
  type: 'repair' | 'device_sale';
  ref_id: number;
  customer_id: number;
  total_amount: number;
  pdf_uri: string | null;
  shared_at: string | null;
  created_at: string;
  customer_name?: string;
}

export async function createInvoice(data: {
  type: 'repair' | 'device_sale';
  ref_id: number;
  customer_id: number;
  total_amount: number;
}): Promise<{ id: number; invoice_no: string }> {
  const db = await getDB();
  const last = await db.getFirstAsync<{ id: number }>('SELECT MAX(id) as id FROM invoices');
  const invoice_no = generateInvoiceNumber(last?.id ?? 0);
  const result = await db.runAsync(
    'INSERT INTO invoices (invoice_no, type, ref_id, customer_id, total_amount) VALUES (?, ?, ?, ?, ?)',
    [invoice_no, data.type, data.ref_id, data.customer_id, data.total_amount]
  );
  return { id: result.lastInsertRowId, invoice_no };
}

export async function updateInvoicePdfUri(id: number, pdf_uri: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('UPDATE invoices SET pdf_uri = ? WHERE id = ?', [pdf_uri, id]);
}

export async function markInvoiceShared(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    "UPDATE invoices SET shared_at = datetime('now') WHERE id = ?",
    [id]
  );
}

export async function getAllInvoices(): Promise<Invoice[]> {
  const db = await getDB();
  return db.getAllAsync<Invoice>(
    `SELECT i.*, c.name as customer_name
     FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     ORDER BY i.created_at DESC`
  );
}

export async function getInvoiceById(id: number): Promise<Invoice | null> {
  const db = await getDB();
  return db.getFirstAsync<Invoice>(
    `SELECT i.*, c.name as customer_name
     FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     WHERE i.id = ?`,
    [id]
  );
}
