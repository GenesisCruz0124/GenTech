import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { getSetting } from '../../repositories/settingsRepository';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useRepairStore } from '../../store/repairStore';
import StatCard from '../../components/common/StatCard';
import RepairCard from '../../components/repairs/RepairCard';
import { Colors } from '../../constants/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { repairs, statusCounts, notPaidCount, fetchRepairs, fetchStatusCounts } = useRepairStore();

  useFocusEffect(
    useCallback(() => {
      fetchStatusCounts();
      fetchRepairs({ limit: 5 });
      getSetting('shop_name').then(name => {
        const title = name || 'Repair Tracker';
        navigation.setOptions({ title } as any);
      });
    }, [])
  );

  const recentRepairs = repairs.slice(0, 5);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Stat cards */}
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard label="Pending" count={statusCounts.pending} color={Colors.pending}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Repairs', params: { initialFilter: 'pending' } } as any)} />
          <StatCard label="In Progress" count={statusCounts.in_progress} color={Colors.in_progress}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Repairs', params: { initialFilter: 'in_progress' } } as any)} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Ready to Pickup" count={statusCounts.ready} color={Colors.ready}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Repairs', params: { initialFilter: 'ready' } } as any)} />
          <StatCard label="Delivered" count={statusCounts.delivered} color={Colors.delivered}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Repairs', params: { initialFilter: 'delivered' } } as any)} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Not Repaired" count={statusCounts.not_repaired ?? 0} color={Colors.error}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Repairs', params: { initialFilter: 'not_repaired' } } as any)} />
          <StatCard label="Not Paid" count={notPaidCount} color={Colors.warning}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Repairs', params: { initialFilter: 'not_paid' } } as any)} />
        </View>
      </View>

      {/* Recent repairs */}
      <Text style={styles.sectionTitle}>Recent Repairs</Text>
      {recentRepairs.length === 0 ? (
        <Text style={styles.empty}>No repairs yet. Tap the Repairs tab to create one.</Text>
      ) : (
        recentRepairs.map(repair => (
          <RepairCard
            key={repair.id}
            repair={repair}
            onPress={() => navigation.navigate('RepairDetail', { repairId: repair.id })}
          />
        ))
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 16 },
  statsGrid: { gap: 0 },
  statsRow: { flexDirection: 'row', gap: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 20, marginBottom: 10 },
  empty: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 16 },
});
