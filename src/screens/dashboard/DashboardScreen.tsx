import React, { useCallback, useLayoutEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAnimatedTabTitle } from '../../hooks/useAnimatedTabTitle';
import { useFilterStore } from '../../store/filterStore';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import {
  getTotalSummary,
  getDailyRepairStats,
  DailyRepairStat,
  ReportPeriod,
  TotalSummary,
  FinancialKind,
} from '../../repositories/reportsRepository';
import { getSetting } from '../../repositories/settingsRepository';
import { Colors } from '../../constants/colors';
import { formatCurrency } from '../../utils/formatters';
import DatePickerField from '../../components/common/DatePickerField';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PERIODS: { value: ReportPeriod; label: string; icon: string }[] = [
  { value: 'all_time', label: 'All Time', icon: 'infinity' },
  { value: 'weekly',   label: 'Weekly',   icon: 'calendar-week' },
  { value: 'monthly',  label: 'Monthly',  icon: 'calendar-month' },
  { value: 'yearly',   label: 'Yearly',   icon: 'calendar' },
  { value: 'custom',   label: 'Custom',   icon: 'calendar-range' },
];

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// Monday–Sunday range containing the given date
function getWeekRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay(); // 0 = Sunday
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  useAnimatedTabTitle(navigation, 'Stats');

  const { setPeriod: setGlobalPeriod, setTargetDate: setGlobalTargetDate } = useFilterStore();

  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [targetDate, setTargetDate] = useState(new Date());
  const [customFrom, setCustomFrom] = useState(() => toIso(getWeekRange(new Date()).start));
  const [customTo, setCustomTo] = useState(() => toIso(new Date()));
  const [summary, setSummary] = useState<TotalSummary>({
    gross_income: 0, net_income: 0, net_income_cash: 0, total_revenue: 0,
    total_expense: 0, total_paid: 0, unpaid_count: 0, unpaid_amount: 0, parts_purchase: 0,
  });
  const [loading, setLoading] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyRepairStat[]>([]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerRight: undefined } as any);
  }, [navigation]);

  const navigateDate = (dir: 1 | -1) => {
    setTargetDate(prev => {
      const d = new Date(prev);
      if (period === 'monthly') d.setMonth(d.getMonth() + dir);
      else if (period === 'yearly') d.setFullYear(d.getFullYear() + dir);
      else if (period === 'weekly') d.setDate(d.getDate() + dir * 7);
      setGlobalTargetDate(d);
      return d;
    });
  };

  const navLabel = () => {
    if (period === 'monthly') return targetDate.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    if (period === 'yearly') return String(targetDate.getFullYear());
    if (period === 'weekly') {
      const { start, end } = getWeekRange(targetDate);
      const fmt = (d: Date) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
    }
    return '';
  };

  const getDateRange = useCallback((): { dateFrom?: string; dateTo?: string } => {
    if (period === 'all_time') return {};
    if (period === 'custom') return { dateFrom: customFrom, dateTo: customTo };
    if (period === 'weekly') {
      const { start, end } = getWeekRange(targetDate);
      return { dateFrom: toIso(start), dateTo: toIso(end) };
    }
    if (period === 'monthly') {
      const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      return { dateFrom: toIso(start), dateTo: toIso(end) };
    }
    if (period === 'yearly') {
      const start = new Date(targetDate.getFullYear(), 0, 1);
      const end = new Date(targetDate.getFullYear(), 11, 31);
      return { dateFrom: toIso(start), dateTo: toIso(end) };
    }
    return { dateFrom: toIso(targetDate) };
  }, [period, targetDate, customFrom, customTo]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { dateFrom, dateTo } = getDateRange();

      const [s, daily] = await Promise.all([
        getTotalSummary(period, dateFrom, dateTo),
        getDailyRepairStats(),
      ]);
      setSummary(s);
      setDailyStats(daily);
      getSetting('shop_name').then(name => {
        navigation.setOptions({ title: name || 'GenTech Repairs Monitoring' } as any);
      }).catch(() => {});
    } catch (e) {
      console.warn('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, [period, targetDate, customFrom, customTo, getDateRange]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isPositive = summary.net_income >= 0;

  const goFinancialDetail = (kind: FinancialKind) => {
    const { dateFrom, dateTo } = getDateRange();
    navigation.navigate('FinancialDetail', { kind, period, targetDate: dateFrom, dateTo });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[Colors.primary]} />}
    >
      {/* ── PERIOD FILTER ─────────────────────────── */}
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
        {(period === 'monthly' || period === 'yearly' || period === 'weekly') && (
          <View style={styles.navRow}>
            <IconButton icon="chevron-left" size={20} iconColor={Colors.primary} onPress={() => navigateDate(-1)} />
            <Text style={styles.navLabel}>{navLabel()}</Text>
            <IconButton icon="chevron-right" size={20} iconColor={Colors.primary} onPress={() => navigateDate(1)} />
          </View>
        )}
        {period === 'custom' && (
          <View style={styles.customRow}>
            <View style={styles.customField}>
              <DatePickerField label="From" value={customFrom} onChange={setCustomFrom} maxDate={fromIso(customTo)} />
            </View>
            <View style={styles.customField}>
              <DatePickerField label="To" value={customTo} onChange={setCustomTo} minDate={fromIso(customFrom)} maxDate={new Date()} />
            </View>
          </View>
        )}
      </View>

      {/* ── NET INCOME ROW (side by side) ────────── */}
      {(() => {
        const cashPositive = summary.net_income_cash >= 0;
        return (
          <View style={styles.netIncomeRow}>
            <TouchableOpacity
              style={[styles.netIncomeCard, { borderLeftColor: isPositive ? Colors.success : Colors.error }]}
              activeOpacity={0.7}
              onPress={() => goFinancialDetail('net_income')}
            >
              <View style={[styles.netIncomeIcon, { backgroundColor: (isPositive ? Colors.success : Colors.error) + '18' }]}>
                <MaterialCommunityIcons name={isPositive ? 'trending-up' : 'trending-down'} size={18} color={isPositive ? Colors.success : Colors.error} />
              </View>
              <Text style={styles.netIncomeLabel}>Net Income</Text>
              <Text style={styles.netIncomeSub}>Gross − Expense</Text>
              <Text style={[styles.netIncomeAmount, { color: isPositive ? Colors.success : Colors.error }]}>
                {formatCurrency(summary.net_income)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.netIncomeCard, { borderLeftColor: cashPositive ? Colors.success : Colors.error }]}
              activeOpacity={0.7}
              onPress={() => goFinancialDetail('net_income_cash')}
            >
              <View style={[styles.netIncomeIcon, { backgroundColor: (cashPositive ? Colors.success : Colors.error) + '18' }]}>
                <MaterialCommunityIcons name={cashPositive ? 'cash-multiple' : 'cash-remove'} size={18} color={cashPositive ? Colors.success : Colors.error} />
              </View>
              <Text style={styles.netIncomeLabel}>Cash Net Income</Text>
              <Text style={styles.netIncomeSub}>Collected − Expense</Text>
              <Text style={[styles.netIncomeAmount, { color: cashPositive ? Colors.success : Colors.error }]}>
                {formatCurrency(summary.net_income_cash)}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* ── FINANCIAL METRICS 2×2 ─────────────────── */}
      <View style={styles.metricsGrid}>
        {[
          { label: 'Gross Income',   value: formatCurrency(summary.gross_income),  color: Colors.primary, icon: 'trending-up',   kind: 'gross_income' as FinancialKind },
          { label: 'Total Expense',  value: formatCurrency(summary.total_expense), color: Colors.error,   icon: 'trending-down', kind: null },
          { label: 'Total Paid',     value: formatCurrency(summary.total_paid),    color: Colors.success, icon: 'cash-check',    kind: 'total_paid' as FinancialKind },
          { label: 'For Collection', value: formatCurrency(summary.unpaid_amount), color: Colors.warning, icon: 'cash-clock',     kind: 'for_collection' as FinancialKind },
        ].map(m => (
          <TouchableOpacity
            key={m.label}
            style={[styles.metricCard, { borderTopColor: m.color }]}
            activeOpacity={0.7}
            onPress={() => {
              if (m.kind) { goFinancialDetail(m.kind); return; }
              const { dateFrom, dateTo } = getDateRange();
              navigation.navigate('ExpenseDetail', { period, targetDate: dateFrom, dateTo });
            }}
          >
            <View style={styles.metricTop}>
              <MaterialCommunityIcons name={m.icon as any} size={15} color={m.color} />
              <Text style={[styles.metricLabel, { color: m.color }]}>{m.label}</Text>
            </View>
            <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
            {(m as any).sub ? <Text style={styles.metricSub}>{(m as any).sub}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── STOCK PURCHASE CARD ──────────────────── */}
      <TouchableOpacity
        style={styles.stockCard}
        activeOpacity={0.7}
        onPress={() => {
          const { dateFrom, dateTo } = getDateRange();
          navigation.navigate('ExpenseDetail', { period, targetDate: dateFrom, dateTo });
        }}
      >
        <View style={[styles.stockIcon, { backgroundColor: Colors.primary + '18' }]}>
          <MaterialCommunityIcons name="package-variant" size={18} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.stockLabel}>Stock Purchase</Text>
          <Text style={styles.stockSub}>Parts restock for the period</Text>
        </View>
        <Text style={styles.stockAmount}>{formatCurrency(summary.parts_purchase)}</Text>
      </TouchableOpacity>

      {/* ── 7-DAY BAR CHART ──────────────────────── */}
      {dailyStats.length > 0 && (() => {
        const maxVal = Math.max(1, ...dailyStats.map(d => Math.max(d.recorded, d.delivered)));
        const BAR_MAX_H = 80;
        return (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Daily Repairs — Last 7 Days</Text>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.legendLabel}>Recorded</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.legendLabel}>Delivered</Text>
              </View>
            </View>
            <View style={styles.chartBars}>
              {dailyStats.map(d => {
                const recH = Math.max(2, Math.round((d.recorded / maxVal) * BAR_MAX_H));
                const delH = Math.max(2, Math.round((d.delivered / maxVal) * BAR_MAX_H));
                const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('en-PH', { weekday: 'short' });
                const dateLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('en-PH', { month: 'numeric', day: 'numeric' });
                return (
                  <View key={d.date} style={styles.chartBarGroup}>
                    <View style={styles.chartBarPair}>
                      <View style={styles.chartBarCol}>
                        {d.recorded > 0 && <Text style={styles.chartBarVal}>{d.recorded}</Text>}
                        <View style={[styles.chartBar, { height: recH, backgroundColor: Colors.primary }]} />
                      </View>
                      <View style={styles.chartBarCol}>
                        {d.delivered > 0 && <Text style={[styles.chartBarVal, { color: Colors.success }]}>{d.delivered}</Text>}
                        <View style={[styles.chartBar, { height: delH, backgroundColor: Colors.success }]} />
                      </View>
                    </View>
                    <Text style={styles.chartDayLabel}>{dayLabel}</Text>
                    <Text style={styles.chartDateLabel}>{dateLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })()}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  // ── Period filter
  filterPanel: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
  },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  periodChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#F2F4F7' },
  periodChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  periodChipLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: Colors.border },
  navLabel: { fontSize: 14, fontWeight: '700', color: Colors.text, minWidth: 160, textAlign: 'center' },
  customRow: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  customField: { flex: 1 },

  // ── Net income side-by-side row
  netIncomeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  netIncomeCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  netIncomeIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  netIncomeLabel: { fontSize: 12, fontWeight: '700', color: Colors.text, marginTop: 2 },
  netIncomeSub: { fontSize: 10, color: Colors.textSecondary, marginTop: 1, marginBottom: 6 },
  netIncomeAmount: { fontSize: 18, fontWeight: '800' },

  // ── Financial metrics 2×2
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

  // ── Bar chart
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  chartLegend: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 110,
  },
  chartBarGroup: { flex: 1, alignItems: 'center' },
  chartBarPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginBottom: 4 },
  chartBarCol: { alignItems: 'center' },
  chartBar: { width: 10, borderRadius: 4, minHeight: 2 },
  chartBarVal: { fontSize: 9, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
  chartDayLabel: { fontSize: 10, fontWeight: '700', color: Colors.text, marginTop: 4 },
  chartDateLabel: { fontSize: 9, color: Colors.textSecondary, marginTop: 1 },

  // ── Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },

  // ── Stock purchase card
  stockCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  stockIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockLabel: { fontSize: 13, fontWeight: '700', color: Colors.text },
  stockSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  stockAmount: { fontSize: 16, fontWeight: '800', color: Colors.primary },

});
