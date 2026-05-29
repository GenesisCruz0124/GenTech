import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText, TextInput, Text } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useDeviceStore } from '../../store/deviceStore';
import { useCustomerStore } from '../../store/customerStore';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceSaleForm'>;

const schema = z.object({
  customerName: z.string().min(1, 'Required'),
  customerPhone: z.string().min(7, 'Valid phone required'),
  deviceName: z.string().min(1, 'Required'),
  deviceModel: z.string().min(1, 'Required'),
  imei: z.string().optional(),
  salePrice: z.string().min(1, 'Required'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function DeviceSaleFormScreen({ navigation }: Props) {
  const { addSale } = useDeviceStore();
  const { upsertByPhone } = useCustomerStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { customerName: '', customerPhone: '', deviceName: '', deviceModel: '', imei: '', salePrice: '', notes: '' },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const customerId = await upsertByPhone({ name: data.customerName, phone: data.customerPhone });
      await addSale({
        customer_id: customerId,
        device_name: data.deviceName,
        device_model: data.deviceModel,
        imei: data.imei || undefined,
        sale_price: parseFloat(data.salePrice),
        notes: data.notes || undefined,
      });
      navigation.goBack();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Customer Info</Text>
        <Controller control={control} name="customerName" render={({ field: { onChange, value } }) => (
          <TextInput label="Customer Name *" value={value} onChangeText={onChange} mode="outlined" style={styles.input} error={!!errors.customerName} />
        )} />
        <HelperText type="error" visible={!!errors.customerName}>{errors.customerName?.message}</HelperText>

        <Controller control={control} name="customerPhone" render={({ field: { onChange, value } }) => (
          <TextInput label="Phone Number *" value={value} onChangeText={onChange} mode="outlined" style={styles.input} keyboardType="phone-pad" error={!!errors.customerPhone} />
        )} />
        <HelperText type="error" visible={!!errors.customerPhone}>{errors.customerPhone?.message}</HelperText>

        <Text style={styles.section}>Device Info</Text>
        <Controller control={control} name="deviceName" render={({ field: { onChange, value } }) => (
          <TextInput label="Device Brand *" value={value} onChangeText={onChange} mode="outlined" style={styles.input} placeholder="e.g. Apple, Samsung" error={!!errors.deviceName} />
        )} />
        <HelperText type="error" visible={!!errors.deviceName}>{errors.deviceName?.message}</HelperText>

        <Controller control={control} name="deviceModel" render={({ field: { onChange, value } }) => (
          <TextInput label="Device Model *" value={value} onChangeText={onChange} mode="outlined" style={styles.input} placeholder="e.g. iPhone 13, A54" error={!!errors.deviceModel} />
        )} />
        <HelperText type="error" visible={!!errors.deviceModel}>{errors.deviceModel?.message}</HelperText>

        <Controller control={control} name="imei" render={({ field: { onChange, value } }) => (
          <TextInput label="IMEI (optional)" value={value} onChangeText={onChange} mode="outlined" style={styles.input} keyboardType="numeric" />
        )} />

        <Controller control={control} name="salePrice" render={({ field: { onChange, value } }) => (
          <TextInput label="Sale Price (₱) *" value={value} onChangeText={onChange} mode="outlined" style={styles.input} keyboardType="decimal-pad" error={!!errors.salePrice} />
        )} />
        <HelperText type="error" visible={!!errors.salePrice}>{errors.salePrice?.message}</HelperText>

        <Controller control={control} name="notes" render={({ field: { onChange, value } }) => (
          <TextInput label="Notes (optional)" value={value} onChangeText={onChange} mode="outlined" style={styles.input} multiline />
        )} />

        <Button mode="contained" onPress={handleSubmit(onSubmit)} loading={isSubmitting} disabled={isSubmitting} style={styles.button} contentStyle={styles.buttonContent}>
          Record Sale
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 16 },
  section: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginTop: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { marginBottom: 2, backgroundColor: Colors.surface },
  button: { marginTop: 16, borderRadius: 8 },
  buttonContent: { paddingVertical: 6 },
});
