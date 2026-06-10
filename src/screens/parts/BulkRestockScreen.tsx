import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { usePartsStore } from '../../store/partsStore';
import { Part } from '../../repositories/partsRepository';
import { getAllSuppliers, createSupplier, Supplier } from '../../repositories/supplierRepository';
import DatePickerField from '../../components/common/DatePickerField';
import ImagePickerField from '../../components/common/ImagePickerField';
import { Colors } from '../../constants/colors';
import { formatCurrency } from '../../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'BulkRestock'>;

interface RestockItem {
  partId: number;
  name: string;
  qty: string;
  cost: string;
}

export default function BulkRestockScreen({ route, navigation }: Props) {
  const { partIds } = route.params;
  const { parts, bulkRestock } = usePartsStore();

  const [items, setItems] = useState<RestockItem[]>(() =>
    partIds
      .map(id => parts.find(p => p.id === id))
      .filter((p): p is Part => !!p)
      .map(p => ({ partId: p.id, name: p.name, qty: '1', cost: String(p.cost_price) }))
  );

  const [supplier, setSupplier] = useState('');
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
  const [supplierSuggestions, setSupplierSuggestions] = useState<Supplier[]>([]);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getAllSuppliers().then(setSupplierList).catch(() => {}); }, []);

  const updateQty = (partId: number, qty: string) => {
    setItems(prev => prev.map(i => i.partId === partId ? { ...i, qty: qty.replace(/[^0-9]/g, '') } : i));
  };
  const updateCost = (partId: number, cost: string) => {
    setItems(prev => prev.map(i => i.partId === partId ? { ...i, cost } : i));
  };
  const removeItem = (partId: number) => setItems(prev => prev.filter(i => i.partId !== partId));

  const grandTotal = items.reduce((sum, i) => sum + (parseInt(i.qty) || 0) * (parseFloat(i.cost) || 0), 0);
  const validItems = items.filter(i => (parseInt(i.qty) || 0) > 0);

  const handleSave = async () => {
    if (validItems.length === 0) return;
    setSaving(true);
    const supplierName = supplier.trim();
    // Auto-create supplier if a name was typed but doesn't exist in the list
    if (supplierName) {
      const exists = supplierList.some(s => s.name.toLowerCase() === supplierName.toLowerCase());
      if (!exists) {
        try { await createSupplier({ name: supplierName }); } catch {}
      }
    }
    await bulkRestock(
      validItems.map(i => ({ part_id: i.partId, quantity: parseInt(i.qty) || 1, cost_price: parseFloat(i.cost) || 0 })),
      {
        supplier_name: supplierName || undefined,
        notes: notes.trim() || undefined,
        image_uri: image || undefined,
        purchased_at: purchaseDate || undefined,
      }
    );
    setSaving(false);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Items */}
        <View style={styles.formCard}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.sectionLabel}>Items ({items.length})</Text>
            </View>
            {items.length === 0 ? (
              <Text style={styles.emptyText}>No items selected.</Text>
            ) : (
              items.map(item => (
                <View key={item.partId} style={styles.itemRow}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <TouchableOpacity onPress={() => removeItem(item.partId)} style={{ padding: 2 }}>
                      <MaterialCommunityIcons name="close" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.itemControls}>
                    <View style={styles.itemStepper}>
                      <TouchableOpacity style={styles.itemStepBtn}
                        onPress={() => updateQty(item.partId, String(Math.max(1, (parseInt(item.qty) || 1) - 1)))}>
                        <MaterialCommunityIcons name="minus" size={18} color={Colors.primary} />
                      </TouchableOpacity>
                      <TextInput value={item.qty} onChangeText={v => updateQty(item.partId, v)}
                        mode="flat" style={styles.itemStepInput} keyboardType="numeric"
                        underlineColor="transparent" activeUnderlineColor={Colors.primary} dense />
                      <TouchableOpacity style={styles.itemStepBtn}
                        onPress={() => updateQty(item.partId, String((parseInt(item.qty) || 0) + 1))}>
                        <MaterialCommunityIcons name="plus" size={18} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <TextInput label="Cost/unit" value={item.cost} onChangeText={v => updateCost(item.partId, v)}
                      mode="outlined" style={styles.itemCostInput} keyboardType="decimal-pad" dense />
                    <Text style={styles.itemTotal}>{formatCurrency((parseInt(item.qty) || 0) * (parseFloat(item.cost) || 0))}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Shared purchase details */}
        <View style={styles.formCard}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.info }]} />
              <Text style={styles.sectionLabel}>Purchase Details</Text>
            </View>
            <DatePickerField label="Date of Purchase" value={purchaseDate} onChange={setPurchaseDate} maxDate={new Date()} />
            <TextInput
              label="Supplier (optional)"
              value={supplier}
              onChangeText={(text) => {
                setSupplier(text);
                if (text.length >= 1) {
                  const filtered = supplierList.filter(s =>
                    s.name.toLowerCase().includes(text.toLowerCase())
                  );
                  setSupplierSuggestions(filtered);
                  setShowSupplierSuggestions(filtered.length > 0);
                } else {
                  setShowSupplierSuggestions(false);
                }
              }}
              onFocus={() => {
                if (supplierList.length > 0) {
                  setSupplierSuggestions(supplierList);
                  setShowSupplierSuggestions(true);
                }
              }}
              mode="outlined"
              style={[styles.input, { marginTop: 8 }]}
              dense
            />
            {showSupplierSuggestions && (
              <View style={styles.suggestionBox}>
                {supplierSuggestions.slice(0, 5).map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.suggestionItem}
                    onPress={() => { setSupplier(s.name); setShowSupplierSuggestions(false); }}
                  >
                    <Text style={styles.suggestionName}>{s.name}</Text>
                    {s.phone ? <Text style={styles.suggestionSub}>{s.phone}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TextInput label="Notes (optional)" value={notes} onChangeText={setNotes} mode="outlined" style={[styles.input, { marginTop: 8 }]} multiline dense />
          </View>
        </View>

        {/* Receipt */}
        <View style={styles.formCard}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.secondary }]} />
              <Text style={styles.sectionLabel}>Receipt / Photo (optional)</Text>
            </View>
            <ImagePickerField uri={image} onPicked={setImage} onClear={() => setImage(null)} />
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.grandLabel}>TOTAL EXPENSE</Text>
            <Text style={styles.grandVal}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>

        <Button mode="contained" onPress={handleSave} loading={saving}
          disabled={validItems.length === 0 || saving}
          style={styles.saveBtn} contentStyle={{ paddingVertical: 8 }} icon="check-circle">
          Save Restock ({validItems.length} item{validItems.length !== 1 ? 's' : ''})
        </Button>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F2F4F7' },
  container: { padding: 14, paddingBottom: 120, gap: 12 },
  formCard: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  section: { paddingHorizontal: 16, paddingVertical: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7 },
  emptyText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 12, fontStyle: 'italic' },
  itemRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.text, marginRight: 8 },
  itemControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemStepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.primary + '40', overflow: 'hidden' },
  itemStepBtn: { width: 34, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary + '08' },
  itemStepInput: { width: 46, textAlign: 'center', fontSize: 14, fontWeight: '700', backgroundColor: Colors.surface, height: 36 },
  itemCostInput: { flex: 1, backgroundColor: Colors.surface, fontSize: 13, height: 40 },
  itemTotal: { fontSize: 13, fontWeight: '700', color: Colors.primary, minWidth: 64, textAlign: 'right' },
  input: { backgroundColor: Colors.surface },
  suggestionBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, marginTop: 2, elevation: 6, overflow: 'hidden' },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  suggestionName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  suggestionSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  totalCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, elevation: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandLabel: { fontSize: 14, fontWeight: '800', color: Colors.text },
  grandVal: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  saveBtn: { borderRadius: 14 },
});
