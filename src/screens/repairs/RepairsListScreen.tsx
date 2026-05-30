import React, { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { FAB, Searchbar, Text } from 'react-native-paper';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../../navigation/types';
import { useRepairStore } from '../../store/repairStore';
import RepairCard from '../../components/repairs/RepairCard';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';
import { RepairStatus } from '../../constants/statusOptions';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RepairsRoute = RouteProp<TabParamList, 'Repairs'>;

type FilterValue = RepairStatus | '' | 'not_paid';

const STATUS_FILTERS: { value: FilterValue; label: string; color?: string }[] = [
  { value: '',             label: 'All' },
  { value: 'pending',      label: 'Pending' },
  { value: 'in_progress',  label: 'In Progress' },
  { value: 'ready',        label: 'Ready' },
  { value: 'delivered',    label: 'Delivered' },
  { value: 'not_repaired', label: 'Not Repaired', color: Colors.error },
  { value: 'not_paid',     label: 'Not Paid',     color: Colors.warning },
];

export default function RepairsListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RepairsRoute>();
  const { repairs, isLoading, fetchRepairs } = useRepairStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('');

  const load = useCallback(() => {
    if (filter === 'not_paid') {
      fetchRepairs({ not_paid: true, search: search || undefined });
    } else {
      fetchRepairs({
        status: (filter as RepairStatus) || undefined,
        search: search || undefined,
      });
    }
  }, [filter, search]);

  useFocusEffect(useCallback(() => {
    const incoming = route.params?.initialFilter as FilterValue | undefined;
    if (incoming && incoming !== filter) {
      setFilter(incoming);
    } else {
      load();
    }
  }, [route.params]));

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search by name, device, phone..."
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={load}
        style={styles.search}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {STATUS_FILTERS.map(f => {
          const active = filter === f.value;
          const activeColor = f.color ?? Colors.primary;
          return (
            <TouchableOpacity
              key={f.value}
              style={[styles.chip, active && { backgroundColor: activeColor, borderColor: activeColor }]}
              onPress={() => setFilter(f.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipLabel, active && { color: '#fff' }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={repairs}
        keyExtractor={r => String(r.id)}
        renderItem={({ item }) => (
          <RepairCard repair={item} onPress={() => navigation.navigate('RepairDetail', { repairId: item.id })} />
        )}
        ListEmptyComponent={<EmptyState icon="wrench" title="No repairs found" subtitle="Tap + to create a new repair" />}
        refreshing={isLoading}
        onRefresh={load}
        contentContainerStyle={repairs.length === 0 ? styles.empty : styles.list}
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('NewRepair')}
        color="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  search: { margin: 12, marginBottom: 6, borderRadius: 8 },
  filterScroll: { flexGrow: 0 },
  filterRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipLabel: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  list: { paddingBottom: 80 },
  empty: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: Colors.primary },
});
