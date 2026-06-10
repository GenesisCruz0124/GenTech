import React, { useCallback, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Modal as RNModal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Badge, Button, Checkbox, Divider, FAB, IconButton, List, Modal, Portal, Searchbar, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAnimatedTabTitle } from '../../hooks/useAnimatedTabTitle';
import { useLayoutEffect } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { usePartsStore } from '../../store/partsStore';
import { Part, getPartsPurchaseHistory, recordPartsPurchase, updatePartsPurchase, syncCostPriceFromLastPurchase, PartsPurchase, getModelsWithActiveRepairs } from '../../repositories/partsRepository';
import { getAllCategories, Category } from '../../repositories/categoryRepository';
import { getAllDeviceBrands, DeviceBrand } from '../../repositories/deviceBrandRepository';
import ImagePickerField from '../../components/common/ImagePickerField';
import DatePickerField from '../../components/common/DatePickerField';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const hdrBtn: any = { padding: 5, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)' };
const hdrBtnActive: any = { backgroundColor: 'rgba(255,255,255,0.4)' };

export default function PartsListScreen() {
  const navigation = useNavigation<Nav>();
  const { parts, isLoading, fetchParts } = usePartsStore();
  useAnimatedTabTitle(navigation, 'Stocks');

  const [searchVisible, setSearchVisible] = useState(false);
  const [filterChipsVisible, setFilterChipsVisible] = useState(false);
  type FilterType = 'all' | 'in_stock' | 'low_stock' | 'active_repairs';
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeRepairModels, setActiveRepairModels] = useState<string[]>([]);

  // Bulk restock multi-select
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelectItem = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 8, gap: 4 }}>
          <TouchableOpacity style={hdrBtn} onPress={() => navigation.navigate('Quotation')}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[hdrBtn, filterChipsVisible && filter !== 'all' && hdrBtnActive]}
            onPress={() => setFilterChipsVisible((v: boolean) => !v)}
          >
            <MaterialCommunityIcons
              name="filter-variant"
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={hdrBtn}
            onPress={() => setSearchVisible((v: boolean) => !v)}
          >
            <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[hdrBtn, selectMode && hdrBtnActive]}
            onPress={() => { setSelectMode(v => !v); setSelectedIds(new Set()); }}
          >
            <MaterialCommunityIcons name={selectMode ? 'close' : 'checkbox-multiple-marked-outline'} size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, filterChipsVisible, filter, searchVisible, selectMode]);

  // Restock modal
  const [restockTarget, setRestockTarget] = useState<Part | null>(null);
  const [restockQty, setRestockQty] = useState('1');
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [brands, setBrands] = useState<DeviceBrand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [brandMenuVisible, setBrandMenuVisible] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Part | null>(null);

  const { removePart } = usePartsStore();

  useFocusEffect(useCallback(() => {
    fetchParts();
    getAllCategories().then(setCategories);
    getAllDeviceBrands().then(setBrands);
    getModelsWithActiveRepairs().then(setActiveRepairModels).catch(() => {});
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []));

  const openRestock = (part: Part) => {
    setRestockTarget(part);
    setRestockQty('1');
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
  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  const getIssueFromCategory = (categoryName: string): string => {
    const n = categoryName.toLowerCase();
    if (n.includes('display') || n.includes('screen') || n.includes('lcd')) return 'LCD Display Replacement';
    if (n.includes('battery')) return 'Battery Replacement';
    if (n.includes('button') || n.includes('btn')) return 'Button Replacement';
    if (n.includes('camera') || n.includes('cam')) return 'Camera Replacement';
    if (n.includes('speaker') || n.includes('audio')) return 'Speaker Replacement';
    if (n.includes('charging') || n.includes('charger') || n.includes('usb') || n.includes('port')) return 'Charging Port Replacement';
    if (n.includes('back') || n.includes('housing') || n.includes('cover')) return 'Back Cover Replacement';
    if (n.includes('mic') || n.includes('microphone')) return 'Microphone Replacement';
    return categoryName.charAt(0).toUpperCase() + categoryName.slice(1) + ' Replacement';
  };

  const filtered = parts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'in_stock') return p.quantity > 0;
    if (filter === 'low_stock') return p.quantity <= p.low_stock_threshold;
    if (filter === 'active_repairs') return activeRepairModels.includes(p.name.toLowerCase().trim());
    return true;
  });

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all',            label: 'All' },
    { key: 'in_stock',       label: 'In Stock' },
    { key: 'low_stock',      label: 'Low Stock' },
    { key: 'active_repairs', label: 'Active Repairs' },
  ];

  return (
    <View style={styles.container}>
      {/* Search bar (expandable from header icon) */}
      {searchVisible && (
        <Searchbar
          placeholder="Search parts..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
          autoFocus
          onIconPress={() => { setSearch(''); setSearchVisible(false); }}
          icon="arrow-left"
        />
      )}

      {/* Filter chips */}
      {filterChipsVisible && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                setFilter(f.key);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>}

      <FlatList
        data={filtered}
        keyExtractor={p => String(p.id)}
        renderItem={({ item }) => {
          const isLow = item.quantity <= item.low_stock_threshold;
          const isSelected = selectedIds.has(item.id);
          return (
            <TouchableOpacity
              style={styles.partCard}
              onPress={() => {
                if (selectMode) {
                  toggleSelectItem(item.id);
                } else {
                  navigation.navigate('PartForm', { partId: item.id });
                }
              }}
              onLongPress={() => {
                if (!selectMode) {
                  setSelectMode(true);
                  toggleSelectItem(item.id);
                }
              }}
              activeOpacity={0.85}>
              {/* Top accent bar for low stock */}
              {isLow && <View style={styles.lowAccent} />}

              <View style={styles.cardBody}>
                {selectMode && (
                  <Checkbox status={isSelected ? 'checked' : 'unchecked'} onPress={() => toggleSelectItem(item.id)} color={Colors.primary} />
                )}
                {/* Left: name + tags */}
                <View style={styles.cardLeft}>
                  <Text style={styles.partName} numberOfLines={1}>
                    {item.name}{item.brand_name ? ` - ${item.brand_name}` : ''}
                  </Text>
                  <View style={styles.tagRow}>
                    {item.category_name && (
                      <View style={styles.catTag}>
                        <Text style={styles.catTagText}>{item.category_name}</Text>
                      </View>
                    )}
                    {isLow && (
                      <View style={styles.lowTag}>
                        <Text style={styles.lowTagText}>Low Stock</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Cost </Text>
                    <Text style={styles.priceVal}>{formatCurrency(item.cost_price)}</Text>
                  </View>
                </View>

                {/* Right: stock count */}
                <View style={[styles.stockBadge, isLow && styles.stockBadgeLow]}>
                  <Text style={[styles.stockNum, isLow && styles.stockNumLow]}>{item.quantity}</Text>
                  <Text style={styles.stockLabel}>units</Text>
                </View>
              </View>

              {/* Actions row */}
              {!selectMode && (
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openHistory(item)}>
                  <MaterialCommunityIcons name="history" size={16} color={Colors.textSecondary} />
                  <Text style={styles.actionBtnLabel}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.success + '50' }]} onPress={() => navigation.navigate('Restock', { partId: item.id, partName: item.name, costPrice: item.cost_price })}>
                  <MaterialCommunityIcons name="plus-circle-outline" size={16} color={Colors.success} />
                  <Text style={[styles.actionBtnLabel, { color: Colors.success }]}>Restock</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: Colors.primary + '50' }]}
                  onPress={() => navigation.navigate('NewRepair', {
                    deviceModel: item.name,
                    initialIssue: item.category_name ? getIssueFromCategory(item.category_name) : undefined,
                  })}>
                  <MaterialCommunityIcons name="wrench-outline" size={16} color={Colors.primary} />
                  <Text style={[styles.actionBtnLabel, { color: Colors.primary }]}>Repair</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.error + '40' }]} onPress={() => setDeleteTarget(item)}>
                  <MaterialCommunityIcons name="delete-outline" size={16} color={Colors.error} />
                  <Text style={[styles.actionBtnLabel, { color: Colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<EmptyState icon="package-variant" title="No stocks yet" subtitle="Tap + to add a new stock" />}
        refreshing={false}
        onRefresh={fetchParts}
        contentContainerStyle={filtered.length === 0 ? styles.empty : styles.list}
      />
      {selectMode ? (
        <View style={styles.selectBar}>
          <Text style={styles.selectBarText}>{selectedIds.size} selected</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button mode="outlined" onPress={() => { setSelectMode(false); setSelectedIds(new Set()); }} style={styles.selectBarBtn} compact>
              Cancel
            </Button>
            <Button
              mode="contained"
              icon="package-variant-closed"
              disabled={selectedIds.size === 0}
              onPress={() => navigation.navigate('BulkRestock', { partIds: Array.from(selectedIds) })}
              style={styles.selectBarBtn}
              compact>
              Restock ({selectedIds.size})
            </Button>
          </View>
        </View>
      ) : (
        <FAB icon="plus" label="New Stock" style={styles.fab} onPress={() => navigation.navigate('PartForm', {})} color="#fff" />
      )}


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
        <Modal visible={!!editPurchase} onDismiss={() => setEditPurchase(null)} contentContainerStyle={styles.restockModal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            {/* Header */}
            <View style={styles.restockHeader}>
              <View style={styles.restockHeaderIcon}>
                <MaterialCommunityIcons name="pencil-outline" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.restockTitle}>Edit Purchase</Text>
                <Text style={styles.restockSubtitle} numberOfLines={1}>{editPurchase?.part_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditPurchase(null)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}>

              {/* Quantity stepper */}
              <View style={styles.restockSection}>
                <Text style={styles.restockSectionLabel}>Quantity</Text>
                <View style={styles.restockStepper}>
                  <TouchableOpacity style={styles.restockStepBtn}
                    onPress={() => setEditQty(String(Math.max(1, (parseInt(editQty) || 1) - 1)))}>
                    <MaterialCommunityIcons name="minus" size={22} color={Colors.primary} />
                  </TouchableOpacity>
                  <TextInput value={editQty}
                    onChangeText={v => setEditQty(v.replace(/[^0-9]/g, '') || '1')}
                    mode="flat" style={styles.restockStepperInput} keyboardType="numeric"
                    underlineColor="transparent" activeUnderlineColor={Colors.primary} dense />
                  <TouchableOpacity style={styles.restockStepBtn}
                    onPress={() => setEditQty(String((parseInt(editQty) || 0) + 1))}>
                    <MaterialCommunityIcons name="plus" size={22} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.restockSection}>
                <Text style={styles.restockSectionLabel}>Cost per Unit (₱)</Text>
                <TextInput value={editCost} onChangeText={setEditCost} mode="outlined"
                  style={styles.restockInput} keyboardType="decimal-pad" dense />
              </View>

              <View style={styles.restockSection}>
                <Text style={styles.restockSectionLabel}>Supplier</Text>
                <TextInput value={editSupplier} onChangeText={setEditSupplier} mode="outlined"
                  style={styles.restockInput} dense />
              </View>

              <View style={styles.restockSection}>
                <Text style={styles.restockSectionLabel}>Notes</Text>
                <TextInput value={editNotes} onChangeText={setEditNotes} mode="outlined"
                  style={styles.restockInput} multiline dense />
              </View>

              <View style={styles.restockSection}>
                <Text style={styles.restockSectionLabel}>Receipt / Photo</Text>
                <ImagePickerField uri={editImage} onPicked={setEditImage} onClear={() => setEditImage(null)} />
              </View>

              <Button mode="contained" onPress={handleSaveEditPurchase} loading={editSaving}
                disabled={editSaving} style={styles.restockSaveBtn}
                contentStyle={{ paddingVertical: 6 }} icon="check-circle">
                Save Changes
              </Button>
            </ScrollView>
          </KeyboardAvoidingView>
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
  searchRow: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  search: { margin: 8, borderRadius: 12, elevation: 0, backgroundColor: Colors.background },
  searchCollapsed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  searchCollapsedTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  searchIconBtn: { padding: 4 },
  filterScroll: { flexGrow: 0, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 7, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background, minHeight: 32 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipLabel: { fontSize: 12, color: Colors.text, fontWeight: '600' },
  chipLabelActive: { color: '#fff' },
  categoryPicker: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  catChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  catChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  catChipLabel: { fontSize: 12, color: Colors.text },
  catChipLabelActive: { color: '#fff', fontWeight: '600' },
  item: { backgroundColor: Colors.surface, marginHorizontal: 12, marginVertical: 4, borderRadius: 8 },
  // Professional card design
  partCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  lowAccent: { height: 3, backgroundColor: Colors.warning },
  cardBody: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, paddingBottom: 10 },
  cardLeft: { flex: 1, marginRight: 12 },
  partName: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 5 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  brandTag: { backgroundColor: Colors.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  brandTagText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  catTag: { backgroundColor: Colors.secondary + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  catTagText: { fontSize: 11, color: Colors.secondary, fontWeight: '600' },
  lowTag: { backgroundColor: Colors.warning + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  lowTagText: { fontSize: 11, color: Colors.warning, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  priceLabel: { fontSize: 12, color: Colors.textSecondary },
  priceVal: { fontSize: 13, fontWeight: '700', color: Colors.text },
  priceSep: { fontSize: 12, color: Colors.border },
  stockBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '12',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 60,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  stockBadgeLow: { backgroundColor: Colors.error + '12', borderColor: Colors.error + '30' },
  stockNum: { fontSize: 24, fontWeight: '800', color: Colors.primary, lineHeight: 28 },
  stockNumLow: { color: Colors.error },
  stockLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 1 },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  lowBadge: { backgroundColor: Colors.warning, fontSize: 11 },
  actionBtns: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  actionBtnSuccess: {},
  actionBtnDanger: {},
  actionBtnLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  actionBtnDisabled: { borderColor: Colors.border, backgroundColor: Colors.background, opacity: 0.45 },
  actions: { flexDirection: 'column', alignItems: 'center' },
  badge: { backgroundColor: Colors.warning, alignSelf: 'center', marginRight: 4 },
  list: { paddingBottom: 80 },
  empty: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: Colors.primary },
  selectBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, elevation: 8 },
  selectBarText: { fontSize: 13, fontWeight: '700', color: Colors.text },
  selectBarBtn: { borderRadius: 10 },
  modal: { backgroundColor: Colors.surface, margin: 16, borderRadius: 12, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  // Restock modal redesign
  restockModal: { backgroundColor: Colors.surface, marginHorizontal: 14, borderRadius: 18, overflow: 'hidden', maxHeight: '90%' },
  restockHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.primary + '08' },
  restockHeaderIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  restockTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  restockSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  restockSection: { paddingHorizontal: 16, paddingTop: 12 },
  restockSectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  restockInput: { backgroundColor: Colors.surface },
  restockStepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary + '40', overflow: 'hidden', alignSelf: 'flex-start' },
  restockStepBtn: { width: 46, height: 46, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary + '08' },
  restockStepperInput: { width: 64, textAlign: 'center', fontSize: 20, fontWeight: '800', backgroundColor: Colors.surface, height: 46 },
  restockSaveBtn: { marginHorizontal: 16, marginTop: 16, borderRadius: 12 },
  restockStepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  restockStepperLabel: { fontSize: 15, color: Colors.text, fontWeight: '500' },
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
