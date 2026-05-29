import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { FAB, List, SegmentedButtons, Text } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useDeviceStore } from '../../store/deviceStore';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatDate } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function DevicesScreen() {
  const navigation = useNavigation<Nav>();
  const { sales, purchases, isLoading, fetchSales, fetchPurchases } = useDeviceStore();
  const [tab, setTab] = useState('sales');

  useFocusEffect(useCallback(() => {
    fetchSales();
    fetchPurchases();
  }, []));

  const isSales = tab === 'sales';
  const data = isSales ? sales : purchases;

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'sales', label: 'Sold to Customers' },
          { value: 'purchases', label: 'Bought from Customers' },
        ]}
        style={styles.tabs}
      />
      <FlatList
        data={data as any[]}
        keyExtractor={d => String(d.id)}
        renderItem={({ item }) => (
          <List.Item
            title={`${item.device_name} ${item.device_model}`}
            description={`${item.customer_name} · ${item.customer_phone}${item.imei ? ` · IMEI: ${item.imei}` : ''}`}
            right={() => (
              <View style={styles.right}>
                <Text style={styles.price}>{formatCurrency(isSales ? item.sale_price : item.purchase_price)}</Text>
                <Text style={styles.date}>{formatDate(isSales ? item.sold_at : item.purchased_at)}</Text>
              </View>
            )}
            style={styles.item}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="cellphone"
            title={isSales ? 'No device sales yet' : 'No device purchases yet'}
            subtitle="Tap + to record one"
          />
        }
        refreshing={isLoading}
        onRefresh={isSales ? fetchSales : fetchPurchases}
        contentContainerStyle={data.length === 0 ? styles.empty : styles.list}
      />
      <FAB
        icon="plus"
        style={styles.fab}
        color="#fff"
        onPress={() => navigation.navigate(isSales ? 'DeviceSaleForm' : 'DevicePurchaseForm')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabs: { margin: 12 },
  item: { backgroundColor: Colors.surface, marginHorizontal: 12, marginVertical: 4, borderRadius: 8 },
  right: { justifyContent: 'center', alignItems: 'flex-end', paddingRight: 4 },
  price: { fontSize: 15, fontWeight: 'bold', color: Colors.primary },
  date: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  list: { paddingBottom: 80 },
  empty: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: Colors.primary },
});
