import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { usePartsStore } from '../../store/partsStore';
import { getPartById } from '../../repositories/partsRepository';
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

export default function PartFormScreen({ route, navigation }: Props) {
  const { partId } = route.params ?? {};
  const { addPart, editPart } = usePartsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', sku: '', quantity: '0', low_stock_threshold: '5', cost_price: '', selling_price: '' },
  });

  useEffect(() => {
    if (partId) {
      getPartById(partId).then(p => {
        if (p) reset({
          name: p.name,
          sku: p.sku ?? '',
          quantity: String(p.quantity),
          low_stock_threshold: String(p.low_stock_threshold),
          cost_price: String(p.cost_price),
          selling_price: String(p.selling_price),
        });
      });
    }
  }, [partId]);

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
        {(['name', 'sku', 'quantity', 'low_stock_threshold', 'cost_price', 'selling_price'] as const).map(field => (
          <Controller key={field} control={control} name={field} render={({ field: { onChange, value } }) => (
            <>
              <TextInput
                label={{ name: 'Part Name *', sku: 'SKU (optional)', quantity: 'Quantity *', low_stock_threshold: 'Low Stock Alert At', cost_price: 'Cost Price (₱) *', selling_price: 'Selling Price (₱) *' }[field]}
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
  button: { marginTop: 16, borderRadius: 8 },
  buttonContent: { paddingVertical: 6 },
});
