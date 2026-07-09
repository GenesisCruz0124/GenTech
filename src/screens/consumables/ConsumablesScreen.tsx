import React, { useCallback, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, FAB, List, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  ConsumablePurchase,
  addConsumablePurchase,
  listConsumablePurchases,
  deleteConsumablePurchase,
} from '../../repositories/consumablesRepository';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
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
    setName(''); setQuantity('1'); setUnit('pcs'); setUnitCost(''); setNotes('');
    setShowUnitSuggestions(false);
    setModalVisible(true);
  };

  const handleAdd = async () => {
    if (!name.trim() || !unitCost.trim()) return;
    setSubmitting(true);
    try {
      await addConsumablePurchase({
        name: name.trim(),
        quantity: parseFloat(quantity) || 1,
        unit: unit.trim() || undefined,
        unit_cost: parseFloat(unitCost) || 0,
        notes: notes.trim() || undefined,
      });
      await load();
      setModalVisible(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
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

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Record Consumable</Text>

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
                  onPress={handleAdd}
                  loading={submitting}
                  disabled={!name.trim() || !unitCost.trim() || submitting}
                  style={{ flex: 1 }}
                  icon="check"
                >
                  Save
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>

      {deleteTarget && (
        <ConfirmDialog
          visible
          title="Delete Record"
          message={`Remove "${deleteTarget.name}" purchase?`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
          onDismiss={() => setDeleteTarget(null)}
        />
      )}
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
});
