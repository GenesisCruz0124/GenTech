import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { List, Text, IconButton } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getAllInvoices, Invoice } from '../../repositories/invoiceRepository';
import { shareInvoicePDF } from '../../services/shareService';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function InvoiceHistoryScreen() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAllInvoices();
    setInvoices(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <FlatList
      style={styles.container}
      data={invoices}
      keyExtractor={i => String(i.id)}
      renderItem={({ item }) => (
        <List.Item
          title={item.invoice_no}
          description={`${item.customer_name} · ${formatDate(item.created_at)} · ${item.type === 'repair' ? 'Repair' : 'Device Sale'}`}
          left={props => <List.Icon {...props} icon="receipt" color={Colors.primary} />}
          right={() => (
            <View style={styles.right}>
              <Text style={styles.amount}>{formatCurrency(item.total_amount)}</Text>
              {item.pdf_uri && (
                <IconButton
                  icon="share-variant"
                  size={20}
                  iconColor={Colors.primary}
                  onPress={() => shareInvoicePDF(item.pdf_uri!)}
                />
              )}
            </View>
          )}
          style={styles.item}
        />
      )}
      ListEmptyComponent={<EmptyState icon="receipt" title="No invoices yet" subtitle="Create an invoice from any repair or device sale" />}
      refreshing={loading}
      onRefresh={load}
      contentContainerStyle={invoices.length === 0 ? styles.empty : styles.list}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  item: { backgroundColor: Colors.surface, marginHorizontal: 12, marginVertical: 4, borderRadius: 8 },
  right: { flexDirection: 'row', alignItems: 'center' },
  amount: { fontSize: 15, fontWeight: 'bold', color: Colors.primary, alignSelf: 'center' },
  list: { paddingBottom: 16 },
  empty: { flex: 1 },
});
