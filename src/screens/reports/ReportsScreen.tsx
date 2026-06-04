import React, { useCallback, useLayoutEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Divider, IconButton, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAnimatedTabTitle } from '../../hooks/useAnimatedTabTitle';
import { useFilterStore } from '../../store/filterStore';
import {
  getReportSummary,
  getTotalSummary,
  getRepairsByIssue,
  getRepairsByBrand,
  getStockValueByCategory,
  PeriodReport,
  ReportPeriod,
  TotalSummary,
  IssueCount,
  BrandCount,
  CategoryStockValue,
} from '../../repositories/reportsRepository';
import { Colors } from '../../constants/colors';
import { formatCurrency } from '../../utils/formatters';

const PERIODS: { value: ReportPeriod; label: string; icon: string }[] = [
  { value: 'all_time', label: 'All Time', icon: 'infinity' },
  { value: 'daily',    label: 'Today',    icon: 'calendar-today' },
  { value: 'weekly',   label: 'Weekly',   icon: 'calendar-week' },
  { value: 'monthly',  label: 'Monthly',  icon: 'calendar-month' },
  { value: 'yearly',   label: 'Yearly',   icon: 'calendar' },
];

function toIso(d: Date): string { return d.toISOString().split('T')[0]; }

export default function ReportsScreen() {
  const navigation = useNavigation();
  useAnimatedTabTitle(navigation, 'Reports');

  const { setPeriod: setGlobalPeriod, setTargetDate: setGlobalTargetDate } = useFilterStore();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ padding: 5, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', marginRight: 12 }}
          onPress={() => setPeriodFilterVisible(v => !v)}
        >
          <MaterialCommunityIcons name="filter-variant" size={20} color="#fff" />
        </TouchableOpacity>
      ),
    } as any);
  }, [navigation]);
  const [period, setPeriod] = useState<ReportPeriod>('all_time');
  const [targetDate, setTargetDate] = useState(new Date());
  const [summary, setSummary] = useState<TotalSummary>({
    gross_income: 0, net_income: 0, total_revenue: 0,
    total_expense: 0, total_paid: 0, unpaid_count: 0, unpaid_amount: 0,
  });
  const [rows, setRows] = useState<PeriodReport[]>([]);
  const [issueCounts, setIssueCounts] = useState<IssueCount[]>([]);
  const [brandCounts, setBrandCounts] = useState<BrandCount[]>([]);
  const [stockValues, setStockValues] = useState<CategoryStockValue[]>([]);
  const [periodFilterVisible, setPeriodFilterVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = (dir: 1 | -1) => {
    setTargetDate(prev => {
      const d = new Date(prev);
      if (period === 'monthly') d.setMonth(d.getMonth() + dir);
      else if (period === 'yearly') d.setFullYear(d.getFullYear() + dir);
      setGlobalTargetDate(d);
      return d;
    });
  };

  const navLabel = () => {
    if (period === 'monthly') return targetDate.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    if (period === 'yearly') return String(targetDate.getFullYear());
    return '';
  };

  const load = useCallback(async () => {
    setLoading(true);
    const td = period === 'all_time' ? undefined : toIso(targetDate);
    const [r, s, ic, bc, sv] = await Promise.all([
      getReportSummary(period, td),
      getTotalSummary(period, td),
      getRepairsByIssue(period, td),
      getRepairsByBrand(period, td),
      getStockValueByCategory(),
    ]);
    setRows(r);
    setSummary(s);
    setIssueCounts(ic);
    setBrandCounts(bc);
    setStockValues(sv);
    setLoading(false);
  }, [period, targetDate]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isPositive = summary.net_income >= 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[Colors.primary]} />}
    >
      {/* Period filter */}
      {periodFilterVisible && (
        <View style={styles.filterPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {PERIODS.map(p => {
              const active = period === p.value;
              return (
                <TouchableOpacity key={p.value}
                  style={[styles.periodChip, active && styles.periodChipActive]}
                  onPress={() => { setPeriod(p.value); setTargetDate(new Date()); setGlobalPeriod(p.value); setGlobalTargetDate(new Date()); }}
                  activeOpacity={0.75}>
                  <MaterialCommunityIcons name={p.icon as any} size={13} color={active ? '#fff' : Colors.textSecondary} />
                  <Text style={[styles.periodChipLabel, active && { color: '#fff' }]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {(period === 'monthly' || period === 'yearly') && (
            <View style={styles.navRow}>
              <IconButton icon="chevron-left" size={20} iconColor={Colors.primary} onPress={() => navigate(-1)} />
              <Text style={styles.navLabel}>{navLabel()}</Text>
              <IconButton icon="chevron-right" size={20} iconColor={Colors.primary} onPress={() => navigate(1)} />
            </View>
          )}
        </View>
      )}

      {/* Net Income hero */}
      <View style={[styles.heroCard, { backgroundColor: isPositive ? Colors.success : Colors.error }]}>
        <Text style={styles.heroLabel}>Net Income</Text>
        <Text style={styles.heroAmount}>{formatCurrency(summary.net_income)}</Text>
        <Text style={styles.heroSub}>Gross Income − Total Expense</Text>
      </View>

      {/* Metrics 2×2 grid */}
      <View style={styles.metricsGrid}>
        {[
          { label: 'Gross Income',  value: formatCurrency(summary.gross_income),  color: Colors.primary, icon: 'trending-up' },
          { label: 'Total Expense', value: formatCurrency(summary.total_expense), color: Colors.error,   icon: 'trending-down' },
          { label: 'Total Paid',    value: formatCurrency(summary.total_paid),    color: Colors.info,    icon: 'cash-check' },
          { label: 'For Collection',value: formatCurrency(summary.unpaid_amount), color: Colors.warning, icon: 'cash-clock',
            sub: `${summary.unpaid_count} repair${summary.unpaid_count !== 1 ? 's' : ''}` },
        ].map(m => (
          <View key={m.label} style={[styles.metricCard, { borderTopColor: m.color }]}>
            <View style={styles.metricTop}>
              <MaterialCommunityIcons name={m.icon as any} size={16} color={m.color} />
              <Text style={[styles.metricLabel, { color: m.color }]}>{m.label}</Text>
            </View>
            <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
            {m.sub ? <Text style={styles.metricSub}>{m.sub}</Text> : null}
          </View>
        ))}
      </View>


      {false && stockValues.length > 0 && (
        <View style={styles.section}>
          <View style={styles.card}>
            {stockValues.map((item, i) => (
              <View key={item.category} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.td, { flex: 1 }]}>{item.category}</Text>
                <Text style={[styles.td, { color: Colors.textSecondary, fontSize: 11 }]}>{item.total_qty} units</Text>
                <Text style={[styles.td, { textAlign: 'right', fontWeight: '700', color: Colors.primary }]}>{formatCurrency(item.total_value)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function MetricCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: string }) {
  return (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricTop}>
        <MaterialCommunityIcons name={icon as any} size={18} color={color} />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
    </View>
  );
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = `${Math.max(4, Math.round((count / max) * 100))}%` as any;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: pct, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barCount, { color }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  // Period filter panel
  filterPanel: { backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden', elevation: 2, marginBottom: 0 },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  periodChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#F2F4F7' },
  periodChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  periodChipLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: Colors.border },
  navLabel: { fontSize: 14, fontWeight: '700', color: Colors.text, minWidth: 160, textAlign: 'center' },

  // Hero card — colored background
  heroCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  heroLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  heroAmount: { fontSize: 38, fontWeight: '800', color: '#fff', lineHeight: 44 },
  heroSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6 },

  // Metric 2×2 grid
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    width: '47.5%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  metricTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metricLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  metricValue: { fontSize: 18, fontWeight: '800' },
  metricSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 3 },

  // Section
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7, paddingLeft: 2 },
  card: { backgroundColor: Colors.surface, borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },

  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 14 },
  th: { flex: 1, fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: Colors.surface },
  tableRowAlt: { backgroundColor: '#F8F9FB' },
  td: { flex: 1, fontSize: 12, color: Colors.text },

  // Breakdown toggles
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  toggleLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  toggleChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  toggleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleText: { fontSize: 12, color: Colors.text, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },

  // Bar chart
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  barLabel: { width: 140, fontSize: 12, color: Colors.text, fontWeight: '500' },
  barTrack: { flex: 1, height: 7, backgroundColor: '#EAECF0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 7, borderRadius: 4 },
  barCount: { fontSize: 14, fontWeight: '800', minWidth: 28, textAlign: 'right' },

  // Kept for safety
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  tableCard: { backgroundColor: Colors.surface, borderRadius: 12, overflow: 'hidden', elevation: 2 },
  tableCell: { flex: 1, fontSize: 12, color: Colors.text },
  barCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 12, elevation: 2 },
  toggleChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleChipText: { fontSize: 12, color: Colors.text },
  stockRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  stockQty: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  issueRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  issueLeft: { flex: 1, marginRight: 8 },
  issueName: { fontSize: 13, fontWeight: '500', color: Colors.text },
  issueCount: { fontSize: 16, fontWeight: '700' },
  barBg: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  empty: { textAlign: 'center', color: Colors.textSecondary, padding: 16, fontSize: 13 },
});
