import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, HelperText, TextInput, Text } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useRepairStore } from '../../store/repairStore';
import { useCustomerStore } from '../../store/customerStore';
import { useStaffStore } from '../../store/staffStore';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'NewRepair'>;

const schema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(7, 'Valid phone number required'),
  deviceModel: z.string().min(1, 'Device model is required'),
  issueDesc: z.string().min(1, 'Issue description is required'),
  estimatedCost: z.string().min(1, 'Estimated cost is required'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewRepairScreen({ navigation }: Props) {
  const { addRepair } = useRepairStore();
  const { upsertByPhone } = useCustomerStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { customerName: '', customerPhone: '', deviceModel: '', issueDesc: '', estimatedCost: '', notes: '' },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const customerId = await upsertByPhone({
        name: data.customerName,
        phone: data.customerPhone,
      });
      const repairId = await addRepair({
        customer_id: customerId,
        device_model: data.deviceModel,
        issue_desc: data.issueDesc,
        estimated_cost: parseFloat(data.estimatedCost),
        notes: data.notes || undefined,
      });
      navigation.replace('RepairDetail', { repairId });
    } catch (e) {
      console.error(e);
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

        <Text style={styles.section}>Device & Issue</Text>

        <Controller control={control} name="deviceModel" render={({ field: { onChange, value } }) => (
          <TextInput label="Device Model *" value={value} onChangeText={onChange} mode="outlined" style={styles.input} placeholder="e.g. iPhone 13, Samsung A54" error={!!errors.deviceModel} />
        )} />
        <HelperText type="error" visible={!!errors.deviceModel}>{errors.deviceModel?.message}</HelperText>

        <Controller control={control} name="issueDesc" render={({ field: { onChange, value } }) => (
          <TextInput label="Issue Description *" value={value} onChangeText={onChange} mode="outlined" style={styles.input} multiline numberOfLines={3} error={!!errors.issueDesc} />
        )} />
        <HelperText type="error" visible={!!errors.issueDesc}>{errors.issueDesc?.message}</HelperText>

        <Controller control={control} name="estimatedCost" render={({ field: { onChange, value } }) => (
          <TextInput label="Estimated Cost (₱) *" value={value} onChangeText={onChange} mode="outlined" style={styles.input} keyboardType="decimal-pad" error={!!errors.estimatedCost} />
        )} />
        <HelperText type="error" visible={!!errors.estimatedCost}>{errors.estimatedCost?.message}</HelperText>

        <Controller control={control} name="notes" render={({ field: { onChange, value } }) => (
          <TextInput label="Notes (optional)" value={value} onChangeText={onChange} mode="outlined" style={styles.input} multiline numberOfLines={2} />
        )} />

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Create Repair
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
