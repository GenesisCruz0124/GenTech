import { getDB } from '../db/database';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

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
}

function periodFormat(period: ReportPeriod): string {
  switch (period) {
    case 'daily':   return '%Y-%m-%d';
    case 'weekly':  return '%Y-W%W';
    case 'monthly': return '%Y-%m';
    case 'yearly':  return '%Y';
  }
}

export async function getReportSummary(period: ReportPeriod): Promise<PeriodReport[]> {
  const db = await getDB();
  const fmt = periodFormat(period);

  const [repairRows, saleRows, partsRows, purchaseRows, paidRows] = await Promise.all([
    // Repair revenue: delivered repairs only
    db.getAllAsync<{ period: string; amount: number }>(
      `SELECT strftime('${fmt}', created_at) as period,
              SUM(COALESCE(final_cost, estimated_cost)) as amount
       FROM repairs WHERE status = 'delivered'
       GROUP BY period ORDER BY period DESC`
    ),
    // Device sale revenue
    db.getAllAsync<{ period: string; amount: number }>(
      `SELECT strftime('${fmt}', sold_at) as period,
              SUM(sale_price) as amount
       FROM device_sales
       GROUP BY period ORDER BY period DESC`
    ),
    // Parts expense — what was actually paid to purchase inventory
    db.getAllAsync<{ period: string; amount: number }>(
      `SELECT strftime('${fmt}', purchased_at) as period,
              SUM(quantity * cost_price) as amount
       FROM parts_purchases
       GROUP BY period ORDER BY period DESC`
    ),
    // Device purchase expense
    db.getAllAsync<{ period: string; amount: number }>(
      `SELECT strftime('${fmt}', purchased_at) as period,
              SUM(purchase_price) as amount
       FROM device_purchases
       GROUP BY period ORDER BY period DESC`
    ),
    // Total paid collected (from repair_payments)
    db.getAllAsync<{ period: string; amount: number }>(
      `SELECT strftime('${fmt}', payment_date) as period,
              SUM(amount) as amount
       FROM repair_payments
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

export async function getRepairsByIssue(period: ReportPeriod): Promise<IssueCount[]> {
  const db = await getDB();
  const fmt = periodFormat(period);

  // Get all repairs with their issue_desc and date for the current period grouping
  const rows = await db.getAllAsync<{ issue_desc: string; period: string }>(
    `SELECT issue_desc, strftime('${fmt}', created_at) as period
     FROM repairs
     WHERE issue_desc IS NOT NULL AND issue_desc != ''
       AND status != 'not_repaired'
     ORDER BY created_at DESC`
  );

  // Split comma-separated issues and count each
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

export async function getTotalSummary(period: ReportPeriod): Promise<TotalSummary> {
  const rows = await getReportSummary(period);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return rows.reduce<TotalSummary>(
    (acc, r) => ({
      gross_income:  r2(acc.gross_income  + r.gross_income),
      net_income:    r2(acc.net_income    + r.net_income),
      total_revenue: r2(acc.total_revenue + r.gross_income),
      total_expense: r2(acc.total_expense + r.total_expense),
      total_paid:    r2(acc.total_paid    + r.total_paid),
    }),
    { gross_income: 0, net_income: 0, total_revenue: 0, total_expense: 0, total_paid: 0 }
  );
}
