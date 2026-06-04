import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { recordPartsPurchase } from '../../repositories/partsRepository';
import { getAllSuppliers, createSupplier, Supplier } from '../../repositories/supplierRepository';
import DatePickerField from '../../components/common/DatePickerField';
import ImagePickerField from '../../components/common/ImagePickerField';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Restock'>;

export default function RestockScreen({ route, navigation }: Props) {
  const { partId, partName, costPrice } = route.params;

  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState(String(costPrice || '0'));
  const [supplier, setSupplier] = useState('');
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
  const [supplierSuggestions, setSupplierSuggestions] = useState<Supplier[]>([]);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getAllSuppliers().then(setSupplierList).catch(() => {}); }, []);

  const handleSave = async () => {
    setSaving(true);
    const supplierName = supplier.trim();
    // Auto-create supplier if a name was typed but doesn't exist in the list
    if (supplierName) {
      const exists = supplierList.some(s => s.name.toLowerCase() === supplierName.toLowerCase());
      if (!exists) {
        try { await createSupplier({ name: supplierName }); } catch {}
      }
    }
    await recordPartsPurchase({
      part_id: partId,
      quantity: parseInt(qty) || 1,
      cost_price: parseFloat(cost) || 0,
      supplier_name: supplierName || undefined,
      notes: notes.trim() || undefined,
      image_uri: image || undefined,
      purchased_at: purchaseDate || undefined,
    });
    setSaving(false);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={styles.formCard}>

          {/* Quantity */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.sectionLabel}>Quantity</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setQty(String(Math.max(1, (parseInt(qty) || 1) - 1)))}>
                <MaterialCommunityIcons name="minus" size={22} color={Colors.primary} />
              </TouchableOpacity>
              <TextInput value={qty} onChangeText={v => setQty(v.replace(/[^0-9]/g, '') || '1')}
                mode="flat" style={styles.stepInput} keyboardType="numeric"
                underlineColor="transparent" activeUnderlineColor={Colors.primary} dense />
              <TouchableOpacity style={styles.stepBtn} onPress={() => setQty(String((parseInt(qty) || 0) + 1))}>
                <MaterialCommunityIcons name="plus" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Cost */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.success }]} />
              <Text style={styles.sectionLabel}>Cost per Unit (₱)</Text>
            </View>
            <TextInput value={cost} onChangeText={setCost} mode="outlined" style={styles.input} keyboardType="decimal-pad" dense />
          </View>

          <View style={styles.divider} />

          {/* Date & Supplier */}
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

          <View style={styles.divider} />

          {/* Photo */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.secondary }]} />
              <Text style={styles.sectionLabel}>Receipt / Photo (optional)</Text>
            </View>
            <ImagePickerField uri={image} onPicked={setImage} onClear={() => setImage(null)} />
          </View>

        </View>

        <Button mode="contained" onPress={handleSave} loading={saving}
          disabled={!qty.trim() || saving}
          style={styles.saveBtn} contentStyle={{ paddingVertical: 8 }} icon="check-circle">
          Save Restock
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
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary + '40', overflow: 'hidden', alignSelf: 'flex-start' },
  stepBtn: { width: 46, height: 46, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary + '08' },
  stepInput: { width: 64, textAlign: 'center', fontSize: 20, fontWeight: '800', backgroundColor: Colors.surface, height: 46 },
  input: { backgroundColor: Colors.surface },
  suggestionBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, marginTop: 2, elevation: 6, overflow: 'hidden' },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  suggestionName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  suggestionSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  saveBtn: { borderRadius: 14 },
});
