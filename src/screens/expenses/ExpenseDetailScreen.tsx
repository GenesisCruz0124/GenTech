import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { getPartsPurchasesByDateRange, PartsPurchase } from '../../repositories/partsRepository';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatDate } from '../../utils/formatters';

type RouteProps = RouteProp<RootStackParamList, 'ExpenseDetail'>;

export default function ExpenseDetailScreen() {
  const { params } = useRoute<RouteProps>();
  const { dateFrom, dateTo, label } = params;

  const [records, setRecords] = useState<PartsPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPartsPurchasesByDateRange(dateFrom, dateTo);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  React.useEffect(() => { load(); }, [load]);

  const total = records.reduce((sum, r) => sum + r.quantity * r.cost_price, 0);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={records.length === 0 ? styles.emptyContainer : styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[Colors.primary]} />}
      data={records}
      keyExtractor={r => String(r.id)}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="trending-down" size={22} color={Colors.error} />
          </View>
          <View style={styles.headerBody}>
            <Text style={styles.headerLabel}>Total Expense</Text>
            {label ? <Text style={styles.headerSub}>{label}</Text> : null}
          </View>
          <Text style={styles.headerAmount}>{formatCurrency(total)}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.item}>
          <View style={styles.itemLeft}>
            <Text style={styles.itemName}>{item.part_name}</Text>
            <Text style={styles.itemMeta}>
              {item.category_name ? `${item.category_name}` : 'Uncategorized'}
              {item.supplier_name ? ` · ${item.supplier_name}` : ''}
            </Text>
          </View>
          <View style={styles.itemRight}>
            <Text style={styles.itemAmount}>{formatCurrency(item.quantity * item.cost_price)}</Text>
            <Text style={styles.itemDetail}>{item.quantity} × {formatCurrency(item.cost_price)}</Text>
            <Text style={styles.itemDate}>{formatDate(item.purchased_at)}</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        !loading ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="package-variant" size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>No expenses found</Text>
            <Text style={styles.emptySub}>No parts were restocked in this period</Text>
          </View>
        ) : null
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  content: { padding: 14, paddingBottom: 32 },
  emptyContainer: { flex: 1, padding: 14 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.error + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBody: { flex: 1 },
  headerLabel: { fontSize: 13, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  headerAmount: { fontSize: 22, fontWeight: '800', color: Colors.error },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  itemLeft: { flex: 1, paddingRight: 8 },
  itemName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  itemMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemAmount: { fontSize: 15, fontWeight: '800', color: Colors.error },
  itemDetail: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  itemDate: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  separator: { height: 6 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
});
