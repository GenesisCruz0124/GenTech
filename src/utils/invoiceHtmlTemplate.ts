import { formatCurrency, formatDate, formatDateTime } from './formatters';

interface InvoiceData {
  invoice_no: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  type: 'repair' | 'device_sale';
  device_model?: string;
  issue_desc?: string;
  parts?: { name: string; quantity: number; unit_price: number }[];
  labor_cost?: number;
  total_amount: number;
  notes?: string;
}

export function buildInvoiceHtml(data: InvoiceData): string {

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: sans-serif; font-size: 13px; color: #212121; padding: 32px; }
  .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #1976D2; padding-bottom: 16px; }
  .shop-name { font-size: 24px; font-weight: bold; color: #1976D2; }
  .shop-sub { font-size: 13px; color: #757575; margin-top: 4px; }
  .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .invoice-no { font-size: 18px; font-weight: bold; color: #212121; }
  .invoice-date { color: #757575; font-size: 12px; margin-top: 4px; }
  .section-title { font-size: 11px; font-weight: bold; color: #757575; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .customer-box { background: #F5F5F5; border-radius: 6px; padding: 12px; margin-bottom: 20px; }
  .customer-name { font-size: 16px; font-weight: bold; }
  .customer-phone { color: #757575; margin-top: 2px; }
  .device-box { margin-bottom: 16px; }
  .device-label { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1976D2; color: #fff; padding: 8px; font-size: 12px; }
  td { padding: 8px; border-bottom: 1px solid #E0E0E0; }
  tr:nth-child(even) td { background: #F9F9F9; }
  .total-row { font-size: 16px; font-weight: bold; }
  .total-row td { border-bottom: none; padding-top: 12px; }
  .footer { text-align: center; margin-top: 32px; color: #9E9E9E; font-size: 11px; border-top: 1px solid #E0E0E0; padding-top: 16px; }
</style>
</head>
<body>
  <div class="header">
    <div class="shop-name">GenTech Repair Shop</div>
    <div class="shop-sub">Professional Device Repair &amp; Sales</div>
  </div>

  <div class="invoice-meta">
    <div>
      <div class="invoice-no">${data.invoice_no}</div>
      <div class="invoice-date">Date: ${formatDate(data.created_at)}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:12px;color:#757575">Type</div>
      <div style="font-weight:bold">${data.type === 'repair' ? 'Repair Invoice' : 'Device Sale Invoice'}</div>
    </div>
  </div>

  <div class="customer-box">
    <div class="section-title">Bill To</div>
    <div class="customer-name">${data.customer_name}</div>
    <div class="customer-phone">${data.customer_phone}</div>
  </div>

  <div style="padding:12px 0;border-top:1px solid #E0E0E0;margin-bottom:8px;font-size:14px;color:#424242">
    ${data.device_model ? `<strong>${data.device_model}</strong>` : ''}${data.issue_desc ? ` &mdash; ${data.issue_desc}` : ''}
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-top:2px solid #1976D2;border-bottom:2px solid #1976D2;margin-bottom:16px">
    <div style="font-size:16px;font-weight:bold;color:#212121">TOTAL AMOUNT</div>
    <div style="font-size:22px;font-weight:bold;color:#1976D2">${formatCurrency(data.total_amount)}</div>
  </div>

  ${data.notes ? `<div style="margin-top:8px;padding:10px;background:#FFF8E1;border-radius:4px;font-size:12px"><strong>Note:</strong> ${data.notes}</div>` : ''}

  <div class="footer">
    Thank you for choosing GenTech Repair Shop!<br>
    Please keep this invoice for your records.
  </div>
</body>
</html>`;
}
