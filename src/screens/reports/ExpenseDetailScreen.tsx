import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getExpenseDetails, ExpenseItem } from '../../repositories/reportsRepository';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { RootStackParamList } from '../../navigation/types';

type Route = RouteProp<RootStackParamList, 'ExpenseDetail'>;

export default function ExpenseDetailScreen() {
  const route = useRoute<Route>();
  const { period, targetDate, dateTo } = route.params;
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getExpenseDetails(period, targetDate, dateTo);
    setItems(data);
    setLoading(false);
  }, [period, targetDate, dateTo]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = items.reduce((sum, i) => sum + i.amount, 0);

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={i => i.id}
      ListHeaderComponent={items.length > 0 ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Expense</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
      ) : null}
      renderItem={({ item }) => (
        <List.Item
          title={item.title}
          description={`${formatDate(item.date)}${item.subtitle ? ` · ${item.subtitle}` : ''}`}
          left={props => (
            <List.Icon {...props}
              icon={item.type === 'parts' ? 'package-variant' : 'cellphone'}
              color={Colors.error}
            />
          )}
          right={() => <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>}
          style={styles.item}
        />
      )}
      ListEmptyComponent={
        <EmptyState icon="trending-down" title="No expenses" subtitle="No parts or device purchases for this period" />
      }
      refreshing={loading}
      onRefresh={load}
      contentContainerStyle={items.length === 0 ? styles.empty : styles.list}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  item: { backgroundColor: Colors.surface, marginHorizontal: 12, marginVertical: 4, borderRadius: 8 },
  amount: { fontSize: 15, fontWeight: 'bold', color: Colors.error, alignSelf: 'center' },
  list: { paddingBottom: 16 },
  empty: { flex: 1 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 12, marginTop: 12, marginBottom: 4, padding: 14,
    backgroundColor: Colors.surface, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: Colors.error,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  totalValue: { fontSize: 17, fontWeight: '800', color: Colors.error },
});
