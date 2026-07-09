import React, { useCallback, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, FAB, List, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  ConsumablePurchase,
  addConsumablePurchase,
  updateConsumablePurchase,
  archiveConsumablePurchase,
  listConsumablePurchases,
  deleteConsumablePurchase,
} from '../../repositories/consumablesRepository';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatDate } from '../../utils/formatters';

const UNIT_SUGGESTIONS = ['pcs', 'ml', 'L', 'g', 'kg', 'roll', 'sheet', 'tube', 'bottle', 'pack', 'box'];

export default function ConsumablesScreen() {
  const [items, setItems] = useState<ConsumablePurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<ConsumablePurchase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConsumablePurchase | null>(null);
  const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listConsumablePurchases());
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

  const openEdit = (item: ConsumablePurchase) => {
    setEditTarget(item);
    setName(item.name);
    setQuantity(String(item.quantity));
    setUnit(item.unit ?? 'pcs');
    setUnitCost(String(item.unit_cost));
    setNotes(item.notes ?? '');
    setShowUnitSuggestions(false);
    setModalVisible(true);
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

  const handleKeepAsExpense = async () => {
    if (!deleteTarget) return;
    await archiveConsumablePurchase(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  };

  const handleDeleteCompletely = async () => {
    if (!deleteTarget) return;
    await deleteConsumablePurchase(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  };

  const totalSpent = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);
  const computedTotal = (parseFloat(quantity) || 1) * (parseFloat(unitCost) || 0);
  const unitSuggestions = UNIT_SUGGESTIONS.filter(
    u => u.toLowerCase().startsWith(unit.toLowerCase()) && u.toLowerCase() !== unit.toLowerCase()
  );

  return (
    <>
      <FlatList
        style={styles.container}
        data={items}
        keyExtractor={i => String(i.id)}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={items.length > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Spent</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalSpent)}</Text>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={`${formatDate(item.created_at)} · ${item.quantity} ${item.unit ?? 'pcs'}${item.notes ? ` · ${item.notes}` : ''}`}
            left={props => <List.Icon {...props} icon="flask-outline" color={Colors.warning} />}
            onPress={() => openEdit(item)}
            right={() => (
              <View style={styles.rightCol}>
                <Text style={styles.amount}>{formatCurrency(item.unit_cost * item.quantity)}</Text>
                <Text style={styles.unitCostText}>₱{item.unit_cost}/{item.unit ?? 'pcs'}</Text>
                <TouchableOpacity
                  onPress={() => setDeleteTarget(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ marginTop: 2 }}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            )}
            style={styles.item}
          />
        )}
        ListEmptyComponent={
          <EmptyState icon="flask-outline" title="No consumables recorded" subtitle="Tap + to log a purchase" />
        }
        contentContainerStyle={items.length === 0 ? styles.empty : styles.list}
      />

      <FAB icon="plus" style={styles.fab} onPress={openModal} />

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

      {/* Delete options modal */}
      <Portal>
        <Modal visible={!!deleteTarget} onDismiss={() => setDeleteTarget(null)} contentContainerStyle={styles.deleteModal}>
          <Text style={styles.deleteTitle}>Remove Record</Text>
          <Text style={styles.deleteName}>{deleteTarget?.name}</Text>
          <Text style={styles.deleteSubtitle}>
            {deleteTarget ? `${deleteTarget.quantity} ${deleteTarget.unit ?? 'pcs'} · ${formatCurrency(deleteTarget.unit_cost * deleteTarget.quantity)}` : ''}
          </Text>

          <TouchableOpacity style={styles.deleteOption} onPress={handleKeepAsExpense} activeOpacity={0.75}>
            <View style={[styles.deleteOptionIcon, { backgroundColor: Colors.primary + '15' }]}>
              <MaterialCommunityIcons name="receipt-text-check-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.deleteOptionText}>
              <Text style={[styles.deleteOptionLabel, { color: Colors.primary }]}>Keep as Expense</Text>
              <Text style={styles.deleteOptionDesc}>Remove from list — amount stays in expense reports</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.deleteOption, styles.deleteOptionDanger]} onPress={handleDeleteCompletely} activeOpacity={0.75}>
            <View style={[styles.deleteOptionIcon, { backgroundColor: Colors.error + '15' }]}>
              <MaterialCommunityIcons name="trash-can-outline" size={22} color={Colors.error} />
            </View>
            <View style={styles.deleteOptionText}>
              <Text style={[styles.deleteOptionLabel, { color: Colors.error }]}>Delete Completely</Text>
              <Text style={styles.deleteOptionDesc}>Remove from list and from expense reports</Text>
            </View>
          </TouchableOpacity>

          <Button mode="text" onPress={() => setDeleteTarget(null)} style={{ marginTop: 4 }}>Cancel</Button>
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
  rightCol: { alignItems: 'flex-end', justifyContent: 'center', gap: 2, paddingRight: 4 },
  amount: { fontSize: 14, fontWeight: '700', color: Colors.text },
  unitCostText: { fontSize: 11, color: Colors.textSecondary },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 12, marginTop: 12, marginBottom: 4, padding: 14,
    backgroundColor: Colors.surface, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: Colors.warning,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  totalValue: { fontSize: 17, fontWeight: '800', color: Colors.warning },
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: Colors.primary },
  modal: { backgroundColor: Colors.surface, margin: 16, borderRadius: 16, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 14 },
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
