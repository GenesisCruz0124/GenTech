import React, { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput as RNTextInput, TouchableOpacity, View } from 'react-native';
import { Button, List, Modal, Portal, Text } from 'react-native-paper';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { getExpenseDetails, ExpenseItem } from '../../repositories/reportsRepository';
import { tagPurchaseToRepair } from '../../repositories/partsRepository';
import { listRepairs, RepairWithCustomer } from '../../repositories/repairRepository';
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

  // Tag-to-repair modal state
  const [tagItem, setTagItem] = useState<ExpenseItem | null>(null);
  const [repairs, setRepairs] = useState<RepairWithCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [tagging, setTagging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExpenseDetails(period, targetDate, dateTo);
      setItems(data);
    } catch (e) {
      console.warn('ExpenseDetail load error:', e);
    } finally {
      setLoading(false);
    }
  }, [period, targetDate, dateTo]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openTagModal = async (item: ExpenseItem) => {
    setTagItem(item);
    setSearch('');
    const all = await listRepairs({ limit: 200 });
    setRepairs(all);
  };

  const closeTagModal = () => { setTagItem(null); setRepairs([]); setSearch(''); };

  const handleTag = async (repair: RepairWithCustomer | null) => {
    if (!tagItem) return;
    const purchaseId = parseInt(tagItem.id.split('-')[1]);
    setTagging(true);
    try {
      await tagPurchaseToRepair(purchaseId, repair?.id ?? null);
      await load();
      closeTagModal();
    } finally {
      setTagging(false);
    }
  };

  const total = items.reduce((sum, i) => sum + i.amount, 0);

  const filteredRepairs = search.trim()
    ? repairs.filter(r =>
        r.device_model.toLowerCase().includes(search.toLowerCase()) ||
        r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        `rpn-${String(r.id).padStart(4, '0')}`.includes(search.toLowerCase())
      )
    : repairs;

  return (
    <>
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
                icon={item.type === 'repair_part' ? 'wrench' : item.type === 'consumable' ? 'flask-outline' : item.type === 'parts' ? 'package-variant' : 'cellphone'}
                color={Colors.error}
              />
            )}
            right={() => (
              <View style={styles.rightCol}>
                <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                {item.type === 'parts' && (
                  <TouchableOpacity onPress={() => openTagModal(item)} style={styles.tagBtn}>
                    <Text style={styles.tagBtnText}>
                      {item.repair_no ? 'Re-tag' : 'Tag repair'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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

      <Portal>
        <Modal visible={!!tagItem} onDismiss={closeTagModal} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Tag to Repair</Text>
          {tagItem?.repair_no && (
            <Button
              mode="outlined"
              textColor={Colors.error}
              style={styles.removeTagBtn}
              onPress={() => handleTag(null)}
              loading={tagging}
            >
              Remove tag ({tagItem.repair_no})
            </Button>
          )}
          <RNTextInput
            placeholder="Search repair…"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor={Colors.textSecondary}
          />
          <ScrollView style={styles.repairList} keyboardShouldPersistTaps="handled">
            {filteredRepairs.map(r => (
              <TouchableOpacity
                key={r.id}
                style={styles.repairRow}
                onPress={() => handleTag(r)}
                disabled={tagging}
              >
                <Text style={styles.repairNo}>RPN-{String(r.id).padStart(4, '0')}</Text>
                <Text style={styles.repairMeta} numberOfLines={1}>
                  {r.device_model}{r.customer_name ? ` · ${r.customer_name}` : ''}
                </Text>
                <Text style={styles.repairDate}>{formatDate(r.created_at)}</Text>
              </TouchableOpacity>
            ))}
            {filteredRepairs.length === 0 && (
              <Text style={styles.noResults}>No repairs found</Text>
            )}
          </ScrollView>
          <Button onPress={closeTagModal} style={{ marginTop: 8 }}>Cancel</Button>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  item: { backgroundColor: Colors.surface, marginHorizontal: 12, marginVertical: 4, borderRadius: 8 },
  rightCol: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: 4 },
  amount: { fontSize: 15, fontWeight: 'bold', color: Colors.error },
  tagBtn: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#E3F2FD' },
  tagBtnText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  list: { paddingBottom: 16 },
  empty: { flex: 1 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 12, marginTop: 12, marginBottom: 4, padding: 14,
    backgroundColor: Colors.surface, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: Colors.error,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  totalValue: { fontSize: 17, fontWeight: '800', color: Colors.error },
  modal: {
    backgroundColor: Colors.surface, margin: 20, borderRadius: 12, padding: 20, maxHeight: '80%',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12, color: Colors.text },
  removeTagBtn: { marginBottom: 10, borderColor: Colors.error },
  searchInput: {
    backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: Colors.text, marginBottom: 8,
  },
  repairList: { maxHeight: 340 },
  repairRow: {
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  repairNo: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  repairMeta: { fontSize: 14, color: Colors.text, marginTop: 1 },
  repairDate: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  noResults: { textAlign: 'center', color: Colors.textSecondary, paddingVertical: 20 },
});
