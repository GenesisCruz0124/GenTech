import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';
import { useFocusEffect, useRoute, useNavigation, RouteProp, NavigationProp } from '@react-navigation/native';
import {
  FinancialItem,
  FinancialKind,
  getGrossIncomeDetails,
  getNetIncomeDetails,
  getNetIncomeCashDetails,
  getTotalPaidDetails,
  getForCollectionDetails,
} from '../../repositories/reportsRepository';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { RootStackParamList } from '../../navigation/types';

type Route = RouteProp<RootStackParamList, 'FinancialDetail'>;

const TYPE_ICONS: Record<FinancialItem['type'], string> = {
  repair: 'wrench',
  device_sale: 'cellphone',
  payment: 'cash-check',
  unpaid: 'cash-clock',
  parts: 'package-variant',
  device: 'cellphone',
  repair_part: 'wrench',
  consumable: 'flask-outline',
};

const CONFIG: Record<FinancialKind, {
  title: string;
  color: string;
  icon: string;
  emptySubtitle: string;
  fetch: (period: any, targetDate?: string, dateTo?: string) => Promise<FinancialItem[]>;
}> = {
  gross_income: {
    title: 'Gross Income',
    color: Colors.primary,
    icon: 'trending-up',
    emptySubtitle: 'No repair or device sale income for this period',
    fetch: getGrossIncomeDetails,
  },
  net_income: {
    title: 'Net Income',
    color: Colors.success,
    icon: 'chart-line',
    emptySubtitle: 'No income or expense activity for this period',
    fetch: getNetIncomeDetails,
  },
  net_income_cash: {
    title: 'Cash Net Income',
    color: Colors.success,
    icon: 'cash-multiple',
    emptySubtitle: 'No payments or expenses for this period',
    fetch: getNetIncomeCashDetails,
  },
  total_paid: {
    title: 'Total Paid',
    color: Colors.success,
    icon: 'cash-check',
    emptySubtitle: 'No payments recorded for this period',
    fetch: getTotalPaidDetails,
  },
  for_collection: {
    title: 'For Collection',
    color: Colors.warning,
    icon: 'cash-clock',
    emptySubtitle: 'No unpaid balances for this period',
    fetch: getForCollectionDetails,
  },
};

export default function FinancialDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { kind, period, targetDate, dateTo } = route.params;
  const config = CONFIG[kind];
  const [items, setItems] = useState<FinancialItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await config.fetch(period, targetDate, dateTo);
      setItems(data);
    } catch (e) {
      console.warn('FinancialDetail load error:', e);
    } finally {
      setLoading(false);
    }
  }, [kind, period, targetDate, dateTo]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = items.reduce((sum, i) => sum + (i.kind === 'expense' ? -i.amount : i.amount), 0);

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={i => i.id}
      ListHeaderComponent={items.length > 0 ? (
        <View style={[styles.totalRow, { borderLeftColor: config.color }]}>
          <Text style={styles.totalLabel}>{config.title}</Text>
          <Text style={[styles.totalValue, { color: config.color }]}>{formatCurrency(total)}</Text>
        </View>
      ) : null}
      renderItem={({ item }) => (
        <List.Item
          title={item.title}
          description={`${formatDate(item.date)}${item.subtitle ? ` · ${item.subtitle}` : ''}`}
          left={props => (
            <List.Icon {...props}
              icon={TYPE_ICONS[item.type]}
              color={item.kind === 'expense' ? Colors.error : Colors.success}
            />
          )}
          right={() => (
            <Text style={[styles.amount, { color: item.kind === 'expense' ? Colors.error : Colors.success }]}>
              {item.kind === 'expense' ? '-' : ''}{formatCurrency(item.amount)}
            </Text>
          )}
          style={styles.item}
          onPress={item.repair_id ? () => navigation.navigate('RepairDetail', { repairId: item.repair_id! }) : undefined}
        />
      )}
      ListEmptyComponent={
        <EmptyState icon={config.icon} title={`No ${config.title.toLowerCase()}`} subtitle={config.emptySubtitle} />
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
  amount: { fontSize: 15, fontWeight: 'bold', alignSelf: 'center' },
  list: { paddingBottom: 16 },
  empty: { flex: 1 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 12, marginTop: 12, marginBottom: 4, padding: 14,
    backgroundColor: Colors.surface, borderRadius: 10, borderLeftWidth: 4,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  totalValue: { fontSize: 17, fontWeight: '800' },
});
