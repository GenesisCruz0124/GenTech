import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';

const INVOICE_DIR = FileSystem.documentDirectory + 'invoices/';

async function ensureInvoiceDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(INVOICE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(INVOICE_DIR, { intermediates: true });
  }
}

export async function generateInvoicePDF(html: string, invoiceNo: string): Promise<string> {
  await ensureInvoiceDir();
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const dest = INVOICE_DIR + `${invoiceNo}.pdf`;
  await FileSystem.moveAsync({ from: uri, to: dest });
  return dest;
}

export async function invoicePdfExists(invoiceNo: string): Promise<boolean> {
  const path = INVOICE_DIR + `${invoiceNo}.pdf`;
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
}

export function getInvoicePath(invoiceNo: string): string {
  return INVOICE_DIR + `${invoiceNo}.pdf`;
}
