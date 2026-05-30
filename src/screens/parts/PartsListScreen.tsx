import React, { useCallback, useState } from 'react';
import { FlatList, Image, Modal as RNModal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Badge, Button, Divider, FAB, IconButton, List, Modal, Portal, Searchbar, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { usePartsStore } from '../../store/partsStore';
import { Part, getPartsPurchaseHistory, recordPartsPurchase, updatePartsPurchase, syncCostPriceFromLastPurchase, PartsPurchase } from '../../repositories/partsRepository';
import { getAllCategories, Category } from '../../repositories/categoryRepository';
import ImagePickerField from '../../components/common/ImagePickerField';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PartsListScreen() {
  const navigation = useNavigation<Nav>();
  const { parts, isLoading, fetchParts } = usePartsStore();

  // Restock modal
  const [restockTarget, setRestockTarget] = useState<Part | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockSupplier, setRestockSupplier] = useState('');
  const [restockDate, setRestockDate] = useState('');
  const [restockNotes, setRestockNotes] = useState('');
  const [restockImage, setRestockImage] = useState<string | null>(null);
  const [restockSaving, setRestockSaving] = useState(false);

  // History modal
  const [historyTarget, setHistoryTarget] = useState<Part | null>(null);
  const [history, setHistory] = useState<PartsPurchase[]>([]);

  // Edit purchase record
  const [editPurchase, setEditPurchase] = useState<PartsPurchase | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editSupplier, setEditSupplier] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Full-screen image viewer
  const [viewImage, setViewImage] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  // Filters
  type FilterType = 'all' | 'low_stock' | 'category';
  const [filter, setFilter] = useState<FilterType>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Part | null>(null);

  const { removePart } = usePartsStore();

  useFocusEffect(useCallback(() => {
    fetchParts();
    getAllCategories().then(setCategories);
  }, []));

  const openRestock = (part: Part) => {
    setRestockTarget(part);
    setRestockQty('');
    setRestockCost(String(part.cost_price));
    setRestockSupplier('');
    setRestockDate(new Date().toISOString().split('T')[0]);
    setRestockNotes('');
    setRestockImage(null);
  };

  const openHistory = async (part: Part) => {
    setHistoryTarget(part);
    const h = await getPartsPurchaseHistory(part.id);
    setHistory(h);
  };

  const openEditPurchase = (p: PartsPurchase) => {
    setEditPurchase(p);
    setEditQty(String(p.quantity));
    setEditCost(String(p.cost_price));
    setEditSupplier(p.supplier_name ?? '');
    setEditNotes(p.notes ?? '');
    setEditImage(p.image_uri ?? null);
  };

  const handleSaveEditPurchase = async () => {
    if (!editPurchase) return;
    setEditSaving(true);
    await updatePartsPurchase(editPurchase.id, {
      quantity: parseInt(editQty) || editPurchase.quantity,
      cost_price: parseFloat(editCost) || editPurchase.cost_price,
      supplier_name: editSupplier.trim() || undefined,
      notes: editNotes.trim() || undefined,
      image_uri: editImage,
    });
    await syncCostPriceFromLastPurchase(editPurchase.part_id);
    await fetchParts();
    // Refresh history list
    const h = await getPartsPurchaseHistory(editPurchase.part_id);
    setHistory(h);
    setEditSaving(false);
    setEditPurchase(null);
  };

  const handleRestock = async () => {
    if (!restockTarget || !restockQty.trim()) return;
    setRestockSaving(true);
    await recordPartsPurchase({
      part_id: restockTarget.id,
      quantity: parseInt(restockQty),
      cost_price: parseFloat(restockCost) || restockTarget.cost_price,
      supplier_name: restockSupplier.trim() || undefined,
      notes: restockNotes.trim() || undefined,
      image_uri: restockImage || undefined,
      purchased_at: restockDate || undefined,
    });
    await fetchParts();
    setRestockSaving(false);
    setRestockTarget(null);
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const filtered = parts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'low_stock') return p.quantity <= p.low_stock_threshold;
    if (filter === 'category') return selectedCategoryId ? p.category_id === selectedCategoryId : true;
    return true;
  });

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'category', label: selectedCategory ? selectedCategory.name : 'Category' },
    { key: 'low_stock', label: 'Low Stock' },
  ];

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search by name or SKU..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                if (f.key === 'category') {
                  if (filter === 'category') {
                    setCategoryMenuVisible(true);
                  } else {
                    setFilter('category');
                    setCategoryMenuVisible(true);
                  }
                } else {
                  setFilter(f.key);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{f.label}</Text>
              {f.key === 'category' && <MaterialCommunityIcons name="chevron-down" size={14} color={active ? '#fff' : Colors.textSecondary} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Category sub-picker */}
      {categoryMenuVisible && (
        <View style={styles.categoryPicker}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, padding: 8 }}>
            <TouchableOpacity style={[styles.catChip, !selectedCategoryId && styles.catChipActive]} onPress={() => { setSelectedCategoryId(null); setCategoryMenuVisible(false); }}>
              <Text style={[styles.catChipLabel, !selectedCategoryId && styles.catChipLabelActive]}>All Categories</Text>
            </TouchableOpacity>
            {categories.map(c => (
              <TouchableOpacity key={c.id} style={[styles.catChip, selectedCategoryId === c.id && styles.catChipActive]} onPress={() => { setSelectedCategoryId(c.id); setCategoryMenuVisible(false); }}>
                <Text style={[styles.catChipLabel, selectedCategoryId === c.id && styles.catChipLabelActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={p => String(p.id)}
        renderItem={({ item }) => {
          const isLow = item.quantity <= item.low_stock_threshold;
          return (
            <TouchableOpacity style={styles.partCard} onPress={() => navigation.navigate('PartForm', { partId: item.id })} activeOpacity={0.8}>
              {/* Row 1: Name + qty badge */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.partName}>{item.name}</Text>
                  {item.category_name
                    ? <Text style={styles.categoryTag}>{item.category_name}</Text>
                    : null}
                </View>
                <View style={styles.qtyBadge}>
                  <Text style={[styles.qtyNum, isLow && styles.qtyLow]}>{item.quantity}</Text>
                  <Text style={styles.qtyLabel}>in stock</Text>
                </View>
              </View>

              {/* Row 2: Prices */}
              <View style={styles.priceRow}>
                <View style={styles.priceCell}>
                  <Text style={styles.priceLbl}>Cost</Text>
                  <Text style={styles.priceVal}>{formatCurrency(item.cost_price)}</Text>
                </View>
                <View style={styles.priceDivider} />
                <View style={styles.priceCell}>
                  <Text style={styles.priceLbl}>Sell</Text>
                  <Text style={styles.priceVal}>{formatCurrency(item.selling_price)}</Text>
                </View>
                <View style={styles.priceDivider} />
                <View style={styles.priceCell}>
                  <Text style={styles.priceLbl}>Total Value</Text>
                  <Text style={[styles.priceVal, { color: Colors.primary, fontWeight: '700' }]}>{formatCurrency(item.total_purchase_value)}</Text>
                </View>
              </View>

              {/* Row 3: Action buttons */}
              <View style={styles.cardActions}>
                {isLow && <Badge style={styles.lowBadge}>Low Stock</Badge>}
                <View style={styles.actionBtns}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openHistory(item)}>
                    <MaterialCommunityIcons name="history" size={18} color={Colors.textSecondary} />
                    <Text style={styles.actionBtnLabel}>History</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSuccess]} onPress={() => openRestock(item)}>
                    <MaterialCommunityIcons name="plus-circle-outline" size={18} color={Colors.success} />
                    <Text style={[styles.actionBtnLabel, { color: Colors.success }]}>Restock</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => setDeleteTarget(item)}>
                    <MaterialCommunityIcons name="delete-outline" size={18} color={Colors.error} />
                    <Text style={[styles.actionBtnLabel, { color: Colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<EmptyState icon="package-variant" title="No parts yet" subtitle="Tap + to add a part to your inventory" />}
        refreshing={isLoading}
        onRefresh={fetchParts}
        contentContainerStyle={filtered.length === 0 ? styles.empty : styles.list}
      />
      <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('PartForm', {})} color="#fff" />

      {/* Restock Modal */}
      <Portal>
        <Modal visible={!!restockTarget} onDismiss={() => setRestockTarget(null)} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Restock — {restockTarget?.name}</Text>
            <TextInput label="Quantity *" value={restockQty} onChangeText={setRestockQty} mode="outlined" style={styles.input} keyboardType="numeric" />
            <TextInput label="Cost Paid per Unit (₱)" value={restockCost} onChangeText={setRestockCost} mode="outlined" style={styles.input} keyboardType="decimal-pad" />
            <TextInput label="Date of Purchase" value={restockDate} onChangeText={setRestockDate} mode="outlined" style={styles.input} placeholder="YYYY-MM-DD" />
            <TextInput label="Supplier Name (optional)" value={restockSupplier} onChangeText={setRestockSupplier} mode="outlined" style={styles.input} />
            <TextInput label="Notes (optional)" value={restockNotes} onChangeText={setRestockNotes} mode="outlined" style={styles.input} />
            <Text style={styles.inputLabel}>Receipt / Photo (optional)</Text>
            <ImagePickerField uri={restockImage} onPicked={setRestockImage} onClear={() => setRestockImage(null)} />
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setRestockTarget(null)} style={styles.btnHalf}>Cancel</Button>
              <Button mode="contained" onPress={handleRestock} loading={restockSaving} disabled={!restockQty.trim() || restockSaving} style={styles.btnHalf}>Save</Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* History Modal */}
      <Portal>
        <Modal visible={!!historyTarget} onDismiss={() => setHistoryTarget(null)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Purchase History — {historyTarget?.name}</Text>
          <ScrollView style={styles.historyScroll}>
            {history.length === 0 ? (
              <Text style={styles.empty2}>No restock records yet.</Text>
            ) : (
              history.map((h, i) => (
                <View key={h.id}>
                  <View style={styles.historyRow}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyQty}>+{h.quantity} units @ {formatCurrency(h.cost_price)} each</Text>
                      {h.supplier_name ? <Text style={styles.historySupplier}>📦 {h.supplier_name}</Text> : null}
                      <Text style={styles.historyDate}>{formatDateTime(h.purchased_at)}</Text>
                      {h.notes ? <Text style={styles.historyNote}>{h.notes}</Text> : null}
                      {h.image_uri ? (
                        <TouchableOpacity onPress={() => setViewImage(h.image_uri)} style={styles.thumbWrap}>
                          <Image source={{ uri: h.image_uri }} style={styles.thumb} resizeMode="cover" />
                          <Text style={styles.thumbLabel}>Tap to view</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={styles.historyCost}>{formatCurrency(h.cost_price * h.quantity)}</Text>
                      <IconButton icon="pencil-outline" size={18} iconColor={Colors.primary} onPress={() => openEditPurchase(h)} />
                    </View>
                  </View>
                  {i < history.length - 1 && <Divider />}
                </View>
              ))
            )}
          </ScrollView>
          <Button mode="outlined" onPress={() => setHistoryTarget(null)} style={{ marginTop: 12, borderRadius: 8 }}>Close</Button>
        </Modal>
      </Portal>

      {/* Delete part confirmation */}
      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Part"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { if (deleteTarget) { await removePart(deleteTarget.id); setDeleteTarget(null); } }}
        onDismiss={() => setDeleteTarget(null)}
      />

      {/* Edit Purchase Modal */}
      <Portal>
        <Modal visible={!!editPurchase} onDismiss={() => setEditPurchase(null)} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Edit Purchase Record</Text>
            <TextInput label="Quantity *" value={editQty} onChangeText={setEditQty} mode="outlined" style={styles.input} keyboardType="numeric" />
            <TextInput label="Cost per Unit (₱)" value={editCost} onChangeText={setEditCost} mode="outlined" style={styles.input} keyboardType="decimal-pad" />
            <TextInput label="Supplier Name" value={editSupplier} onChangeText={setEditSupplier} mode="outlined" style={styles.input} />
            <TextInput label="Notes" value={editNotes} onChangeText={setEditNotes} mode="outlined" style={styles.input} />
            <Text style={styles.inputLabel}>Receipt / Photo</Text>
            <ImagePickerField uri={editImage} onPicked={setEditImage} onClear={() => setEditImage(null)} />
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setEditPurchase(null)} style={styles.btnHalf}>Cancel</Button>
              <Button mode="contained" onPress={handleSaveEditPurchase} loading={editSaving} disabled={editSaving} style={styles.btnHalf}>Save</Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Full-screen image viewer */}
      <RNModal visible={!!viewImage} transparent animationType="fade" onRequestClose={() => setViewImage(null)}>
        <TouchableOpacity style={styles.imageViewer} activeOpacity={1} onPress={() => setViewImage(null)}>
          {viewImage && <Image source={{ uri: viewImage }} style={styles.fullImage} resizeMode="contain" />}
          <TouchableOpacity style={styles.closeBtn} onPress={() => setViewImage(null)}>
            <MaterialCommunityIcons name="close-circle" size={32} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  search: { margin: 12, marginBottom: 4, borderRadius: 8 },
  filterScroll: { flexGrow: 0 },
  filterRow: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipLabel: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  chipLabelActive: { color: '#fff' },
  categoryPicker: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  catChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  catChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  catChipLabel: { fontSize: 12, color: Colors.text },
  catChipLabelActive: { color: '#fff', fontWeight: '600' },
  item: { backgroundColor: Colors.surface, marginHorizontal: 12, marginVertical: 4, borderRadius: 8 },
  partCard: { backgroundColor: Colors.surface, marginHorizontal: 12, marginVertical: 5, borderRadius: 10, padding: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardHeaderLeft: { flex: 1, marginRight: 8 },
  partName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  categoryTag: { fontSize: 11, color: Colors.primary, marginTop: 3, fontWeight: '500' },
  qtyBadge: { alignItems: 'center', backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, minWidth: 54 },
  qtyNum: { fontSize: 22, fontWeight: 'bold', color: Colors.primary, lineHeight: 26 },
  qtyLow: { color: Colors.error },
  qtyLabel: { fontSize: 10, color: Colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 8, paddingVertical: 8, marginBottom: 10 },
  priceCell: { flex: 1, alignItems: 'center' },
  priceDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  priceLbl: { fontSize: 10, color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
  priceVal: { fontSize: 13, color: Colors.text, fontWeight: '600' },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },
  lowBadge: { backgroundColor: Colors.warning, fontSize: 11 },
  actionBtns: { flexDirection: 'row', gap: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: Colors.background },
  actionBtnSuccess: {},
  actionBtnDanger: {},
  actionBtnLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  actions: { flexDirection: 'column', alignItems: 'center' },
  badge: { backgroundColor: Colors.warning, alignSelf: 'center', marginRight: 4 },
  list: { paddingBottom: 80 },
  empty: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: Colors.primary },
  modal: { backgroundColor: Colors.surface, margin: 16, borderRadius: 12, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  input: { marginBottom: 8, backgroundColor: Colors.surface },
  inputLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, marginBottom: 2 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btnHalf: { flex: 1, borderRadius: 8 },
  historyScroll: { maxHeight: 400 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10 },
  historyLeft: { flex: 1, marginRight: 8 },
  historyQty: { fontSize: 14, fontWeight: '600', color: Colors.success },
  historySupplier: { fontSize: 13, color: Colors.primary, marginTop: 2 },
  historyDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  historyNote: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  historyRight: { alignItems: 'flex-end' },
  historyCost: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  thumbWrap: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  thumb: { width: 64, height: 64, borderRadius: 6, backgroundColor: Colors.border },
  thumbLabel: { fontSize: 12, color: Colors.primary },
  empty2: { color: Colors.textSecondary, textAlign: 'center', marginVertical: 16 },
  imageViewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '80%' },
  closeBtn: { position: 'absolute', top: 48, right: 16 },
});
