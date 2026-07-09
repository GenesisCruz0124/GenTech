import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { FAB, IconButton, Searchbar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DatePickerField from '../../components/common/DatePickerField';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAnimatedTabTitle } from '../../hooks/useAnimatedTabTitle';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useRepairStore, consumeRepairJustCreated, consumePendingDashboardFilter } from '../../store/repairStore';
import RepairCard from '../../components/repairs/RepairCard';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';
import { RepairStatus } from '../../constants/statusOptions';
import { ReportPeriod } from '../../repositories/reportsRepository';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type FilterValue = RepairStatus | '' | 'not_paid';

type SortBy = 'newest' | 'oldest' | 'status' | 'customer';

const PERIODS: { value: ReportPeriod; label: string; icon: string }[] = [
  { value: 'all_time', label: 'All Time', icon: 'infinity' },
  { value: 'weekly',   label: 'Weekly',   icon: 'calendar-week' },
  { value: 'monthly',  label: 'Monthly',  icon: 'calendar-month' },
  { value: 'yearly',   label: 'Yearly',   icon: 'calendar' },
  { value: 'custom',   label: 'Custom',   icon: 'calendar-range' },
];

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fromIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function getWeekRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const start = new Date(date); start.setDate(date.getDate() + diffToMonday);
  const end = new Date(start);   end.setDate(start.getDate() + 6);
  return { start, end };
}

const SORT_OPTIONS: { value: SortBy; label: string; icon: string }[] = [
  { value: 'newest',   label: 'Newest First', icon: 'sort-calendar-descending' },
  { value: 'oldest',   label: 'Oldest First', icon: 'sort-calendar-ascending' },
  { value: 'status',   label: 'Status',       icon: 'sort-variant' },
  { value: 'customer', label: 'Customer Name', icon: 'sort-alphabetical-ascending' },
];

const STATUS_SORT_ORDER: Record<RepairStatus, number> = {
  pending: 0,
  in_progress: 1,
  ready: 2,
  delivered: 3,
  not_repaired: 4,
};


const hdrBtn: any = { padding: 5, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)' };
const hdrBtnActive: any = { backgroundColor: 'rgba(255,255,255,0.4)' };


export default function RepairsListScreen() {
  const navigation = useNavigation<Nav>();
  const { repairs, isLoading, statusCounts, notPaidCount, fetchRepairs, fetchStatusCounts, advanceStatus } = useRepairStore();
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Set<FilterValue>>(new Set());
  const [selectedStatus, setSelectedStatus] = useState<RepairStatus | 'not_paid' | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [targetDate, setTargetDate] = useState(new Date());
  const [customFrom, setCustomFrom] = useState(() => toIso(getWeekRange(new Date()).start));
  const [customTo, setCustomTo] = useState(() => toIso(new Date()));
  const [searchVisible, setSearchVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  useAnimatedTabTitle(navigation, 'Repairs');

  const sortedRepairs = useMemo(() => {
    const list = [...repairs];
    switch (sortBy) {
      case 'oldest':
        return list.sort((a, b) => a.id - b.id);
      case 'status':
        return list.sort((a, b) => STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status] || b.id - a.id);
      case 'customer':
        return list.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
      case 'newest':
      default:
        return list.sort((a, b) => b.id - a.id);
    }
  }, [repairs, sortBy]);

  const getDateRange = useCallback((): { dateFrom?: string; dateTo?: string } => {
    if (period === 'all_time') return {};
    if (period === 'custom') return { dateFrom: customFrom, dateTo: customTo };
    if (period === 'weekly') {
      const { start, end } = getWeekRange(targetDate);
      return { dateFrom: toIso(start), dateTo: toIso(end) };
    }
    if (period === 'monthly') {
      const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const end   = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      return { dateFrom: toIso(start), dateTo: toIso(end) };
    }
    if (period === 'yearly') {
      return { dateFrom: `${targetDate.getFullYear()}-01-01`, dateTo: `${targetDate.getFullYear()}-12-31` };
    }
    return {};
  }, [period, targetDate, customFrom, customTo]);

  const navigateDate = (dir: 1 | -1) => {
    setTargetDate(prev => {
      const d = new Date(prev);
      if (period === 'monthly') d.setMonth(d.getMonth() + dir);
      else if (period === 'yearly') d.setFullYear(d.getFullYear() + dir);
      else if (period === 'weekly') d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };

  const navLabel = () => {
    if (period === 'monthly') return targetDate.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    if (period === 'yearly')  return String(targetDate.getFullYear());
    if (period === 'weekly') {
      const { start, end } = getWeekRange(targetDate);
      const fmt = (d: Date) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
    }
    return '';
  };

  const load = useCallback(() => {
    const { dateFrom, dateTo } = getDateRange();
    const opts: any = { search: search || undefined, dateFrom, dateTo };
    if (selectedStatus === 'not_paid') opts.not_paid = true;
    else if (selectedStatus) opts.status = selectedStatus;
    fetchRepairs(opts);
    fetchStatusCounts(dateFrom, dateTo);
  }, [search, getDateRange, selectedStatus]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 8, gap: 4 }}>
          <TouchableOpacity style={hdrBtn} onPress={() => setSearchVisible(v => !v)}>
            <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[hdrBtn, sortVisible && hdrBtnActive]}
            onPress={() => setSortVisible(v => !v)}
          >
            <MaterialCommunityIcons name="sort" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, searchVisible, sortVisible]);

  // Keep a ref to the latest load so useFocusEffect (empty deps) can call it
  // without re-registering the focus listener on every filter/search change.
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);

  // Blocks useEffect([load]) once after setSelectedFilters is called from
  // within useFocusEffect, preventing a second unfiltered fetch.
  const skipNextLoadEffect = useRef(false);

  // Fires on every focus event. Dashboard sets a module-level pending filter
  // BEFORE calling navigate(), so it is always populated by the time this runs —
  // no race condition with params effects or renders.
  useFocusEffect(useCallback(() => {
    const pending = consumePendingDashboardFilter();
    if (pending) {
      skipNextLoadEffect.current = true;
      const incoming = pending.filter as FilterValue;
      if (incoming === '') {
        setSelectedFilters(new Set());
        setSelectedStatus(null);
        fetchRepairs({ dateFrom: pending.dateFrom, dateTo: pending.dateTo }, { clearFirst: true });
      } else if (incoming === 'not_paid') {
        setSelectedFilters(new Set([incoming]));
        setSelectedStatus('not_paid');
        fetchRepairs({ not_paid: true, dateFrom: pending.dateFrom, dateTo: pending.dateTo }, { clearFirst: true });
      } else {
        setSelectedFilters(new Set([incoming]));
        setSelectedStatus(incoming as RepairStatus);
        fetchRepairs({ status: incoming as RepairStatus, dateFrom: pending.dateFrom, dateTo: pending.dateTo }, { clearFirst: true });
      }
      fetchStatusCounts(pending.dateFrom, pending.dateTo);
      return;
    }
    if (consumeRepairJustCreated()) {
      setSelectedFilters(new Set());
      setSelectedStatus(null);
      fetchRepairs({});
      return;
    }
    loadRef.current();
  }, []));

  // Reload when filters/search/dateRange change interactively — skipped once
  // after useFocusEffect applies a dashboard filter (so setSelectedFilters
  // changing load's reference doesn't trigger a second unfiltered fetch).
  useEffect(() => {
    if (skipNextLoadEffect.current) {
      skipNextLoadEffect.current = false;
      return;
    }
    load();
  }, [load]);

  const totalRepairs =
    (statusCounts.pending ?? 0) +
    (statusCounts.in_progress ?? 0) +
    (statusCounts.ready ?? 0) +
    (statusCounts.delivered ?? 0) +
    (statusCounts.not_repaired ?? 0);

  const handleTilePress = (status: RepairStatus | 'not_paid' | null) => {
    setSelectedStatus(prev => prev === status ? null : status);
  };

  const tilesHeader = (
    <View style={styles.tilesContainer}>
      <TouchableOpacity
        style={[styles.totalTile, selectedStatus !== null && { opacity: 0.65 }]}
        activeOpacity={0.85}
        onPress={() => setSelectedStatus(null)}
      >
        <MaterialCommunityIcons name="wrench-clock" size={20} color="#fff" />
        <Text style={styles.totalCount}>{totalRepairs}</Text>
        <Text style={styles.totalLabel}>Total Repairs</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(255,255,255,0.6)" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
      <View style={styles.tileRow}>
        <StatTile label="Pending"      count={statusCounts.pending ?? 0}      color="#FF6F00"              icon="clock-outline"        selected={selectedStatus === 'pending'}      onPress={() => handleTilePress('pending')} />
        <StatTile label="In Progress"  count={statusCounts.in_progress ?? 0}  color={Colors.primary}       icon="wrench"               selected={selectedStatus === 'in_progress'}  onPress={() => handleTilePress('in_progress')} />
        <StatTile label="Ready"        count={statusCounts.ready ?? 0}        color={Colors.success}       icon="check-circle-outline" selected={selectedStatus === 'ready'}        onPress={() => handleTilePress('ready')} />
      </View>
      <View style={styles.tileRow}>
        <StatTile label="Delivered"    count={statusCounts.delivered ?? 0}    color={Colors.textSecondary} icon="package-check"        selected={selectedStatus === 'delivered'}    onPress={() => handleTilePress('delivered')} />
        <StatTile label="Not Repaired" count={statusCounts.not_repaired ?? 0} color={Colors.error}         icon="close-circle-outline" selected={selectedStatus === 'not_repaired'} onPress={() => handleTilePress('not_repaired')} />
        <StatTile label="Not Paid"     count={notPaidCount}                   color={Colors.warning}       icon="cash-remove"          selected={selectedStatus === 'not_paid'}    onPress={() => handleTilePress('not_paid')} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Search bar (expandable) */}
      {searchVisible && (
        <Searchbar
          placeholder="Search repairs..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          style={styles.searchBar}
          inputStyle={{ fontSize: 14 }}
          autoFocus
          onIconPress={() => { setSearch(''); setSearchVisible(false); }}
          icon="arrow-left"
        />
      )}


      {/* Period filter — always visible */}
      <View style={styles.filterPanel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {PERIODS.map(p => {
            const active = period === p.value;
            return (
              <TouchableOpacity key={p.value}
                style={[styles.periodChip, active && styles.periodChipActive]}
                onPress={() => { setPeriod(p.value); setTargetDate(new Date()); }}
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

      {/* Sort options */}
      {sortVisible && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          {SORT_OPTIONS.map(opt => {
            const active = sortBy === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, styles.sortChip, active && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
                onPress={() => setSortBy(opt.value)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name={opt.icon as any} size={14} color={active ? '#fff' : Colors.textSecondary} />
                <Text style={[styles.chipLabel, active && { color: '#fff' }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* List */}
      <FlatList
        data={sortedRepairs}
        keyExtractor={r => String(r.id)}
        ListHeaderComponent={tilesHeader}
        renderItem={({ item }) => (
          <RepairCard
            repair={item}
            onPress={() => navigation.navigate('RepairDetail', { repairId: item.id })}
            onAdvanceStatus={async (id, next) => { await advanceStatus(id, next); load(); }}
          />
        )}
        ListEmptyComponent={
          search ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <MaterialCommunityIcons name="filter-off-outline" size={56} color={Colors.border} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.textSecondary, marginTop: 12 }}>No repairs match the search</Text>
              <TouchableOpacity
                style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 9, borderRadius: 20, backgroundColor: Colors.primary }}
                onPress={() => { setSearch(''); setSearchVisible(false); }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Clear Search</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyState icon="wrench-outline" title="No repairs found" subtitle="Tap + to create a new repair" />
          )
        }
        refreshing={false}
        onRefresh={load}
        contentContainerStyle={repairs.length === 0 ? styles.emptyContainer : styles.list}
      />

      <FAB icon="plus" label="New Repair" style={styles.fab} onPress={() => navigation.navigate('NewRepair')} color="#fff" />
    </View>
  );
}

function StatTile({ label, count, color, icon, selected, onPress }: { label: string; count: number; color: string; icon: string; selected?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.statTile, { borderTopColor: color }, selected && { borderWidth: 2, borderTopWidth: 3, borderColor: color, backgroundColor: color + '18' }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <MaterialCommunityIcons name={icon as any} size={22} color={color} style={styles.statIcon} />
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  searchBar: { margin: 8, backgroundColor: Colors.background, elevation: 0, borderRadius: 10 },

  // Date range
  dateRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  dateChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dateChipLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  dateChipLabelActive: { color: '#fff' },

  // Period filter panel — matches Stats card style
  filterPanel: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  periodChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  periodChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  periodChipLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: Colors.border },
  navLabel: { fontSize: 14, fontWeight: '700', color: Colors.text, minWidth: 160, textAlign: 'center' },
  customRow: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  customField: { flex: 1 },
  // Sort / search chips
  filterScroll: { flexGrow: 0, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    minHeight: 32,
  },
  chipLabel: { fontSize: 12, color: Colors.text, fontWeight: '600' },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  filterBadge: { position: 'absolute', top: -4, right: -5, backgroundColor: Colors.warning, borderRadius: 7, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },

  // Tiles section
  tilesContainer: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4, gap: 8 },
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

  list: { paddingBottom: 100 },
  emptyContainer: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: Colors.primary },
});
