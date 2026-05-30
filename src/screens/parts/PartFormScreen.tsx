import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, HelperText, Menu, Text, TextInput } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { usePartsStore } from '../../store/partsStore';
import { getPartById } from '../../repositories/partsRepository';
import { getAllCategories, Category } from '../../repositories/categoryRepository';
import { getAllDeviceBrands, DeviceBrand } from '../../repositories/deviceBrandRepository';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'PartForm'>;

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().optional(),
  quantity: z.string().min(1, 'Quantity is required'),
  low_stock_threshold: z.string().optional(),
  cost_price: z.string().min(1, 'Cost price is required'),
  selling_price: z.string().min(1, 'Selling price is required'),
});

type FormData = z.infer<typeof schema>;

const FIELDS = ['name', 'sku', 'quantity', 'low_stock_threshold', 'cost_price', 'selling_price'] as const;
const FIELD_LABELS: Record<typeof FIELDS[number], string> = {
  name: 'Part Name *',
  sku: 'SKU (optional)',
  quantity: 'Quantity *',
  low_stock_threshold: 'Low Stock Alert At',
  cost_price: 'Cost Price (₱) *',
  selling_price: 'Selling Price (₱) *',
};

export default function PartFormScreen({ route, navigation }: Props) {
  const { partId } = route.params ?? {};
  const { addPart, editPart } = usePartsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [brands, setBrands] = useState<DeviceBrand[]>([]);
  const [brandId, setBrandId] = useState<number | null>(null);
  const [brandMenuVisible, setBrandMenuVisible] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', sku: '', quantity: '0', low_stock_threshold: '2', cost_price: '', selling_price: '' },
  });

  useEffect(() => {
    getAllCategories().then(setCategories);
    getAllDeviceBrands().then(setBrands);
    if (partId) {
      getPartById(partId).then(p => {
        if (p) {
          reset({
            name: p.name,
            sku: p.sku ?? '',
            quantity: String(p.quantity),
            low_stock_threshold: String(p.low_stock_threshold),
            cost_price: String(p.cost_price),
            selling_price: String(p.selling_price),
          });
          setCategoryId(p.category_id);
          setBrandId(p.brand_id);
        }
      });
    }
  }, [partId]);

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedBrand = brands.find(b => b.id === brandId);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        sku: data.sku || undefined,
        quantity: parseInt(data.quantity),
        low_stock_threshold: parseInt(data.low_stock_threshold || '5'),
        cost_price: parseFloat(data.cost_price),
        selling_price: parseFloat(data.selling_price),
        category_id: categoryId ?? undefined,
        brand_id: brandId ?? undefined,
      };
      if (partId) {
        await editPart(partId, payload);
      } else {
        await addPart(payload);
      }
      navigation.goBack();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* 1. Device Brand */}
        <Text style={styles.catLabel}>Device Brand (optional)</Text>
        <Menu
          visible={brandMenuVisible}
          onDismiss={() => setBrandMenuVisible(false)}
          anchor={
            <TouchableOpacity style={styles.catPicker} onPress={() => setBrandMenuVisible(true)}>
              <Text style={selectedBrand ? styles.catSelected : styles.catPlaceholder}>
                {selectedBrand ? selectedBrand.name : 'Select a brand...'}
              </Text>
            </TouchableOpacity>
          }
        >
          <Menu.Item title="— None —" onPress={() => { setBrandId(null); setBrandMenuVisible(false); }} />
          {brands.map(b => (
            <Menu.Item key={b.id} title={b.name} onPress={() => { setBrandId(b.id); setBrandMenuVisible(false); }} />
          ))}
        </Menu>

        {/* 2. Category */}
        <Text style={styles.catLabel}>Category (optional)</Text>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity style={styles.catPicker} onPress={() => setMenuVisible(true)}>
              <Text style={selectedCategory ? styles.catSelected : styles.catPlaceholder}>
                {selectedCategory ? selectedCategory.name : 'Select a category...'}
              </Text>
            </TouchableOpacity>
          }
        >
          <Menu.Item title="— None —" onPress={() => { setCategoryId(null); setMenuVisible(false); }} />
          {categories.map(c => (
            <Menu.Item key={c.id} title={c.name} onPress={() => { setCategoryId(c.id); setMenuVisible(false); }} />
          ))}
        </Menu>

        {/* 3. Rest of the fields */}
        {FIELDS.map(field => (
          <Controller key={field} control={control} name={field} render={({ field: { onChange, value } }) => (
            <>
              <TextInput
                label={FIELD_LABELS[field]}
                value={value}
                onChangeText={onChange}
                mode="outlined"
                style={styles.input}
                keyboardType={['quantity', 'low_stock_threshold', 'cost_price', 'selling_price'].includes(field) ? 'decimal-pad' : 'default'}
                error={!!errors[field]}
              />
              <HelperText type="error" visible={!!errors[field]}>{errors[field]?.message}</HelperText>
            </>
          )} />
        ))}

        <Button mode="contained" onPress={handleSubmit(onSubmit)} loading={isSubmitting} disabled={isSubmitting} style={styles.button} contentStyle={styles.buttonContent}>
          {partId ? 'Save Changes' : 'Add Part'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 16 },
  input: { marginBottom: 2, backgroundColor: Colors.surface },
  catLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 8, marginBottom: 4 },
  catPicker: { borderWidth: 1, borderColor: Colors.border, borderRadius: 4, padding: 14, backgroundColor: Colors.surface, marginBottom: 8 },
  catSelected: { fontSize: 16, color: Colors.text },
  catPlaceholder: { fontSize: 16, color: Colors.textSecondary },
  button: { marginTop: 16, borderRadius: 8 },
  buttonContent: { paddingVertical: 6 },
});
