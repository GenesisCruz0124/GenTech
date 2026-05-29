import React, { useCallback } from 'react';
import { FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useRepairStore } from '../../store/repairStore';
import StatCard from '../../components/common/StatCard';
import RepairCard from '../../components/repairs/RepairCard';
import { Colors } from '../../constants/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const QUICK_ACTIONS = [
  { label: 'Create Invoice', icon: 'receipt', screen: 'InvoiceHistory' },
  { label: 'Customers', icon: 'account-group', screen: 'CustomerList' },
  { label: 'Staff', icon: 'account-hard-hat', screen: 'StaffList' },
  { label: 'Inventory', icon: 'package-variant', screen: 'Parts' },
];

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { repairs, statusCounts, fetchRepairs, fetchStatusCounts } = useRepairStore();

  useFocusEffect(
    useCallback(() => {
      fetchStatusCounts();
      fetchRepairs({ limit: 5 });
    }, [])
  );

  const recentRepairs = repairs.slice(0, 5);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Stat cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard label="Pending" count={statusCounts.pending} color={Colors.pending} onPress={() => navigation.navigate('MainTabs' as any)} />
          <StatCard label="In Progress" count={statusCounts.in_progress} color={Colors.in_progress} onPress={() => navigation.navigate('MainTabs' as any)} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Ready to Pickup" count={statusCounts.ready} color={Colors.ready} onPress={() => navigation.navigate('MainTabs' as any)} />
          <StatCard label="Delivered" count={statusCounts.delivered} color={Colors.delivered} onPress={() => navigation.navigate('MainTabs' as any)} />
        </View>
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        {QUICK_ACTIONS.map(action => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionBtn}
            onPress={() => {
              if (action.screen === 'Parts') {
                navigation.navigate('MainTabs', { screen: 'Parts' } as any);
              } else if (action.screen) {
                navigation.navigate(action.screen as any);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <MaterialCommunityIcons name={action.icon as any} size={24} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.primary, marginBottom: 16 },
  statsGrid: { gap: 0 },
  statsRow: { flexDirection: 'row', gap: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 20, marginBottom: 10 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  actionBtn: { flex: 1, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, padding: 12, elevation: 1 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionLabel: { fontSize: 11, color: Colors.text, textAlign: 'center', fontWeight: '500' },
  empty: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 16 },
});
