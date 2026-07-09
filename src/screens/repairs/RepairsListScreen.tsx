import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { FAB, Searchbar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAnimatedTabTitle } from '../../hooks/useAnimatedTabTitle';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useRepairStore, consumeRepairJustCreated, consumePendingDashboardFilter } from '../../store/repairStore';
import RepairCard from '../../components/repairs/RepairCard';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';
import { RepairStatus, STATUS_COLORS } from '../../constants/statusOptions';
import { formatCurrency } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type FilterValue = RepairStatus | '' | 'not_paid';
type DateRange = 'all' | 'today' | 'week' | 'month';

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: 'all',   label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week',  label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

type SortBy = 'newest' | 'oldest' | 'status' | 'customer';

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

const STATUS_FILTERS: { value: FilterValue; label: string; color?: string }[] = [
  { value: '',             label: 'All' },
  { value: 'pending',      label: 'Pending',      color: STATUS_COLORS.pending },
  { value: 'in_progress',  label: 'In Progress',  color: STATUS_COLORS.in_progress },
  { value: 'ready',        label: 'Ready',        color: STATUS_COLORS.ready },
  { value: 'delivered',    label: 'Delivered',    color: STATUS_COLORS.delivered },
  { value: 'not_repaired', label: 'Not Repaired', color: Colors.error },
  { value: 'not_paid',     label: 'Not Paid',     color: Colors.warning },
];

function getDateFrom(range: DateRange): string | undefined {
  if (range === 'all') return undefined;
  const now = new Date();
  if (range === 'today') {
    return now.toISOString().split('T')[0];
  }
  if (range === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  }
  if (range === 'month') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }
}

const hdrBtn: any = { padding: 5, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)' };
const hdrBtnActive: any = { backgroundColor: 'rgba(255,255,255,0.4)' };


export default function RepairsListScreen() {
  const navigation = useNavigation<Nav>();
  const { repairs, isLoading, statusCounts, notPaidCount, fetchRepairs, advanceStatus } = useRepairStore();
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Set<FilterValue>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange>('month');
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

  const toggleFilter = (value: FilterValue) => {
    if (value === '') {
      // "All" clears everything
      setSelectedFilters(new Set());
      return;
    }
    setSelectedFilters(prev => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const load = useCallback(() => {
    // Repairs list uses only its own local date range — never the dashboard's global period filter
    const dateFrom = getDateFrom(dateRange);

    const hasNotPaid = selectedFilters.has('not_paid');
    const statusList = [...selectedFilters].filter(f => f !== 'not_paid') as RepairStatus[];

    if (hasNotPaid && statusList.length === 0) {
      // Only "Not Paid" selected
      fetchRepairs({ not_paid: true, search: search || undefined });
    } else if (hasNotPaid && statusList.length > 0) {
      // Mix: fetch the statuses + a separate not_paid — just fetch all & let the chips show intent
      fetchRepairs({ statuses: statusList, not_paid: true, search: search || undefined, dateFrom });
    } else if (statusList.length === 1) {
      fetchRepairs({ status: statusList[0], search: search || undefined, dateFrom });
    } else if (statusList.length > 1) {
      fetchRepairs({ statuses: statusList, search: search || undefined, dateFrom });
    } else {
      // Nothing selected = All
      fetchRepairs({ search: search || undefined, dateFrom });
    }
  }, [selectedFilters, search, dateRange]);

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
        fetchRepairs({ dateFrom: pending.dateFrom, dateTo: pending.dateTo }, { clearFirst: true });
      } else if (incoming === 'not_paid') {
        setSelectedFilters(new Set([incoming]));
        fetchRepairs({ not_paid: true, dateFrom: pending.dateFrom, dateTo: pending.dateTo }, { clearFirst: true });
      } else {
        setSelectedFilters(new Set([incoming]));
        fetchRepairs({ status: incoming as RepairStatus, dateFrom: pending.dateFrom, dateTo: pending.dateTo }, { clearFirst: true });
      }
      return;
    }
    if (consumeRepairJustCreated()) {
      setSelectedFilters(new Set());
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
        ListHeaderComponent={sortedRepairs.length > 0 ? (() => {
          const totalAmt  = sortedRepairs.reduce((s, r) => s + (r.final_cost ?? r.estimated_cost), 0);
          const activeCount = sortedRepairs.filter(r => r.status === 'pending' || r.status === 'in_progress').length;
          const unpaidCount = sortedRepairs.filter(r => r.is_paid === 0 && r.status !== 'not_repaired').length;
          return (
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryVal}>{sortedRepairs.length}</Text>
                <Text style={styles.summaryLbl}>Total</Text>
              </View>
              <View style={styles.summarySep} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryVal, activeCount > 0 && styles.summaryValWarn]}>{activeCount}</Text>
                <Text style={styles.summaryLbl}>Active</Text>
              </View>
              <View style={styles.summarySep} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryVal, unpaidCount > 0 && styles.summaryValErr]}>{unpaidCount}</Text>
                <Text style={styles.summaryLbl}>Unpaid</Text>
              </View>
              <View style={styles.summarySep} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryVal}>{formatCurrency(totalAmt)}</Text>
                <Text style={styles.summaryLbl}>Amount</Text>
              </View>
            </View>
          );
        })() : null}
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

  // Status filter chips
  filterScroll: { flexGrow: 0, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 7, alignItems: 'center' },
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

  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  summaryValWarn: { color: Colors.warning },
  summaryValErr: { color: Colors.error },
  summaryLbl: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },
  summarySep: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  list: { paddingBottom: 100 },
  emptyContainer: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: Colors.primary },
});
