import React, { useCallback, useLayoutEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAnimatedTabTitle } from '../../hooks/useAnimatedTabTitle';
import { useFilterStore } from '../../store/filterStore';
import { useRepairStore } from '../../store/repairStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import {
  getTotalSummary,
  getDailyRepairStats,
  DailyRepairStat,
  ReportPeriod,
  TotalSummary,
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

function toIso(d: Date): string { return d.toISOString().split('T')[0]; }

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
  useAnimatedTabTitle(navigation, 'Dashboard');

  const { statusCounts, notPaidCount, fetchStatusCounts } = useRepairStore();
  const { setPeriod: setGlobalPeriod, setTargetDate: setGlobalTargetDate } = useFilterStore();

  const [period, setPeriod] = useState<ReportPeriod>('all_time');
  const [targetDate, setTargetDate] = useState(new Date());
  const [customFrom, setCustomFrom] = useState(() => toIso(getWeekRange(new Date()).start));
  const [customTo, setCustomTo] = useState(() => toIso(new Date()));
  const [summary, setSummary] = useState<TotalSummary>({
    gross_income: 0, net_income: 0, total_revenue: 0,
    total_expense: 0, total_paid: 0, unpaid_count: 0, unpaid_amount: 0,
  });
  const [filterVisible, setFilterVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyRepairStat[]>([]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ padding: 5, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', marginRight: 12 }}
          onPress={() => setFilterVisible(v => !v)}
        >
          <MaterialCommunityIcons name="filter-variant" size={20} color="#fff" />
        </TouchableOpacity>
      ),
    } as any);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let dateFrom: string | undefined;
      let dateTo: string | undefined;
      if (period === 'all_time') {
        dateFrom = undefined;
        dateTo = undefined;
      } else if (period === 'custom') {
        dateFrom = customFrom;
        dateTo = customTo;
      } else if (period === 'weekly') {
        const { start, end } = getWeekRange(targetDate);
        dateFrom = toIso(start);
        dateTo = toIso(end);
      } else {
        dateFrom = toIso(targetDate);
      }

      const [s, daily] = await Promise.all([
        getTotalSummary(period, dateFrom, dateTo),
        getDailyRepairStats(),
        fetchStatusCounts(dateFrom, dateTo),
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
  }, [period, targetDate, customFrom, customTo]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isPositive = summary.net_income >= 0;
  const totalRepairs =
    (statusCounts.pending ?? 0) +
    (statusCounts.in_progress ?? 0) +
    (statusCounts.ready ?? 0) +
    (statusCounts.delivered ?? 0) +
    (statusCounts.not_repaired ?? 0);

  const goRepairs = (filter: string) =>
    navigation.navigate('MainTabs', { screen: 'Repairs', params: { initialFilter: filter } } as any);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[Colors.primary]} />}
    >
      {/* ── PERIOD FILTER ─────────────────────────── */}
      {filterVisible && (
        <View style={styles.filterPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {PERIODS.map(p => {
              const active = period === p.value;
              return (
                <TouchableOpacity key={p.value}
                  style={[styles.periodChip, active && styles.periodChipActive]}
                  onPress={() => {
                    setPeriod(p.value);
                    setTargetDate(new Date());
                    setGlobalPeriod(p.value);
                    setGlobalTargetDate(new Date());
                  }}
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
                <DatePickerField
                  label="From"
                  value={customFrom}
                  onChange={setCustomFrom}
                  maxDate={fromIso(customTo)}
                />
              </View>
              <View style={styles.customField}>
                <DatePickerField
                  label="To"
                  value={customTo}
                  onChange={setCustomTo}
                  minDate={fromIso(customFrom)}
                  maxDate={new Date()}
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── NET INCOME ROW ────────────────────────── */}
      <View style={[styles.netIncomeRow, { borderLeftColor: isPositive ? Colors.success : Colors.error }]}>
        <View style={[styles.netIncomeIcon, { backgroundColor: (isPositive ? Colors.success : Colors.error) + '18' }]}>
          <MaterialCommunityIcons name={isPositive ? 'trending-up' : 'trending-down'} size={20} color={isPositive ? Colors.success : Colors.error} />
        </View>
        <View style={styles.netIncomeBody}>
          <Text style={styles.netIncomeLabel}>Net Income</Text>
          <Text style={styles.netIncomeSub}>Gross − Expense</Text>
        </View>
        <Text style={[styles.netIncomeAmount, { color: isPositive ? Colors.success : Colors.error }]}>
          {formatCurrency(summary.net_income)}
        </Text>
      </View>

      {/* ── FINANCIAL METRICS 2×2 ─────────────────── */}
      <View style={styles.metricsGrid}>
        {[
          { label: 'Gross Income',   value: formatCurrency(summary.gross_income),  color: Colors.primary, icon: 'trending-up' },
          { label: 'Total Expense',  value: formatCurrency(summary.total_expense), color: Colors.error,   icon: 'trending-down' },
          { label: 'Total Paid',     value: formatCurrency(summary.total_paid),    color: Colors.success, icon: 'cash-check' },
          { label: 'For Collection', value: formatCurrency(summary.unpaid_amount), color: Colors.warning, icon: 'cash-clock' },
        ].map(m => (
          <View key={m.label} style={[styles.metricCard, { borderTopColor: m.color }]}>
            <View style={styles.metricTop}>
              <MaterialCommunityIcons name={m.icon as any} size={15} color={m.color} />
              <Text style={[styles.metricLabel, { color: m.color }]}>{m.label}</Text>
            </View>
            <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
            {(m as any).sub ? <Text style={styles.metricSub}>{(m as any).sub}</Text> : null}
          </View>
        ))}
      </View>

      {/* ── REPAIR OVERVIEW ───────────────────────── */}
      <TouchableOpacity style={styles.totalTile} onPress={() => goRepairs('')} activeOpacity={0.85}>
        <MaterialCommunityIcons name="wrench-clock" size={20} color="#fff" />
        <Text style={styles.totalCount}>{totalRepairs}</Text>
        <Text style={styles.totalLabel}>Total Repairs</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(255,255,255,0.6)" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      <View style={styles.tileRow}>
        <StatTile label="Pending"     count={statusCounts.pending ?? 0}      color="#FF6F00"            icon="clock-outline"        onPress={() => goRepairs('pending')} />
        <StatTile label="In Progress" count={statusCounts.in_progress ?? 0}  color={Colors.primary}     icon="wrench"               onPress={() => goRepairs('in_progress')} />
        <StatTile label="Ready"       count={statusCounts.ready ?? 0}        color={Colors.success}     icon="check-circle-outline" onPress={() => goRepairs('ready')} />
      </View>
      <View style={styles.tileRow}>
        <StatTile label="Delivered"   count={statusCounts.delivered ?? 0}    color={Colors.textSecondary} icon="package-check"       onPress={() => goRepairs('delivered')} />
        <StatTile label="Not Repaired" count={statusCounts.not_repaired ?? 0} color={Colors.error}      icon="close-circle-outline" onPress={() => goRepairs('not_repaired')} />
        <StatTile label="Not Paid"    count={notPaidCount}                    color={Colors.warning}     icon="cash-remove"          onPress={() => goRepairs('not_paid')} />
      </View>

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

function StatTile({ label, count, color, icon, onPress }: { label: string; count: number; color: string; icon: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={[styles.statTile, { borderTopColor: color }]} onPress={onPress} activeOpacity={onPress ? 0.75 : 1}>
      <MaterialCommunityIcons name={icon as any} size={22} color={color} style={styles.statIcon} />
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
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

  // ── Net income compact row
  netIncomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    gap: 12,
  },
  netIncomeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  netIncomeBody: { flex: 1 },
  netIncomeLabel: { fontSize: 13, fontWeight: '700', color: Colors.text },
  netIncomeSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  netIncomeAmount: { fontSize: 22, fontWeight: '800' },

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

  // ── Total tile
  totalTile: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  totalCount: { fontSize: 28, fontWeight: '800', color: '#fff' },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500', flex: 1 },

  // ── Status tiles
  tileRow: { flexDirection: 'row', gap: 8 },
  statTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  statIcon: { marginBottom: 6 },
  statCount: { fontSize: 26, fontWeight: '800', lineHeight: 30 },
  statLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 3, textAlign: 'center', fontWeight: '500' },
});
