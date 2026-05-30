import React, { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Divider, SegmentedButtons, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import {
  getReportSummary,
  getTotalSummary,
  getRepairsByIssue,
  PeriodReport,
  ReportPeriod,
  TotalSummary,
  IssueCount,
} from '../../repositories/reportsRepository';
import { Colors } from '../../constants/colors';
import { formatCurrency } from '../../utils/formatters';

function formatPeriodLabel(period: string, type: ReportPeriod): string {
  try {
    if (type === 'daily') {
      const [y, m, d] = period.split('-');
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (type === 'weekly') {
      return period.replace('-W', ' Week ');
    }
    if (type === 'monthly') {
      const [y, m] = period.split('-');
      const date = new Date(Number(y), Number(m) - 1, 1);
      return date.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    }
    return period; // yearly — just the year
  } catch {
    return period;
  }
}

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
];

export default function ReportsScreen() {
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [rows, setRows] = useState<PeriodReport[]>([]);
  const [summary, setSummary] = useState<TotalSummary>({ gross_income: 0, net_income: 0, total_revenue: 0, total_expense: 0, total_paid: 0, unpaid_count: 0, unpaid_amount: 0 });
  const [issueCounts, setIssueCounts] = useState<IssueCount[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, s, ic] = await Promise.all([
      getReportSummary(period),
      getTotalSummary(period),
      getRepairsByIssue(period),
    ]);
    setRows(r);
    setSummary(s);
    setIssueCounts(ic);
    setLoading(false);
  }, [period]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const netColor = summary.net_income >= 0 ? Colors.success : Colors.error;

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={period}
        onValueChange={v => setPeriod(v as ReportPeriod)}
        buttons={PERIODS}
        style={styles.segmented}
      />

      {/* Summary cards */}
      <View style={styles.cardsRow}>
        <View style={[styles.card, styles.cardLarge, { borderLeftColor: netColor }]}>
          <Text style={[styles.cardAmount, { color: netColor }]}>{formatCurrency(summary.net_income)}</Text>
          <Text style={styles.cardLabel}>Net Income</Text>
        </View>
        <View style={[styles.card, styles.cardLarge, { borderLeftColor: Colors.primary }]}>
          <Text style={[styles.cardAmount, { color: Colors.primary }]}>{formatCurrency(summary.gross_income)}</Text>
          <Text style={styles.cardLabel}>Gross Income</Text>
        </View>
      </View>
      <View style={styles.cardsRow}>
        <View style={[styles.card, styles.cardSmall, { borderLeftColor: Colors.success }]}>
          <Text style={[styles.cardAmountSm, { color: Colors.success }]}>{formatCurrency(summary.total_revenue)}</Text>
          <Text style={styles.cardLabel}>Total Revenue</Text>
        </View>
        <View style={[styles.card, styles.cardSmall, { borderLeftColor: Colors.error }]}>
          <Text style={[styles.cardAmountSm, { color: Colors.error }]}>{formatCurrency(summary.total_expense)}</Text>
          <Text style={styles.cardLabel}>Total Expense</Text>
        </View>
      </View>
      <View style={styles.cardsRow}>
        <View style={[styles.card, styles.cardSmall, { borderLeftColor: Colors.info }]}>
          <Text style={[styles.cardAmountSm, { color: Colors.info }]}>{formatCurrency(summary.total_paid)}</Text>
          <Text style={styles.cardLabel}>Total Paid (Collected)</Text>
        </View>
      </View>
      <View style={styles.cardsRow}>
        <View style={[styles.card, styles.cardSmall, { borderLeftColor: Colors.warning }]}>
          <Text style={[styles.cardAmountSm, { color: Colors.warning }]}>{summary.unpaid_count} repairs</Text>
          <Text style={[styles.cardAmountSm, { color: Colors.warning, fontSize: 14 }]}>{formatCurrency(summary.unpaid_amount)}</Text>
          <Text style={styles.cardLabel}>For Collection (Unpaid)</Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      <ScrollView contentContainerStyle={styles.listContent} refreshing={loading} onScrollToTop={load as any}>
        {/* Financial period breakdown */}
        <View style={styles.listHeader}>
          <Text style={styles.colPeriod}>Period</Text>
          <Text style={styles.colNum}>Revenue</Text>
          <Text style={styles.colNum}>Expense</Text>
          <Text style={styles.colNum}>Net</Text>
        </View>
        {rows.length === 0
          ? <Text style={styles.empty}>No financial data yet.</Text>
          : rows.map(item => {
              const net = item.net_income;
              return (
                <View key={item.period}>
                  <View style={styles.row}>
                    <Text style={styles.colPeriod} numberOfLines={1}>{formatPeriodLabel(item.period, period)}</Text>
                    <Text style={[styles.colNum, { color: Colors.success }]}>{formatCurrency(item.gross_income)}</Text>
                    <Text style={[styles.colNum, { color: Colors.error }]}>{formatCurrency(item.total_expense)}</Text>
                    <Text style={[styles.colNum, { color: net >= 0 ? Colors.success : Colors.error, fontWeight: '700' }]}>{formatCurrency(net)}</Text>
                  </View>
                  <Divider />
                </View>
              );
            })
        }

        {/* Repairs by Issue */}
        <Divider style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>Repairs by Issue</Text>
        {issueCounts.length === 0
          ? <Text style={styles.empty}>No repair data yet.</Text>
          : issueCounts.map((item, i) => {
              const maxCount = issueCounts[0]?.count ?? 1;
              const barWidth = `${Math.round((item.count / maxCount) * 100)}%` as any;
              return (
                <View key={item.issue} style={styles.issueRow}>
                  <View style={styles.issueLeft}>
                    <Text style={styles.issueName} numberOfLines={1}>{item.issue}</Text>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: barWidth }]} />
                    </View>
                  </View>
                  <Text style={styles.issueCount}>{item.count}</Text>
                </View>
              );
            })
        }
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  segmented: { margin: 12 },
  cardsRow: { flexDirection: 'row', paddingHorizontal: 8 },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 14,
    margin: 4,
    borderLeftWidth: 4,
    elevation: 2,
  },
  cardLarge: {},
  cardSmall: {},
  cardAmount: { fontSize: 22, fontWeight: 'bold' },
  cardAmountSm: { fontSize: 17, fontWeight: 'bold' },
  cardLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  divider: { marginVertical: 10 },
  listHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary + '15',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
  },
  colPeriod: { flex: 1.4, fontSize: 12, color: Colors.text },
  colNum: { flex: 1, fontSize: 12, textAlign: 'right', color: Colors.text },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 16, marginBottom: 16, fontSize: 14 },
  emptyContainer: { flex: 1 },
  listContent: { paddingBottom: 16 },
  sectionDivider: { marginVertical: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, paddingHorizontal: 12, marginBottom: 10 },
  issueRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  issueLeft: { flex: 1, marginRight: 12 },
  issueName: { fontSize: 13, fontWeight: '500', color: Colors.text, marginBottom: 4 },
  barBg: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  issueCount: { fontSize: 16, fontWeight: '700', color: Colors.primary, minWidth: 28, textAlign: 'right' },
});
