import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, FAB, List, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  ConsumablePurchase,
  ConsumableGroup,
  addConsumablePurchase,
  updateConsumablePurchase,
  deleteConsumablePurchase,
  listConsumableGroups,
  getConsumableHistory,
  archiveConsumablesByName,
  deleteConsumablesByName,
} from '../../repositories/consumablesRepository';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatDate } from '../../utils/formatters';

const UNIT_SUGGESTIONS = ['pcs', 'ml', 'L', 'g', 'kg', 'roll', 'sheet', 'tube', 'bottle', 'pack', 'box'];

export default function ConsumablesScreen() {
  const [groups, setGroups] = useState<ConsumableGroup[]>([]);
  const [loading, setLoading] = useState(false);

  // Add / Edit modal
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<ConsumablePurchase | null>(null);
  const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);

  // History modal
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyGroup, setHistoryGroup] = useState<ConsumableGroup | null>(null);
  const [historyItems, setHistoryItems] = useState<ConsumablePurchase[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Delete modals
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<ConsumableGroup | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGroups(await listConsumableGroups());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openModal = () => {
    setEditTarget(null);
    setName(''); setQuantity('1'); setUnit('pcs'); setUnitCost(''); setNotes('');
    setShowUnitSuggestions(false);
    setModalVisible(true);
  };

  const openRestock = (group: ConsumableGroup) => {
    setEditTarget(null);
    setName(group.name);
    setQuantity('1');
    setUnit(group.unit ?? 'pcs');
    setUnitCost(String(group.latest_unit_cost));
    setNotes('');
    setShowUnitSuggestions(false);
    setHistoryVisible(false);
    setModalVisible(true);
  };

  const openEdit = (item: ConsumablePurchase) => {
    setEditTarget(item);
    setName(item.name);
    setQuantity(String(item.quantity));
    setUnit(item.unit ?? 'pcs');
    setUnitCost(String(item.unit_cost));
    setNotes(item.notes ?? '');
    setShowUnitSuggestions(false);
    setHistoryVisible(false);
    setModalVisible(true);
  };

  const openHistory = async (group: ConsumableGroup) => {
    setHistoryGroup(group);
    setHistoryVisible(true);
    setHistoryLoading(true);
    try {
      setHistoryItems(await getConsumableHistory(group.name));
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !unitCost.trim()) return;
    setSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        quantity: parseFloat(quantity) || 1,
        unit: unit.trim() || undefined,
        unit_cost: parseFloat(unitCost) || 0,
        notes: notes.trim() || undefined,
      };
      if (editTarget) {
        await updateConsumablePurchase(editTarget.id, data);
      } else {
        await addConsumablePurchase(data);
      }
      await load();
      setModalVisible(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Group-level delete (all purchases with same name)
  const handleGroupKeepAsExpense = async () => {
    if (!deleteGroupTarget) return;
    await archiveConsumablesByName(deleteGroupTarget.name);
    setDeleteGroupTarget(null);
    await load();
  };

  const handleGroupDeleteCompletely = async () => {
    if (!deleteGroupTarget) return;
    await deleteConsumablesByName(deleteGroupTarget.name);
    setDeleteGroupTarget(null);
    await load();
  };

  // Individual purchase delete — direct remove (from history modal)
  const handleDeletePurchase = async (item: ConsumablePurchase) => {
    await deleteConsumablePurchase(item.id);
    const updated = await getConsumableHistory(item.name);
    setHistoryItems(updated);
    if (updated.length === 0) setHistoryVisible(false);
    await load();
  };

  const totalSpent = groups.reduce((sum, g) => sum + g.total_spent, 0);
  const computedTotal = (parseFloat(quantity) || 1) * (parseFloat(unitCost) || 0);
  const unitSuggestions = UNIT_SUGGESTIONS.filter(
    u => u.toLowerCase().startsWith(unit.toLowerCase()) && u.toLowerCase() !== unit.toLowerCase()
  );

  return (
    <>
      <FlatList
        style={styles.container}
        data={groups}
        keyExtractor={g => g.name}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={groups.length > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Spent</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalSpent)}</Text>
          </View>
        ) : null}
        renderItem={({ item: group }) => (
          <List.Item
            title={group.name}
            description={`Last: ${formatDate(group.last_purchase)} · ${group.total_qty} ${group.unit ?? 'pcs'} total · ${group.purchase_count} purchase${group.purchase_count !== 1 ? 's' : ''}`}
            left={props => <List.Icon {...props} icon="flask-outline" color={Colors.warning} />}
            onPress={() => openHistory(group)}
            right={() => (
              <View style={styles.rightCol}>
                <Text style={styles.amount}>{formatCurrency(group.total_spent)}</Text>
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    onPress={() => openRestock(group)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="cart-plus" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setDeleteGroupTarget(group)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            style={styles.item}
          />
        )}
        ListEmptyComponent={
          <EmptyState icon="flask-outline" title="No consumables recorded" subtitle="Tap + to log a purchase" />
        }
        contentContainerStyle={groups.length === 0 ? styles.empty : styles.list}
      />

      <FAB icon="plus" style={styles.fab} onPress={openModal} />

      {/* History modal */}
      <Portal>
        <Modal visible={historyVisible} onDismiss={() => setHistoryVisible(false)} contentContainerStyle={styles.modal}>
          <View style={styles.historyHeader}>
            <Text style={styles.modalTitle}>{historyGroup?.name}</Text>
            <Button
              mode="contained"
              compact
              icon="cart-plus"
              onPress={() => historyGroup && openRestock(historyGroup)}
            >
              Restock
            </Button>
          </View>

          {historyLoading ? (
            <ActivityIndicator style={{ padding: 24 }} color={Colors.primary} />
          ) : (
            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {historyItems.map(item => (
                <View key={item.id} style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
                    <Text style={styles.historyDesc}>
                      {item.quantity} {item.unit ?? 'pcs'} × ₱{item.unit_cost}
                      {item.notes ? ` · ${item.notes}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.historyAmount}>{formatCurrency(item.quantity * item.unit_cost)}</Text>
                  <View style={styles.historyActions}>
                    <TouchableOpacity onPress={() => openEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                      <MaterialCommunityIcons name="pencil-outline" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeletePurchase(item)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                      <MaterialCommunityIcons name="trash-can-outline" size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <Button mode="text" onPress={() => setHistoryVisible(false)} style={{ marginTop: 8 }}>Close</Button>
        </Modal>
      </Portal>

      {/* Add / Edit modal */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editTarget ? 'Edit Consumable' : 'Record Consumable'}</Text>

              <TextInput
                label="Item Name *"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                placeholder="e.g. Flux, Solder Wire, IPA Alcohol"
              />

              <View style={styles.row}>
                <TextInput
                  label="Qty"
                  value={quantity}
                  onChangeText={setQuantity}
                  mode="outlined"
                  style={[styles.input, styles.qtyInput]}
                  keyboardType="decimal-pad"
                />
                <View style={styles.unitWrap}>
                  <TextInput
                    label="Unit"
                    value={unit}
                    onChangeText={(t) => { setUnit(t); setShowUnitSuggestions(t.length >= 1); }}
                    mode="outlined"
                    style={styles.input}
                    placeholder="pcs, ml, g…"
                  />
                  {showUnitSuggestions && unitSuggestions.length > 0 && (
                    <View style={styles.suggestionBox}>
                      {unitSuggestions.slice(0, 5).map(u => (
                        <TouchableOpacity
                          key={u}
                          style={styles.suggestionItem}
                          onPress={() => { setUnit(u); setShowUnitSuggestions(false); }}
                        >
                          <Text style={styles.suggestionText}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <TextInput
                label="Unit Cost (₱) *"
                value={unitCost}
                onChangeText={setUnitCost}
                mode="outlined"
                style={styles.input}
                keyboardType="decimal-pad"
              />

              {parseFloat(quantity) > 0 && parseFloat(unitCost) > 0 && (
                <Text style={styles.computedTotal}>Total: {formatCurrency(computedTotal)}</Text>
              )}

              <TextInput
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                style={styles.input}
                placeholder="Brand, supplier, purpose…"
              />

              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={() => setModalVisible(false)} style={{ flex: 1 }}>Cancel</Button>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  loading={submitting}
                  disabled={!name.trim() || !unitCost.trim() || submitting}
                  style={{ flex: 1 }}
                  icon="check"
                >
                  {editTarget ? 'Update' : 'Save'}
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>

      {/* Group delete modal */}
      <Portal>
        <Modal visible={!!deleteGroupTarget} onDismiss={() => setDeleteGroupTarget(null)} contentContainerStyle={styles.deleteModal}>
          <Text style={styles.deleteTitle}>Remove All Records</Text>
          <Text style={styles.deleteName}>{deleteGroupTarget?.name}</Text>
          <Text style={styles.deleteSubtitle}>
            {deleteGroupTarget
              ? `${deleteGroupTarget.purchase_count} purchase${deleteGroupTarget.purchase_count !== 1 ? 's' : ''} · ${formatCurrency(deleteGroupTarget.total_spent)} total`
              : ''}
          </Text>

          <TouchableOpacity style={styles.deleteOption} onPress={handleGroupKeepAsExpense} activeOpacity={0.75}>
            <View style={[styles.deleteOptionIcon, { backgroundColor: Colors.primary + '15' }]}>
              <MaterialCommunityIcons name="receipt-text-check-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.deleteOptionText}>
              <Text style={[styles.deleteOptionLabel, { color: Colors.primary }]}>Keep as Expense</Text>
              <Text style={styles.deleteOptionDesc}>Remove from list — amount stays in expense reports</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.deleteOption, styles.deleteOptionDanger]} onPress={handleGroupDeleteCompletely} activeOpacity={0.75}>
            <View style={[styles.deleteOptionIcon, { backgroundColor: Colors.error + '15' }]}>
              <MaterialCommunityIcons name="trash-can-outline" size={22} color={Colors.error} />
            </View>
            <View style={styles.deleteOptionText}>
              <Text style={[styles.deleteOptionLabel, { color: Colors.error }]}>Delete Completely</Text>
              <Text style={styles.deleteOptionDesc}>Remove from list and from expense reports</Text>
            </View>
          </TouchableOpacity>

          <Button mode="text" onPress={() => setDeleteGroupTarget(null)} style={{ marginTop: 4 }}>Cancel</Button>
        </Modal>
      </Portal>

    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { paddingBottom: 100 },
  empty: { flex: 1 },
  item: {
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
  },
  rightCol: { alignItems: 'flex-end', justifyContent: 'center', gap: 4, paddingRight: 4 },
  rowActions: { flexDirection: 'row', gap: 12 },
  amount: { fontSize: 14, fontWeight: '700', color: Colors.text },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 12, marginTop: 12, marginBottom: 4, padding: 14,
    backgroundColor: Colors.surface, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: Colors.warning,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  totalValue: { fontSize: 17, fontWeight: '800', color: Colors.warning },
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: Colors.primary },
  modal: { backgroundColor: Colors.surface, margin: 16, borderRadius: 16, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 14, flex: 1 },
  input: { marginBottom: 10, backgroundColor: Colors.surface },
  row: { flexDirection: 'row', gap: 10 },
  qtyInput: { width: 90 },
  unitWrap: { flex: 1 },
  computedTotal: { fontSize: 14, fontWeight: '700', color: Colors.success, marginBottom: 10, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  suggestionBox: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, marginTop: -8, marginBottom: 4, elevation: 6, overflow: 'hidden',
  },
  suggestionItem: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  suggestionText: { fontSize: 13, color: Colors.text },
  // History modal
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  historyList: { maxHeight: 400 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  historyLeft: { flex: 1 },
  historyDate: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  historyDesc: { fontSize: 13, color: Colors.text, marginTop: 2 },
  historyAmount: { fontSize: 14, fontWeight: '700', color: Colors.text },
  historyActions: { flexDirection: 'row', gap: 10 },
  // Delete options modal
  deleteModal: { backgroundColor: Colors.surface, margin: 20, borderRadius: 16, padding: 20 },
  deleteTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  deleteName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  deleteSubtitle: { fontSize: 12, color: Colors.textSecondary, marginBottom: 20 },
  deleteOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 12, backgroundColor: Colors.background,
    marginBottom: 10,
  },
  deleteOptionDanger: { borderWidth: 1, borderColor: Colors.error + '30' },
  deleteOptionIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  deleteOptionText: { flex: 1 },
  deleteOptionLabel: { fontSize: 15, fontWeight: '700' },
  deleteOptionDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
