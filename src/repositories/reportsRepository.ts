import { getDB } from '../db/database';

export type ReportPeriod = 'all_time' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface PeriodReport {
  period: string;
  repair_revenue: number;
  device_sale_revenue: number;
  gross_income: number;
  parts_expense: number;
  purchase_expense: number;
  repair_parts_expense: number;
  consumable_expense: number;
  total_expense: number;
  net_income: number;
  total_paid: number;
}

export interface TotalSummary {
  gross_income: number;
  net_income: number;
  net_income_cash: number;
  total_revenue: number;
  total_expense: number;
  total_paid: number;
  unpaid_count: number;
  unpaid_amount: number;
  parts_purchase: number;
}

function periodFormat(period: ReportPeriod): string {
  switch (period) {
    case 'all_time': return '%Y';
    case 'daily':    return '%Y-%m-%d';
    case 'weekly':   return '%Y-W%W';
    case 'monthly':  return '%Y-%m';
    case 'yearly':   return '%Y';
    case 'custom':   return '%Y-%m-%d';
  }
}

function currentPeriodFilter(period: ReportPeriod, dateCol: string, targetDate = 'now', dateTo?: string): string {
  if (period === 'all_time') return '1=1';
  if (period === 'custom') {
    const from = targetDate === 'now' ? new Date().toISOString().split('T')[0] : targetDate;
    const to = dateTo ?? from;
    return `strftime('%Y-%m-%d', ${dateCol}) BETWEEN '${from}' AND '${to}'`;
  }
  const d = targetDate === 'now' ? 'now' : `'${targetDate}'`;
  switch (period) {
    case 'daily':   return `strftime('%Y-%m-%d', ${dateCol}) = strftime('%Y-%m-%d', ${d})`;
    case 'weekly':  return `strftime('%Y-%W', ${dateCol}) = strftime('%Y-%W', ${d})`;
    case 'monthly': return `strftime('%Y-%m', ${dateCol}) = strftime('%Y-%m', ${d})`;
    case 'yearly':  return `strftime('%Y', ${dateCol}) = strftime('%Y', ${d})`;
  }
}

export async function getReportSummary(period: ReportPeriod, targetDate?: string, dateTo?: string): Promise<PeriodReport[]> {
  const db = await getDB();
  const fmt = periodFormat(period);

  const td = targetDate ?? 'now';
  const f1 = currentPeriodFilter(period, 'rp.payment_date', td, dateTo);
  const f2 = currentPeriodFilter(period, 'sold_at', td, dateTo);
  const f3 = currentPeriodFilter(period, 'purchased_at', td, dateTo);
  const f4 = currentPeriodFilter(period, 'purchased_at', td, dateTo);
  const f5 = currentPeriodFilter(period, 'payment_date', td, dateTo);
  const f6 = currentPeriodFilter(period, 'rpr.created_at', td, dateTo);
  const f7 = currentPeriodFilter(period, 'created_at', td, dateTo);

  const [repairRows, saleRows, partsRows, purchaseRows, paidRows, repairPartsRows, consumableRows] = await Promise.all([
    // Gross income = estimated_cost of delivered repairs
    db.getAllAsync<{ period: string; amount: number }>(
      `SELECT strftime('${fmt}', created_at) as period, SUM(estimated_cost) as amount
       FROM repairs
       WHERE status = 'delivered' AND ${currentPeriodFilter(period, 'created_at', td, dateTo)}
       GROUP BY period ORDER BY period DESC`
    ),
    db.getAllAsync<{ period: string; amount: number }>(
      `SELECT strftime('${fmt}', sold_at) as period, SUM(sale_price) as amount
       FROM device_sales WHERE ${f2}
       GROUP BY period ORDER BY period DESC`
    ),
    db.getAllAsync<{ period: string; amount: number }>(
      `SELECT strftime('${fmt}', purchased_at) as period, SUM(quantity * cost_price) as amount
       FROM parts_purchases WHERE ${f3}
       GROUP BY period ORDER BY period DESC`
    ),
    db.getAllAsync<{ period: string; amount: number }>(
      `SELECT strftime('${fmt}', purchased_at) as period, SUM(purchase_price) as amount
       FROM device_purchases WHERE ${f4}
       GROUP BY period ORDER BY period DESC`
    ),
    // Total paid = payments on delivered repairs only
    db.getAllAsync<{ period: string; amount: number }>(
      `SELECT strftime('${fmt}', rp.payment_date) as period, SUM(rp.amount) as amount
       FROM repair_payments rp
       JOIN repairs r ON r.id = rp.repair_id
       WHERE r.status = 'delivered' AND ${f5}
       GROUP BY period ORDER BY period DESC`
    ),
    // Parts used in repairs — actual cost as expense
    db.getAllAsync<{ period: string; amount: number }>(
      `SELECT strftime('${fmt}', rpr.created_at) as period, SUM(rpr.actual_cost * rpr.quantity) as amount
       FROM repair_parts rpr
       WHERE rpr.actual_cost > 0 AND ${f6}
       GROUP BY period ORDER BY period DESC`
    ),
    // Consumable supply purchases
    db.getAllAsync<{ period: string; amount: number }>(
      `SELECT strftime('${fmt}', created_at) as period, SUM(quantity * unit_cost) as amount
       FROM consumable_purchases WHERE ${f7}
       GROUP BY period ORDER BY period DESC`
    ),
  ]);

  // Merge all rows by period key
  const map = new Map<string, PeriodReport>();

  const ensure = (p: string): PeriodReport => {
    if (!map.has(p)) {
      map.set(p, {
        period: p,
        repair_revenue: 0,
        device_sale_revenue: 0,
        gross_income: 0,
        parts_expense: 0,
        purchase_expense: 0,
        repair_parts_expense: 0,
        consumable_expense: 0,
        total_expense: 0,
        net_income: 0,
        total_paid: 0,
      });
    }
    return map.get(p)!;
  };

  const round = (n: number) => Math.round((n ?? 0) * 100) / 100;

  for (const row of repairRows)       { ensure(row.period).repair_revenue        = round(row.amount); }
  for (const row of saleRows)         { ensure(row.period).device_sale_revenue   = round(row.amount); }
  for (const row of partsRows)        { ensure(row.period).parts_expense         = round(row.amount); }
  for (const row of purchaseRows)     { ensure(row.period).purchase_expense      = round(row.amount); }
  for (const row of paidRows)         { ensure(row.period).total_paid            = round(row.amount); }
  for (const row of repairPartsRows)  { ensure(row.period).repair_parts_expense  = round(row.amount); }
  for (const row of consumableRows)   { ensure(row.period).consumable_expense    = round(row.amount); }

  // Compute derived totals with rounding to avoid floating point drift
  const results = Array.from(map.values()).map(r => {
    r.gross_income  = round(r.repair_revenue + r.device_sale_revenue);
    r.total_expense = round(r.purchase_expense + r.repair_parts_expense + r.consumable_expense);
    r.net_income    = round(r.gross_income   - r.total_expense);
    return r;
  });

  // Sort descending by period string
  results.sort((a, b) => b.period.localeCompare(a.period));
  return results;
}

export interface ExpenseItem {
  id: string;
  type: 'parts' | 'device' | 'repair_part' | 'consumable';
  date: string;
  title: string;
  subtitle: string | null;
  amount: number;
  repair_no?: string | null;
}

export async function getExpenseDetails(period: ReportPeriod, targetDate?: string, dateTo?: string): Promise<ExpenseItem[]> {
  const db = await getDB();
  const partsFilter = currentPeriodFilter(period, 'pp.purchased_at', targetDate ?? 'now', dateTo);
  const deviceFilter = currentPeriodFilter(period, 'dp.purchased_at', targetDate ?? 'now', dateTo);
  const repairPartsFilter = currentPeriodFilter(period, 'rpr.created_at', targetDate ?? 'now', dateTo);
  const consumableFilter = currentPeriodFilter(period, 'created_at', targetDate ?? 'now', dateTo);

  const safe = async <T>(p: Promise<T[]>): Promise<T[]> => {
    try { return await p; } catch (e) { console.warn('getExpenseDetails subquery error:', e); return []; }
  };

  const [partsRows, deviceRows, repairPartsRows, consumableRows] = await Promise.all([
    safe(db.getAllAsync<{ id: number; date: string; part_name: string; category_name: string | null; supplier_name: string | null; quantity: number; amount: number; repair_no: string | null }>(
      `SELECT pp.id, pp.purchased_at as date, p.name as part_name, c.name as category_name, pp.supplier_name, pp.quantity,
              pp.quantity * pp.cost_price as amount,
              printf('RPN-%04d', r.id) as repair_no
       FROM parts_purchases pp
       JOIN parts p ON p.id = pp.part_id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN repairs r ON r.id = pp.repair_id
       WHERE ${partsFilter}
       ORDER BY pp.purchased_at DESC`
    )),
    safe(db.getAllAsync<{ id: number; date: string; device_name: string; device_model: string; amount: number }>(
      `SELECT dp.id, dp.purchased_at as date, dp.device_name, dp.device_model, dp.purchase_price as amount
       FROM device_purchases dp
       WHERE ${deviceFilter}
       ORDER BY dp.purchased_at DESC`
    )),
    safe(db.getAllAsync<{ id: number; date: string; part_name: string; repair_no: string; quantity: number; amount: number }>(
      `SELECT rpr.id, rpr.created_at as date, p.name as part_name,
              printf('RPN-%04d', r.id) as repair_no, rpr.quantity,
              rpr.actual_cost * rpr.quantity as amount
       FROM repair_parts rpr
       JOIN parts p ON p.id = rpr.part_id
       JOIN repairs r ON r.id = rpr.repair_id
       WHERE rpr.actual_cost > 0 AND ${repairPartsFilter}
       ORDER BY rpr.created_at DESC`
    )),
    safe(db.getAllAsync<{ id: number; date: string; name: string; quantity: number; unit: string | null; unit_cost: number; amount: number }>(
      `SELECT id, created_at as date, name, quantity, unit, unit_cost,
              quantity * unit_cost as amount
       FROM consumable_purchases
       WHERE ${consumableFilter}
       ORDER BY created_at DESC`
    )),
  ]);

  const items: ExpenseItem[] = [
    ...deviceRows.map(r => ({
      id: `device-${r.id}`,
      type: 'device' as const,
      date: r.date,
      title: `${r.device_name} ${r.device_model}`.trim(),
      subtitle: null,
      amount: r.amount,
    })),
    ...repairPartsRows.map(r => ({
      id: `repair_part-${r.id}`,
      type: 'repair_part' as const,
      date: r.date,
      title: r.part_name,
      subtitle: `Used in ${r.repair_no} · Qty ${r.quantity}`,
      amount: r.amount,
    })),
    ...consumableRows.map(r => ({
      id: `consumable-${r.id}`,
      type: 'consumable' as const,
      date: r.date,
      title: r.name,
      subtitle: `${r.quantity} ${r.unit ?? 'pcs'} · ₱${r.unit_cost}/${r.unit ?? 'pcs'}`,
      amount: r.amount,
    })),
  ];

  items.sort((a, b) => b.date.localeCompare(a.date));
  return items;
}

export type FinancialKind = 'gross_income' | 'net_income' | 'net_income_cash' | 'total_paid' | 'for_collection';

export interface FinancialItem {
  id: string;
  kind: 'income' | 'expense';
  type: 'repair' | 'device_sale' | 'payment' | 'unpaid' | 'parts' | 'device' | 'repair_part' | 'consumable';
  date: string;
  title: string;
  subtitle: string | null;
  amount: number;
  repair_id?: number;
}

export async function getGrossIncomeDetails(period: ReportPeriod, targetDate?: string, dateTo?: string): Promise<FinancialItem[]> {
  const db = await getDB();
  const repairFilter = currentPeriodFilter(period, 'r.created_at', targetDate ?? 'now', dateTo);
  const saleFilter = currentPeriodFilter(period, 'ds.sold_at', targetDate ?? 'now', dateTo);

  const [repairRows, saleRows] = await Promise.all([
    db.getAllAsync<{ id: number; date: string; device_model: string; customer_name: string | null; amount: number; parts_count: number; parts_total: number }>(
      `SELECT r.id, r.created_at as date, r.device_model, c.name as customer_name, r.estimated_cost as amount,
              (SELECT COUNT(*) FROM repair_parts rp WHERE rp.repair_id = r.id) as parts_count,
              COALESCE((SELECT SUM(rp.unit_price * rp.quantity) FROM repair_parts rp WHERE rp.repair_id = r.id), 0) as parts_total
       FROM repairs r
       LEFT JOIN customers c ON c.id = r.customer_id
       WHERE r.status = 'delivered' AND ${repairFilter}
       ORDER BY r.created_at DESC`
    ),
    db.getAllAsync<{ id: number; date: string; device_name: string; device_model: string; amount: number }>(
      `SELECT ds.id, ds.sold_at as date, ds.device_name, ds.device_model, ds.sale_price as amount
       FROM device_sales ds WHERE ${saleFilter}
       ORDER BY ds.sold_at DESC`
    ),
  ]);

  const items: FinancialItem[] = [
    ...repairRows.map(r => ({
      id: `repair-${r.id}`,
      kind: 'income' as const,
      type: 'repair' as const,
      date: r.date,
      title: r.device_model,
      subtitle: r.customer_name
        ? `Repair · ${r.customer_name}${r.parts_count > 0 ? ` · ${r.parts_count} part${r.parts_count > 1 ? 's' : ''} used` : ''}`
        : `Repair${r.parts_count > 0 ? ` · ${r.parts_count} part${r.parts_count > 1 ? 's' : ''} used` : ''}`,
      amount: r.amount,
      repair_id: r.id,
    })),
    ...saleRows.map(r => ({
      id: `sale-${r.id}`,
      kind: 'income' as const,
      type: 'device_sale' as const,
      date: r.date,
      title: `${r.device_name} ${r.device_model}`.trim(),
      subtitle: 'Device Sale',
      amount: r.amount,
    })),
  ];

  items.sort((a, b) => b.date.localeCompare(a.date));
  return items;
}

export async function getTotalPaidDetails(period: ReportPeriod, targetDate?: string, dateTo?: string): Promise<FinancialItem[]> {
  const db = await getDB();
  const filter = currentPeriodFilter(period, 'rp.payment_date', targetDate ?? 'now', dateTo);

  const rows = await db.getAllAsync<{ id: number; repair_db_id: number; date: string; device_model: string; customer_name: string | null; amount: number }>(
    `SELECT rp.id, r.id as repair_db_id, rp.payment_date as date, r.device_model, c.name as customer_name, rp.amount
     FROM repair_payments rp
     JOIN repairs r ON r.id = rp.repair_id
     LEFT JOIN customers c ON c.id = r.customer_id
     WHERE r.status = 'delivered' AND ${filter}
     ORDER BY rp.payment_date DESC`
  );

  return rows.map(r => ({
    id: `payment-${r.id}`,
    kind: 'income' as const,
    type: 'payment' as const,
    date: r.date,
    title: r.device_model,
    subtitle: r.customer_name ? `Payment · ${r.customer_name}` : 'Payment',
    amount: r.amount,
    repair_id: r.repair_db_id,
  }));
}

export async function getForCollectionDetails(period: ReportPeriod, targetDate?: string, dateTo?: string): Promise<FinancialItem[]> {
  const db = await getDB();
  const repairFilter = currentPeriodFilter(period, 'r.created_at', targetDate ?? 'now', dateTo);
  const saleFilter   = currentPeriodFilter(period, 'ds.sold_at',   targetDate ?? 'now', dateTo);

  const [repairRows, saleRows] = await Promise.all([
    db.getAllAsync<{ id: number; date: string; device_model: string; customer_name: string | null; amount: number }>(
      `SELECT r.id, r.created_at as date, r.device_model, c.name as customer_name,
              COALESCE(r.final_cost, r.estimated_cost) -
              COALESCE((SELECT SUM(amount) FROM repair_payments rp WHERE rp.repair_id = r.id), 0) as amount
       FROM repairs r
       LEFT JOIN customers c ON c.id = r.customer_id
       WHERE r.is_paid = 0 AND r.status = 'delivered' AND ${repairFilter}
       ORDER BY r.created_at DESC`
    ),
    db.getAllAsync<{ id: number; date: string; device_name: string; device_model: string; customer_name: string | null; amount: number }>(
      `SELECT ds.id, ds.sold_at as date, ds.device_name, ds.device_model, c.name as customer_name,
              ds.sale_price - COALESCE((SELECT SUM(dsp.amount) FROM device_sale_payments dsp WHERE dsp.device_sale_id = ds.id), 0) as amount
       FROM device_sales ds
       LEFT JOIN customers c ON c.id = ds.customer_id
       WHERE ds.sale_price > COALESCE((SELECT SUM(dsp.amount) FROM device_sale_payments dsp WHERE dsp.device_sale_id = ds.id), 0)
         AND ${saleFilter}
       ORDER BY ds.sold_at DESC`
    ),
  ]);

  const items: FinancialItem[] = [
    ...repairRows.map(r => ({
      id: `unpaid-${r.id}`,
      kind: 'income' as const,
      type: 'unpaid' as const,
      date: r.date,
      title: r.device_model,
      subtitle: r.customer_name ? `Unpaid · ${r.customer_name}` : 'Unpaid',
      amount: r.amount,
      repair_id: r.id,
    })),
    ...saleRows.map(r => ({
      id: `sale-balance-${r.id}`,
      kind: 'income' as const,
      type: 'device_sale' as const,
      date: r.date,
      title: `${r.device_name} ${r.device_model}`.trim(),
      subtitle: r.customer_name ? `Device Sale · ${r.customer_name}` : 'Device Sale',
      amount: r.amount,
    })),
  ];

  items.sort((a, b) => b.date.localeCompare(a.date));
  return items;
}

export async function getNetIncomeDetails(period: ReportPeriod, targetDate?: string, dateTo?: string): Promise<FinancialItem[]> {
  const [incomeItems, expenseItems] = await Promise.all([
    getGrossIncomeDetails(period, targetDate, dateTo),
    getExpenseDetails(period, targetDate, dateTo),
  ]);

  const items: FinancialItem[] = [
    ...incomeItems,
    ...expenseItems.map(e => ({
      id: e.id,
      kind: 'expense' as const,
      type: e.type,
      date: e.date,
      title: e.title,
      subtitle: e.subtitle,
      amount: e.amount,
    })),
  ];

  items.sort((a, b) => b.date.localeCompare(a.date));
  return items;
}

export interface IssueCount {
  issue: string;
  count: number;
}

export interface BrandCount {
  brand: string;
  count: number;
}

export async function getNetIncomeCashDetails(period: ReportPeriod, targetDate?: string, dateTo?: string): Promise<FinancialItem[]> {
  const [paidItems, expenseItems] = await Promise.all([
    getTotalPaidDetails(period, targetDate, dateTo),
    getExpenseDetails(period, targetDate, dateTo),
  ]);

  const items: FinancialItem[] = [
    ...paidItems,
    ...expenseItems.map(e => ({
      id: e.id,
      kind: 'expense' as const,
      type: e.type,
      date: e.date,
      title: e.title,
      subtitle: e.subtitle,
      amount: e.amount,
    })),
  ];

  items.sort((a, b) => b.date.localeCompare(a.date));
  return items;
}

export async function getRepairsByIssue(period: ReportPeriod, targetDate?: string): Promise<IssueCount[]> {
  const db = await getDB();
  const filter = currentPeriodFilter(period, 'created_at', targetDate ?? 'now');

  const rows = await db.getAllAsync<{ issue_desc: string }>(
    `SELECT issue_desc FROM repairs
     WHERE issue_desc IS NOT NULL AND issue_desc != ''
       AND status = 'delivered'
       AND ${filter}
     ORDER BY created_at DESC`
  );

  const counts = new Map<string, number>();
  for (const row of rows) {
    const issues = row.issue_desc.split(',').map(s => s.trim()).filter(Boolean);
    for (const issue of issues) {
      counts.set(issue, (counts.get(issue) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count);
}

export interface CategoryStockValue {
  category: string;
  total_value: number;
  total_qty: number;
}

export async function getStockValueByCategory(): Promise<CategoryStockValue[]> {
  const db = await getDB();
  return db.getAllAsync<CategoryStockValue>(
    `SELECT COALESCE(c.name, 'Uncategorized') as category,
            SUM(p.quantity * p.cost_price) as total_value,
            SUM(p.quantity) as total_qty
     FROM parts p
     LEFT JOIN categories c ON c.id = p.category_id
     GROUP BY COALESCE(c.name, 'Uncategorized')
     ORDER BY total_value DESC`
  );
}

export async function getRepairsByBrand(period: ReportPeriod, targetDate?: string): Promise<BrandCount[]> {
  const db = await getDB();
  const filter = currentPeriodFilter(period, 'r.created_at', targetDate ?? 'now');

  const rows = await db.getAllAsync<{ brand: string; count: number }>(
    `SELECT COALESCE(db.name, 'Unknown Brand') as brand, COUNT(*) as count
     FROM repairs r
     LEFT JOIN device_models dm ON LOWER(TRIM(dm.name)) = LOWER(TRIM(r.device_model))
     LEFT JOIN device_brands db ON db.id = dm.brand_id
     WHERE r.status = 'delivered'
       AND ${filter}
     GROUP BY COALESCE(db.name, 'Unknown Brand')
     ORDER BY count DESC`
  );

  return rows;
}

export async function getTotalSummary(period: ReportPeriod, targetDate?: string, dateTo?: string): Promise<TotalSummary> {
  const db = await getDB();
  const rows = await getReportSummary(period, targetDate, dateTo);
  const r2 = (n: number) => Math.round(n * 100) / 100;

  // Unpaid repairs + device sale balances filtered by current period
  const periodFilter    = currentPeriodFilter(period, 'r.created_at',  targetDate ?? 'now', dateTo);
  const salePeriodFilter = currentPeriodFilter(period, 'ds.sold_at',   targetDate ?? 'now', dateTo);
  const [unpaidRow, saleUnpaidRow] = await Promise.all([
    db.getFirstAsync<{ count: number; amount: number }>(
      `SELECT COUNT(*) as count,
              COALESCE(SUM(
                COALESCE(final_cost, estimated_cost) -
                COALESCE((SELECT SUM(amount) FROM repair_payments rp WHERE rp.repair_id = r.id), 0)
              ), 0) as amount
       FROM repairs r
       WHERE r.is_paid = 0 AND r.status = 'delivered'
         AND ${periodFilter}`
    ),
    db.getFirstAsync<{ count: number; amount: number }>(
      `SELECT COUNT(*) as count,
              COALESCE(SUM(
                ds.sale_price - COALESCE((SELECT SUM(dsp.amount) FROM device_sale_payments dsp WHERE dsp.device_sale_id = ds.id), 0)
              ), 0) as amount
       FROM device_sales ds
       WHERE ds.sale_price > COALESCE((SELECT SUM(dsp.amount) FROM device_sale_payments dsp WHERE dsp.device_sale_id = ds.id), 0)
         AND ${salePeriodFilter}`
    ),
  ]);

  const base = rows.reduce<TotalSummary>(
    (acc, r) => ({
      gross_income:    r2(acc.gross_income    + r.gross_income),
      net_income:      r2(acc.net_income      + r.net_income),
      net_income_cash: 0,
      total_revenue:   r2(acc.total_revenue   + r.gross_income),
      total_expense:   r2(acc.total_expense   + r.total_expense),
      total_paid:      r2(acc.total_paid      + r.total_paid),
      unpaid_count:    0,
      unpaid_amount:   0,
      parts_purchase:  r2(acc.parts_purchase  + r.parts_expense),
    }),
    { gross_income: 0, net_income: 0, net_income_cash: 0, total_revenue: 0, total_expense: 0, total_paid: 0, unpaid_count: 0, unpaid_amount: 0, parts_purchase: 0 }
  );

  base.unpaid_count    = (unpaidRow?.count ?? 0) + (saleUnpaidRow?.count ?? 0);
  base.unpaid_amount   = r2((unpaidRow?.amount ?? 0) + (saleUnpaidRow?.amount ?? 0));
  base.net_income_cash = r2(base.total_paid - base.total_expense);
  return base;
}

export interface DailyRepairStat {
  date: string;       // YYYY-MM-DD
  recorded: number;
  delivered: number;
}

export interface TrendPoint {
  label: string;
  income: number;
  expense: number;
}

export async function getIncomeTrend(months = 6): Promise<TrendPoint[]> {
  const db = await getDB();
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const from = keys[0];
  const to   = keys[keys.length - 1];

  const safe = async <T>(p: Promise<T[]>): Promise<T[]> => { try { return await p; } catch { return []; } };

  const [repairRows, saleRows, ppRows, dpRows, rpRows, cpRows] = await Promise.all([
    safe(db.getAllAsync<{ p: string; v: number }>(
      `SELECT strftime('%Y-%m', created_at) p, SUM(estimated_cost) v
       FROM repairs WHERE status='delivered' AND strftime('%Y-%m',created_at) BETWEEN ? AND ? GROUP BY p`, [from, to])),
    safe(db.getAllAsync<{ p: string; v: number }>(
      `SELECT strftime('%Y-%m', sold_at) p, SUM(sale_price) v
       FROM device_sales WHERE strftime('%Y-%m',sold_at) BETWEEN ? AND ? GROUP BY p`, [from, to])),
    safe(db.getAllAsync<{ p: string; v: number }>(
      `SELECT strftime('%Y-%m', purchased_at) p, SUM(quantity*cost_price) v
       FROM parts_purchases WHERE strftime('%Y-%m',purchased_at) BETWEEN ? AND ? GROUP BY p`, [from, to])),
    safe(db.getAllAsync<{ p: string; v: number }>(
      `SELECT strftime('%Y-%m', purchased_at) p, SUM(purchase_price) v
       FROM device_purchases WHERE strftime('%Y-%m',purchased_at) BETWEEN ? AND ? GROUP BY p`, [from, to])),
    safe(db.getAllAsync<{ p: string; v: number }>(
      `SELECT strftime('%Y-%m', created_at) p, SUM(actual_cost*quantity) v
       FROM repair_parts WHERE actual_cost>0 AND strftime('%Y-%m',created_at) BETWEEN ? AND ? GROUP BY p`, [from, to])),
    safe(db.getAllAsync<{ p: string; v: number }>(
      `SELECT strftime('%Y-%m', created_at) p, SUM(quantity*unit_cost) v
       FROM consumable_purchases WHERE strftime('%Y-%m',created_at) BETWEEN ? AND ? GROUP BY p`, [from, to])),
  ]);

  const inc: Record<string, number> = {};
  const exp: Record<string, number> = {};
  for (const r of repairRows) inc[r.p] = (inc[r.p] ?? 0) + (r.v ?? 0);
  for (const r of saleRows)   inc[r.p] = (inc[r.p] ?? 0) + (r.v ?? 0);
  for (const r of ppRows)     exp[r.p] = (exp[r.p] ?? 0) + (r.v ?? 0);
  for (const r of dpRows)     exp[r.p] = (exp[r.p] ?? 0) + (r.v ?? 0);
  for (const r of rpRows)     exp[r.p] = (exp[r.p] ?? 0) + (r.v ?? 0);
  for (const r of cpRows)     exp[r.p] = (exp[r.p] ?? 0) + (r.v ?? 0);

  return keys.map(key => {
    const [y, m] = key.split('-');
    const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-PH', { month: 'short' });
    return {
      label,
      income:  Math.round((inc[key] ?? 0) * 100) / 100,
      expense: Math.round((exp[key] ?? 0) * 100) / 100,
    };
  });
}

export async function getDailyRepairStats(): Promise<DailyRepairStat[]> {
  const db = await getDB();

  // Build 7-day window (today - 6 days to today)
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  const from = days[0];

  const [recRows, delRows] = await Promise.all([
    db.getAllAsync<{ date: string; count: number }>(
      `SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count
       FROM repairs
       WHERE strftime('%Y-%m-%d', created_at) >= ?
       GROUP BY date`,
      [from]
    ),
    db.getAllAsync<{ date: string; count: number }>(
      `SELECT strftime('%Y-%m-%d', delivered_at) as date, COUNT(*) as count
       FROM repairs
       WHERE status = 'delivered' AND delivered_at IS NOT NULL
         AND strftime('%Y-%m-%d', delivered_at) >= ?
       GROUP BY date`,
      [from]
    ),
  ]);

  const recMap = Object.fromEntries(recRows.map(r => [r.date, r.count]));
  const delMap = Object.fromEntries(delRows.map(r => [r.date, r.count]));

  return days.map(date => ({
    date,
    recorded: recMap[date] ?? 0,
    delivered: delMap[date] ?? 0,
  }));
}
