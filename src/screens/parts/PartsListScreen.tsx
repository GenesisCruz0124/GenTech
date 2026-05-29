import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { FAB, List, Text, Badge } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { usePartsStore } from '../../store/partsStore';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';
import { formatCurrency } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PartsListScreen() {
  const navigation = useNavigation<Nav>();
  const { parts, isLoading, fetchParts } = usePartsStore();

  useFocusEffect(useCallback(() => { fetchParts(); }, []));

  return (
    <View style={styles.container}>
      <FlatList
        data={parts}
        keyExtractor={p => String(p.id)}
        renderItem={({ item }) => {
          const isLow = item.quantity <= item.low_stock_threshold;
          return (
            <List.Item
              title={item.name}
              description={`SKU: ${item.sku ?? '—'} · Cost: ${formatCurrency(item.cost_price)} · Sell: ${formatCurrency(item.selling_price)}`}
              left={() => (
                <View style={styles.qtyBox}>
                  <Text style={[styles.qty, isLow && styles.qtyLow]}>{item.quantity}</Text>
                  <Text style={styles.qtyLabel}>in stock</Text>
                </View>
              )}
              right={() => isLow ? <Badge style={styles.badge}>Low</Badge> : null}
              onPress={() => navigation.navigate('PartForm', { partId: item.id })}
              style={styles.item}
            />
          );
        }}
        ListEmptyComponent={<EmptyState icon="package-variant" title="No parts yet" subtitle="Tap + to add a part to your inventory" />}
        refreshing={isLoading}
        onRefresh={fetchParts}
        contentContainerStyle={parts.length === 0 ? styles.empty : styles.list}
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('PartForm', {})}
        color="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  item: { backgroundColor: Colors.surface, marginHorizontal: 12, marginVertical: 4, borderRadius: 8 },
  qtyBox: { width: 50, justifyContent: 'center', alignItems: 'center' },
  qty: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
  qtyLow: { color: Colors.error },
  qtyLabel: { fontSize: 10, color: Colors.textSecondary },
  badge: { backgroundColor: Colors.warning, alignSelf: 'center', marginRight: 8 },
  list: { paddingBottom: 80 },
  empty: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: Colors.primary },
});
