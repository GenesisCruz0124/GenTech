import React, { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Avatar, List, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useStaffStore } from '../../store/staffStore';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';

export default function StaffPerformanceScreen() {
  const { performance, fetchPerformance } = useStaffStore();

  useFocusEffect(useCallback(() => { fetchPerformance(); }, []));

  return (
    <FlatList
      style={styles.container}
      data={performance}
      keyExtractor={s => String(s.id)}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Avatar.Text size={44} label={item.name.charAt(0)} style={styles.avatar} labelStyle={{ fontSize: 18 }} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.role}>{item.role ?? 'Technician'}</Text>
            </View>
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{item.total_repairs}</Text>
              <Text style={styles.statLabel}>Total Jobs</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: Colors.success }]}>{item.delivered_repairs}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{item.avg_hours != null ? `${item.avg_hours.toFixed(1)}h` : '—'}</Text>
              <Text style={styles.statLabel}>Avg Time</Text>
            </View>
          </View>
        </View>
      )}
      ListEmptyComponent={<EmptyState icon="account-hard-hat" title="No staff data yet" subtitle="Add staff and assign repairs to see performance metrics" />}
      contentContainerStyle={performance.length === 0 ? styles.empty : styles.list}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { backgroundColor: Colors.surface, borderRadius: 10, margin: 12, marginBottom: 4, padding: 16, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { backgroundColor: Colors.secondary },
  info: { marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.text },
  role: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: 'bold', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  list: { paddingBottom: 16 },
  empty: { flex: 1 },
});
