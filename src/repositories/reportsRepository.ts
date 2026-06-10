import { getDB } from '../db/database';

export type ReportPeriod = 'all_time' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface PeriodReport {
  period: string;
  repair_revenue: number;
  device_sale_revenue: number;
  gross_income: number;
  parts_expense: number;
  purchase_expense: number;
  total_expense: number;
  net_income: number;
  total_paid: number;
}

export interface TotalSummary {
  gross_income: number;
  net_income: number;
  total_revenue: number;
  total_expense: number;
  total_paid: number;
  unpaid_count: number;
  unpaid_amount: number;
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

  const [repairRows, saleRows, partsRows, purchaseRows, paidRows] = await Promise.all([
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
        total_expense: 0,
        net_income: 0,
        total_paid: 0,
      });
    }
    return map.get(p)!;
  };

  const round = (n: number) => Math.round((n ?? 0) * 100) / 100;

  for (const row of repairRows)   { ensure(row.period).repair_revenue       = round(row.amount); }
  for (const row of saleRows)     { ensure(row.period).device_sale_revenue  = round(row.amount); }
  for (const row of partsRows)    { ensure(row.period).parts_expense        = round(row.amount); }
  for (const row of purchaseRows) { ensure(row.period).purchase_expense     = round(row.amount); }
  for (const row of paidRows)     { ensure(row.period).total_paid           = round(row.amount); }

  // Compute derived totals with rounding to avoid floating point drift
  const results = Array.from(map.values()).map(r => {
    r.gross_income  = round(r.repair_revenue + r.device_sale_revenue);
    r.total_expense = round(r.parts_expense  + r.purchase_expense);
    r.net_income    = round(r.gross_income   - r.total_expense);
    return r;
  });

  // Sort descending by period string
  results.sort((a, b) => b.period.localeCompare(a.period));
  return results;
}

export interface IssueCount {
  issue: string;
  count: number;
}

export interface BrandCount {
  brand: string;
  count: number;
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

  // Unpaid repairs filtered by current period
  const periodFilter = currentPeriodFilter(period, 'r.created_at', targetDate ?? 'now', dateTo);
  const unpaidRow = await db.getFirstAsync<{ count: number; amount: number }>(
    `SELECT COUNT(*) as count,
            COALESCE(SUM(COALESCE(final_cost, estimated_cost)), 0) -
            COALESCE((SELECT SUM(amount) FROM repair_payments rp WHERE rp.repair_id = r.id), 0) as amount
     FROM repairs r
     WHERE r.is_paid = 0 AND r.status = 'delivered'
       AND ${periodFilter}`
  );

  const base = rows.reduce<TotalSummary>(
    (acc, r) => ({
      gross_income:  r2(acc.gross_income  + r.gross_income),
      net_income:    r2(acc.net_income    + r.net_income),
      total_revenue: r2(acc.total_revenue + r.gross_income),
      total_expense: r2(acc.total_expense + r.total_expense),
      total_paid:    r2(acc.total_paid    + r.total_paid),
      unpaid_count:  0,
      unpaid_amount: 0,
    }),
    { gross_income: 0, net_income: 0, total_revenue: 0, total_expense: 0, total_paid: 0, unpaid_count: 0, unpaid_amount: 0 }
  );

  base.unpaid_count  = unpaidRow?.count ?? 0;
  base.unpaid_amount = r2(unpaidRow?.amount ?? 0);
  return base;
}

export interface DailyRepairStat {
  date: string;       // YYYY-MM-DD
  recorded: number;
  delivered: number;
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
