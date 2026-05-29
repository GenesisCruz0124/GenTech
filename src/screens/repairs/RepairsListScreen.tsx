import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { FAB, Searchbar, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useRepairStore } from '../../store/repairStore';
import RepairCard from '../../components/repairs/RepairCard';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';
import { RepairStatus } from '../../constants/statusOptions';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Done' },
];

export default function RepairsListScreen() {
  const navigation = useNavigation<Nav>();
  const { repairs, isLoading, fetchRepairs } = useRepairStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(() => {
    fetchRepairs({
      status: (statusFilter as RepairStatus) || undefined,
      search: search || undefined,
    });
  }, [statusFilter, search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search by name, device, phone..."
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={load}
        style={styles.search}
      />
      <FlatList
        data={STATUS_FILTERS.slice(0, 4)}
        horizontal
        keyExtractor={i => i.value}
        renderItem={({ item }) => null}
        ListHeaderComponent={
          <View style={styles.filterRow}>
            {STATUS_FILTERS.map(f => (
              <View key={f.value} style={[styles.chip, statusFilter === f.value && styles.chipActive]}>
                <FAB
                  size="small"
                  label={f.label}
                  style={[styles.chipBtn, statusFilter === f.value && { backgroundColor: Colors.primary }]}
                  color={statusFilter === f.value ? '#fff' : Colors.text}
                  onPress={() => setStatusFilter(f.value)}
                />
              </View>
            ))}
          </View>
        }
        style={{ flexGrow: 0 }}
      />
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
  search: { margin: 12, borderRadius: 8 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 8, gap: 6 },
  chip: {},
  chipActive: {},
  chipBtn: { backgroundColor: Colors.surface, elevation: 0 },
  list: { paddingBottom: 80 },
  empty: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: Colors.primary },
});
