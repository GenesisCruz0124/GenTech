import { format, parseISO } from 'date-fns';

/**
 * SQLite datetime('now') stores UTC without a timezone suffix, e.g. "2026-05-30 02:00:00".
 * parseISO treats bare strings as local time, which is wrong.
 * This normalises them to UTC so date-fns displays in the device's local (Manila) time.
 */
function parseTimestamp(ts: string): Date {
  const s = ts.includes('T') ? ts : ts.replace(' ', 'T');
  const withZ = /Z$|[+-]\d{2}:\d{2}$/.test(s) ? s : s + 'Z';
  return parseISO(withZ);
}

export function formatCurrency(amount: number): string {
  const n = amount ?? 0;
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(isoString: string): string {
  try {
    return format(parseTimestamp(isoString), 'MMM d, yyyy');
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string): string {
  try {
    return format(parseTimestamp(isoString), 'MMM d, yyyy h:mm a');
  } catch {
    return isoString;
  }
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function generateInvoiceNumber(lastId: number): string {
  const year = new Date().getFullYear();
  const seq = String(lastId + 1).padStart(4, '0');
  return `INV-${year}-${seq}`;
}
