import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { FAB, Searchbar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAnimatedTabTitle } from '../../hooks/useAnimatedTabTitle';
import { useFilterStore } from '../../store/filterStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../../navigation/types';
import { useRepairStore, consumeRepairJustCreated } from '../../store/repairStore';
import RepairCard from '../../components/repairs/RepairCard';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';
import { RepairStatus, STATUS_COLORS } from '../../constants/statusOptions';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RepairsRoute = RouteProp<TabParamList, 'Repairs'>;

type FilterValue = RepairStatus | '' | 'not_paid';
type DateRange = 'all' | 'today' | 'week' | 'month';

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: 'all',   label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week',  label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

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
  const route = useRoute<RepairsRoute>();
  const { repairs, isLoading, statusCounts, notPaidCount, fetchRepairs, advanceStatus } = useRepairStore();
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Set<FilterValue>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [searchVisible, setSearchVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  useAnimatedTabTitle(navigation, 'Repairs');
  const { getTargetDateIso: _getTargetDateIso } = useFilterStore(); // kept for import but not used in repairs list

  const hasFilters = selectedFilters.size > 0;

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
          <TouchableOpacity
            style={[hdrBtn, filterVisible && hasFilters && hdrBtnActive]}
            onPress={() => setFilterVisible(v => !v)}
          >
            <View>
              <MaterialCommunityIcons name="filter-variant" size={20} color="#fff" />
              {hasFilters && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{selectedFilters.size}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={hdrBtn} onPress={() => setSearchVisible(v => !v)}>
            <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, filterVisible, selectedFilters, searchVisible]);

  // Skip flag: when arriving from dashboard, skip the stale useFocusEffect load
  const skipNextFocusLoad = useRef(false);

  // Apply filter from dashboard navigation — update chips AND immediately fetch
  useEffect(() => {
    const incoming = route.params?.initialFilter as FilterValue | undefined;
    if (!incoming) return;
    skipNextFocusLoad.current = true;
    setSelectedFilters(new Set([incoming as FilterValue]));
    if (incoming === 'not_paid') {
      fetchRepairs({ not_paid: true });
    } else {
      fetchRepairs({ status: incoming as RepairStatus });
    }
  }, [route.params?.initialFilter]);

  // Reload on focus — clears stale filters if a repair was just created
  useFocusEffect(useCallback(() => {
    if (skipNextFocusLoad.current) {
      skipNextFocusLoad.current = false;
      return;
    }
    if (consumeRepairJustCreated()) {
      // A repair was just created — clear any active filters so it's always visible
      setSelectedFilters(new Set());
      fetchRepairs({});
      return;
    }
    load();
  }, [load]));

  useEffect(() => { load(); }, [load]);

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


      {/* Status filter chips */}
      {filterVisible && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTERS.map(f => {
            const isAll = f.value === '';
            const active = isAll ? !hasFilters : selectedFilters.has(f.value);
            const accentColor = f.color ?? Colors.primary;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.chip, active && { backgroundColor: accentColor, borderColor: accentColor }]}
                onPress={() => toggleFilter(f.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipLabel, active && { color: '#fff' }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* List */}
      <FlatList
        data={repairs}
        keyExtractor={r => String(r.id)}
        renderItem={({ item }) => (
          <RepairCard
            repair={item}
            onPress={() => navigation.navigate('RepairDetail', { repairId: item.id })}
            onAdvanceStatus={async (id, next) => { await advanceStatus(id, next); }}
          />
        )}
        ListEmptyComponent={
          hasFilters || search ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <MaterialCommunityIcons name="filter-off-outline" size={56} color={Colors.border} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.textSecondary, marginTop: 12 }}>No repairs match the filter</Text>
              <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 }}>Try clearing the filter to see all repairs</Text>
              <TouchableOpacity
                style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 9, borderRadius: 20, backgroundColor: Colors.primary }}
                onPress={() => { setSelectedFilters(new Set()); setSearch(''); setSearchVisible(false); }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Clear Filter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyState icon="wrench-outline" title="No repairs found" subtitle="Tap + to create a new repair" />
          )
        }
        refreshing={isLoading}
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
  filterBadge: { position: 'absolute', top: -4, right: -5, backgroundColor: Colors.warning, borderRadius: 7, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },

  list: { paddingBottom: 100 },
  emptyContainer: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: Colors.primary },
});
