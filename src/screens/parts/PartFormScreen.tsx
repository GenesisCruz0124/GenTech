import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, HelperText, Menu, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { usePartsStore } from '../../store/partsStore';
import { getPartById, getCompatibleModels, setCompatibleModels, CompatibleModel } from '../../repositories/partsRepository';
import { getAllCategories, Category } from '../../repositories/categoryRepository';
import { searchDeviceModels, createDeviceModel, DeviceModel } from '../../repositories/deviceModelRepository';
import { getAllDeviceBrands, DeviceBrand } from '../../repositories/deviceBrandRepository';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'PartForm'>;

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().optional(),
  quantity: z.string().min(1, 'Quantity is required'),
  low_stock_threshold: z.string().optional(),
  cost_price: z.string().min(1, 'Cost price is required'),
  selling_price: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const FIELDS = ['low_stock_threshold', 'cost_price'] as const;
const FIELD_LABELS: Record<typeof FIELDS[number], string> = {
  low_stock_threshold: 'Low Stock Alert At',
  cost_price: 'Cost Price (₱)',
};

export default function PartFormScreen({ route, navigation }: Props) {
  const { partId } = route.params ?? {};
  const { addPart, editPart } = usePartsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryInput, setCategoryInput] = useState('');
  const [categorySuggestions, setCategorySuggestions] = useState<Category[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  // Brand — auto-filled from selected model, or pick from existing brands
  const [brandId, setBrandId] = useState<number | null>(null);
  const [brandInput, setBrandInput] = useState('');
  const [brands, setBrands] = useState<DeviceBrand[]>([]);
  const [brandSuggestions, setBrandSuggestions] = useState<DeviceBrand[]>([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);

  // Model autocomplete
  const [modelSuggestions, setModelSuggestions] = useState<DeviceModel[]>([]);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);

  // Compatible models — multi-select, with ability to add a new model
  const [compatibleModels, setCompatibleModelsList] = useState<CompatibleModel[]>([]);
  const [compatibleInput, setCompatibleInput] = useState('');
  const [compatibleSuggestions, setCompatibleSuggestions] = useState<DeviceModel[]>([]);
  const [showCompatibleSuggestions, setShowCompatibleSuggestions] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', quantity: '0', low_stock_threshold: '2', cost_price: '0' },
  });

  useEffect(() => {
    getAllCategories().then(setCategories);
    getAllDeviceBrands().then(setBrands);
    if (partId) {
      getPartById(partId).then(p => {
        if (p) {
          reset({
            name: p.name,
            quantity: String(p.quantity),
            low_stock_threshold: String(p.low_stock_threshold),
            cost_price: String(p.cost_price),
          });
          setCategoryId(p.category_id);
          if (p.category_name) setCategoryInput(p.category_name);
          setBrandId(p.brand_id);
          if (p.brand_name) setBrandInput(p.brand_name);
        }
      });
      getCompatibleModels(partId).then(setCompatibleModelsList);
    }
  }, [partId]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        quantity: parseInt(data.quantity),
        low_stock_threshold: parseInt(data.low_stock_threshold || '5'),
        cost_price: parseFloat(data.cost_price),
        selling_price: 0,
        category_id: categoryId ?? undefined,
        brand_id: brandId ?? undefined,
      };
      const targetId = partId ?? await addPart(payload);
      if (partId) {
        await editPart(partId, payload);
      }
      await setCompatibleModels(targetId, compatibleModels.map(m => m.id));
      navigation.goBack();
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={styles.formCard}>

          {/* Model */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldGroupHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.info }]} />
              <Text style={styles.groupLabel}>Device Model</Text>
            </View>
            <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
              <>
                <TextInput label="Model *" value={value} onChangeText={async (text) => {
                  onChange(text);
                  if (text.length >= 2) { const r = await searchDeviceModels(text); setModelSuggestions(r); setShowModelSuggestions(r.length > 0); }
                  else { setShowModelSuggestions(false); }
                }} mode="outlined" style={styles.input} placeholder="e.g. iPhone 13, Galaxy A54..." error={!!errors.name} />
                {showModelSuggestions && (
                  <View style={styles.suggestionBox}>
                    {modelSuggestions.map(m => (
                      <TouchableOpacity key={m.id} style={styles.suggestionItem}
                        onPress={() => {
                          onChange(m.name);
                          setShowModelSuggestions(false);
                          if (m.brand_id && m.brand_name) {
                            setBrandId(m.brand_id);
                            setBrandInput(m.brand_name);
                          }
                        }}>
                        <Text style={styles.suggestionText}>{m.name}</Text>
                        {m.brand_name ? <Text style={styles.suggestionSub}>{m.brand_name}</Text> : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <HelperText type="error" visible={!!errors.name}>{errors.name?.message}</HelperText>
              </>
            )} />
          </View>

          <View style={styles.divider} />

          {/* Brand — auto-filled from selected model, or pick from existing brands */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldGroupHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.groupLabel}>Brand</Text>
            </View>
            <TextInput label="Brand" value={brandInput} onChangeText={(text) => {
              setBrandInput(text); setBrandId(null);
              const f = text.length >= 1 ? brands.filter(b => b.name.toLowerCase().includes(text.toLowerCase())) : brands;
              setBrandSuggestions(f); setShowBrandSuggestions(f.length > 0);
            }} onFocus={() => { setBrandSuggestions(brands); setShowBrandSuggestions(brands.length > 0); }}
              mode="outlined" style={styles.input} placeholder="e.g. Apple, Samsung, Xiaomi..."
              right={brandId ? <TextInput.Icon icon="check-circle" color={Colors.success} /> : undefined} />
            {showBrandSuggestions && (
              <View style={styles.suggestionBox}>
                {brandSuggestions.map(b => (
                  <TouchableOpacity key={b.id} style={styles.suggestionItem}
                    onPress={() => { setBrandId(b.id); setBrandInput(b.name); setShowBrandSuggestions(false); }}>
                    <Text style={styles.suggestionText}>{b.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <HelperText type="info" visible={!brandId}>Auto-fills from model, or pick from existing brands</HelperText>
          </View>

          <View style={styles.divider} />

          {/* Compatible Models */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldGroupHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.warning }]} />
              <Text style={styles.groupLabel}>Compatible Models</Text>
            </View>
            {compatibleModels.length > 0 && (
              <View style={styles.chipsRow}>
                {compatibleModels.map(m => (
                  <View key={m.id} style={styles.modelChip}>
                    <Text style={styles.modelChipText}>{m.name}</Text>
                    <TouchableOpacity onPress={() => setCompatibleModelsList(list => list.filter(x => x.id !== m.id))}>
                      <MaterialCommunityIcons name="close" size={14} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <TextInput label="Add Compatible Model" value={compatibleInput} onChangeText={async (text) => {
              setCompatibleInput(text);
              if (text.length >= 2) {
                const r = await searchDeviceModels(text);
                setCompatibleSuggestions(r);
                setShowCompatibleSuggestions(true);
              } else {
                setShowCompatibleSuggestions(false);
              }
            }} mode="outlined" style={styles.input} placeholder="Search or type a new model..." />
            {showCompatibleSuggestions && (
              <View style={styles.suggestionBox}>
                {compatibleSuggestions
                  .filter(m => !compatibleModels.some(c => c.id === m.id))
                  .map(m => (
                    <TouchableOpacity key={m.id} style={styles.suggestionItem}
                      onPress={() => {
                        setCompatibleModelsList(list => [...list, { id: m.id, name: m.name }]);
                        setCompatibleInput('');
                        setShowCompatibleSuggestions(false);
                      }}>
                      <Text style={styles.suggestionText}>{m.name}</Text>
                      {m.brand_name ? <Text style={styles.suggestionSub}>{m.brand_name}</Text> : null}
                    </TouchableOpacity>
                  ))}
                {compatibleInput.trim().length >= 2 &&
                  !compatibleSuggestions.some(m => m.name.toLowerCase() === compatibleInput.trim().toLowerCase()) && (
                    <TouchableOpacity style={styles.suggestionItem}
                      onPress={async () => {
                        const name = compatibleInput.trim();
                        const newId = await createDeviceModel(name, brandId ?? undefined);
                        setCompatibleModelsList(list => [...list, { id: newId, name }]);
                        setCompatibleInput('');
                        setShowCompatibleSuggestions(false);
                      }}>
                      <Text style={[styles.suggestionText, { color: Colors.primary }]}>
                        + Add "{compatibleInput.trim()}" as new model
                      </Text>
                    </TouchableOpacity>
                  )}
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Category */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldGroupHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.secondary }]} />
              <Text style={styles.groupLabel}>Category</Text>
            </View>
            <TextInput label="Category" value={categoryInput} onChangeText={(text) => {
              setCategoryInput(text); setCategoryId(null);
              const f = text.length >= 1 ? categories.filter(c => c.name.toLowerCase().includes(text.toLowerCase())) : categories;
              setCategorySuggestions(f); setShowCategorySuggestions(f.length > 0 && text.length >= 1);
            }} mode="outlined" style={styles.input} placeholder="e.g. Display, Battery, Camera..." />
            {showCategorySuggestions && (
              <View style={styles.suggestionBox}>
                {categorySuggestions.map(c => (
                  <TouchableOpacity key={c.id} style={styles.suggestionItem}
                    onPress={() => { setCategoryId(c.id); setCategoryInput(c.name); setShowCategorySuggestions(false); }}>
                    <Text style={styles.suggestionText}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Stock details */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldGroupHeader}>
              <View style={[styles.dot, { backgroundColor: Colors.success }]} />
              <Text style={styles.groupLabel}>Stock Details</Text>
            </View>

            {/* Quantity stepper */}
            <Controller control={control} name="quantity" render={({ field: { onChange, value } }) => {
              const qty = parseInt(value) || 0;
              return (
                <View style={styles.stepperRow}>
                  <Text style={styles.stepperLabel}>Quantity</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepBtn}
                      onPress={() => onChange(String(Math.max(0, qty - 1)))}>
                      <MaterialCommunityIcons name="minus" size={20} color={qty <= 0 ? Colors.border : Colors.primary} />
                    </TouchableOpacity>
                    <TextInput
                      value={value}
                      onChangeText={v => onChange(v.replace(/[^0-9]/g, ''))}
                      mode="flat"
                      style={styles.stepperInput}
                      keyboardType="numeric"
                      underlineColor="transparent"
                      activeUnderlineColor={Colors.primary}
                      dense
                    />
                    <TouchableOpacity style={styles.stepBtn}
                      onPress={() => onChange(String(qty + 1))}>
                      <MaterialCommunityIcons name="plus" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }} />

            {FIELDS.map(field => (
              <Controller key={field} control={control} name={field} render={({ field: { onChange, value } }) => (
                <>
                  <TextInput label={FIELD_LABELS[field]} value={value} onChangeText={onChange} mode="outlined" style={styles.input}
                    keyboardType="decimal-pad"
                    error={!!errors[field]} />
                  <HelperText type="error" visible={!!errors[field]}>{errors[field]?.message}</HelperText>
                </>
              )} />
            ))}
          </View>

        </View>

        <Button mode="contained" onPress={handleSubmit(onSubmit)} loading={isSubmitting} disabled={isSubmitting}
          style={styles.button} contentStyle={styles.buttonContent} icon="check-circle">
          {partId ? 'Save Changes' : 'Add Stock'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F2F4F7' },
  container: { padding: 14, paddingBottom: 120, gap: 12 },

  // Unified form card
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  fieldGroup: { paddingHorizontal: 16, paddingVertical: 14 },
  fieldGroupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  groupLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },

  input: { marginBottom: 2, backgroundColor: Colors.surface },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  modelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '12',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  modelChipText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingVertical: 4 },
  stepperLabel: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  stepBtn: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  stepperInput: { width: 56, textAlign: 'center', fontSize: 18, fontWeight: '700', backgroundColor: Colors.surface, height: 42 },
  suggestionBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, marginTop: 2, marginBottom: 4, elevation: 6, overflow: 'hidden' },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  suggestionText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  suggestionSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  // kept for safety
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  pickerField: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  pickerLabel: { fontSize: 11, color: Colors.textSecondary, marginRight: 6 },
  pickerValue: { flex: 1, fontSize: 14, color: Colors.text },
  pickerPlaceholder: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  catLabel: { fontSize: 12, color: Colors.textSecondary },
  catPicker: { padding: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  catSelected: { fontSize: 16, color: Colors.text },
  catPlaceholder: { fontSize: 16, color: Colors.textSecondary },

  button: { borderRadius: 14 },
  buttonContent: { paddingVertical: 10 },
});
