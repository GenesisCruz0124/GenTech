import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, HelperText, TextInput, Text } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useDeviceStore } from '../../store/deviceStore';
import { useCustomerStore } from '../../store/customerStore';
import { searchCustomers, Customer } from '../../repositories/customerRepository';
import { searchDeviceModels, DeviceModel } from '../../repositories/deviceModelRepository';
import ImagePickerField from '../../components/common/ImagePickerField';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'DevicePurchaseForm'>;

const schema = z.object({
  sellerName: z.string().min(1, 'Seller name is required'),
  deviceModel: z.string().min(1, 'Device model is required'),
  purchasePrice: z.string().min(1, 'Purchase price is required'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function DevicePurchaseFormScreen({ navigation }: Props) {
  const { addPurchase } = useDeviceStore();
  const { upsertByPhone } = useCustomerStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Customer autocomplete
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // Device model autocomplete
  const [modelSuggestions, setModelSuggestions] = useState<DeviceModel[]>([]);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sellerName: '', deviceModel: '', purchasePrice: '', notes: '' },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const customerId = await upsertByPhone({ name: data.sellerName, phone: '' });
      await addPurchase({
        customer_id: customerId,
        device_name: data.deviceModel,
        device_model: data.deviceModel,
        purchase_price: parseFloat(data.purchasePrice),
        notes: data.notes || undefined,
        image_uri: imageUri || undefined,
      });
      navigation.goBack();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
        <Text style={styles.section}>Seller Info</Text>

        <Controller control={control} name="sellerName" render={({ field: { onChange, value } }) => (
          <>
            <TextInput
              label="Seller Name *"
              value={value}
              onChangeText={async (text) => {
                onChange(text);
                if (text.length >= 2) {
                  const results = await searchCustomers(text);
                  setCustomerSuggestions(results);
                  setShowCustomerSuggestions(results.length > 0);
                } else {
                  setShowCustomerSuggestions(false);
                }
              }}
              mode="outlined"
              style={styles.input}
              error={!!errors.sellerName}
            />
            {showCustomerSuggestions && (
              <View style={styles.suggestionBox}>
                {customerSuggestions.map(c => (
                  <TouchableOpacity key={c.id} style={styles.suggestionItem}
                    onPress={() => { onChange(c.name); setShowCustomerSuggestions(false); }}>
                    <Text style={styles.suggestionName}>{c.name}</Text>
                    {c.phone ? <Text style={styles.suggestionSub}>{c.phone}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )} />
        <HelperText type="error" visible={!!errors.sellerName}>{errors.sellerName?.message}</HelperText>

        </View>
        <View style={styles.card}>
        <Text style={styles.section}>Device Info</Text>

        <Controller control={control} name="deviceModel" render={({ field: { onChange, value } }) => (
          <>
            <TextInput
              label="Device Model *"
              value={value}
              onChangeText={async (text) => {
                onChange(text);
                if (text.length >= 2) {
                  const results = await searchDeviceModels(text);
                  setModelSuggestions(results);
                  setShowModelSuggestions(results.length > 0);
                } else {
                  setShowModelSuggestions(false);
                }
              }}
              mode="outlined"
              style={styles.input}
              placeholder="e.g. iPhone 13, Samsung A54"
              error={!!errors.deviceModel}
            />
            {showModelSuggestions && (
              <View style={styles.suggestionBox}>
                {modelSuggestions.map(m => (
                  <TouchableOpacity key={m.id} style={styles.suggestionItem}
                    onPress={() => { onChange(m.name); setShowModelSuggestions(false); }}>
                    <Text style={styles.suggestionName}>{m.name}</Text>
                    {m.brand_name ? <Text style={styles.suggestionSub}>{m.brand_name}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )} />
        <HelperText type="error" visible={!!errors.deviceModel}>{errors.deviceModel?.message}</HelperText>

        <Controller control={control} name="purchasePrice" render={({ field: { onChange, value } }) => (
          <TextInput label="Purchase Price (₱) *" value={value} onChangeText={onChange} mode="outlined" style={styles.input} keyboardType="decimal-pad" error={!!errors.purchasePrice} />
        )} />
        <HelperText type="error" visible={!!errors.purchasePrice}>{errors.purchasePrice?.message}</HelperText>

        <Controller control={control} name="notes" render={({ field: { onChange, value } }) => (
          <TextInput label="Notes (optional)" value={value} onChangeText={onChange} mode="outlined" style={styles.input} multiline />
        )} />

        <Text style={styles.section}>Photo (optional)</Text>
        <ImagePickerField uri={imageUri} onPicked={setImageUri} onClear={() => setImageUri(null)} />

        </View>
        <Button mode="contained" icon="check-circle" onPress={handleSubmit(onSubmit)} loading={isSubmitting} disabled={isSubmitting} style={styles.button} contentStyle={styles.buttonContent}>
          Record Purchase
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 12, paddingBottom: 32, gap: 10 },
  section: { fontSize: 12, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  input: { marginBottom: 4, backgroundColor: Colors.surface },
  suggestionBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, marginTop: 2, marginBottom: 6, elevation: 6, overflow: 'hidden' },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border },
  suggestionName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  suggestionSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  button: { borderRadius: 12 },
  buttonContent: { paddingVertical: 8 },
});
