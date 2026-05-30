import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { Button, HelperText, IconButton, TextInput, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Linking } from 'react-native';
import MultiImagePicker from '../../components/common/MultiImagePicker';
import { saveRepairImage } from '../../repositories/repairImageRepository';
import { RootStackParamList } from '../../navigation/types';
import { useRepairStore } from '../../store/repairStore';
import { useCustomerStore } from '../../store/customerStore';
import { getAllIssues, Issue } from '../../repositories/issueRepository';
import { Customer, searchCustomers } from '../../repositories/customerRepository';
import { Part, getAllParts } from '../../repositories/partsRepository';
import { addRepairPart } from '../../repositories/partsRepository';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'NewRepair'>;

const schema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().optional(),
  deviceModel: z.string().min(1, 'Device model is required'),
  estimatedCost: z.string().min(1, 'Estimated cost is required'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewRepairScreen({ navigation }: Props) {
  const { addRepair } = useRepairStore();
  const { upsertByPhone } = useCustomerStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Parts required
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [selectedParts, setSelectedParts] = useState<{ part: Part; qty: number }[]>([]);
  const [partPickerVisible, setPartPickerVisible] = useState(false);

  useEffect(() => {
    getAllIssues().then(setIssues);
    getAllParts().then(setAllParts);
  }, []);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { customerName: '', customerPhone: '', deviceModel: '', estimatedCost: '', notes: '' },
  });

  const toggleIssue = (name: string) => {
    setSelectedIssues(prev =>
      prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
    );
  };

  const handleCameraSearch = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Camera access is needed to identify the device.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
    if (result.canceled || !result.assets[0]) return;

    const tempUri = result.assets[0].uri;

    // Copy to a persistent path so the share sheet can read it
    const destDir = FileSystem.documentDirectory + 'lens_temp/';
    await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
    const destUri = destDir + `capture_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: tempUri, to: destUri });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      // Share sheet on Android includes Google Lens when the Google app is installed
      await Sharing.shareAsync(destUri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Select Google Lens to identify the device',
        UTI: 'public.jpeg',
      });
    } else {
      // Last resort: open Google Lens app without image — user can tap the camera inside Lens
      const lensUrl = 'googlelens://';
      const canOpenLens = await Linking.canOpenURL(lensUrl);
      if (canOpenLens) {
        await Linking.openURL(lensUrl);
      } else {
        Alert.alert(
          'Google Lens not available',
          'Install the Google app from the Play Store, then try again.'
        );
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    if (selectedIssues.length === 0) {
      Alert.alert('Issue required', 'Please select at least one issue.');
      return;
    }
    setIsSubmitting(true);
    try {
      const customerId = await upsertByPhone({
        name: data.customerName,
        phone: data.customerPhone || '',
      });
      const repairId = await addRepair({
        customer_id: customerId,
        device_model: data.deviceModel,
        issue_desc: selectedIssues.join(', '),
        estimated_cost: parseFloat(data.estimatedCost),
        notes: data.notes || undefined,
      });
      // Save photos
      for (const uri of photos) {
        await saveRepairImage(repairId, uri);
      }
      // Deduct parts from inventory
      for (const { part, qty } of selectedParts) {
        await addRepairPart(repairId, part.id, qty, part.selling_price);
      }
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

        <Controller control={control} name="customerName" render={({ field: { onChange, value, onBlur } }) => (
          <>
            <TextInput
              label="Customer Name *"
              value={value}
              onChangeText={async (text) => {
                onChange(text);
                if (text.length >= 2) {
                  const results = await searchCustomers(text);
                  setSuggestions(results);
                  setShowSuggestions(results.length > 0);
                } else {
                  setShowSuggestions(false);
                }
              }}
              mode="outlined"
              style={styles.input}
              error={!!errors.customerName}
            />
            {showSuggestions && (
              <View style={styles.suggestionBox}>
                {suggestions.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.suggestionItem}
                    onPress={() => {
                      onChange(c.name);
                      // Also fill phone via setValue equivalent — use setValue from useForm
                      setShowSuggestions(false);
                      setSuggestions([]);
                      setValue('customerPhone', c.phone ?? '');
                    }}
                  >
                    <Text style={styles.suggestionName}>{c.name}</Text>
                    <Text style={styles.suggestionPhone}>{c.phone}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )} />
        <HelperText type="error" visible={!!errors.customerName}>{errors.customerName?.message}</HelperText>

        <Controller control={control} name="customerPhone" render={({ field: { onChange, value } }) => (
          <TextInput
            label="Phone Number"
            value={value}
            onChangeText={onChange}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
          />
        )} />

        <Text style={styles.section}>Device</Text>

        <View style={styles.deviceRow}>
          <Controller control={control} name="deviceModel" render={({ field: { onChange, value } }) => (
            <TextInput
              label="Device Model *"
              value={value}
              onChangeText={onChange}
              mode="outlined"
              style={styles.deviceInput}
              placeholder="e.g. iPhone 13, Samsung A54"
              error={!!errors.deviceModel}
            />
          )} />
          <TouchableOpacity style={styles.cameraBtn} onPress={handleCameraSearch}>
            <MaterialCommunityIcons name="camera-outline" size={26} color={Colors.primary} />
            <Text style={styles.cameraBtnLabel}>Identify</Text>
          </TouchableOpacity>
        </View>
        <HelperText type="error" visible={!!errors.deviceModel}>{errors.deviceModel?.message}</HelperText>
        <Text style={styles.cameraHint}>Tap the camera to photo the device and search via Google Lens</Text>

        <Text style={styles.section}>Issue(s)</Text>
        {selectedIssues.length > 0 && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedText}>{selectedIssues.join(' · ')}</Text>
          </View>
        )}
        <View style={styles.issueChips}>
          {issues.map(issue => {
            const active = selectedIssues.includes(issue.name);
            return (
              <TouchableOpacity
                key={issue.id}
                style={[styles.issueChip, active && styles.issueChipActive]}
                onPress={() => toggleIssue(issue.name)}
                activeOpacity={0.7}
              >
                {active && <MaterialCommunityIcons name="check" size={13} color="#fff" style={{ marginRight: 3 }} />}
                <Text style={[styles.issueChipLabel, active && styles.issueChipLabelActive]}>
                  {issue.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Parts Required */}
        <Text style={styles.section}>Parts Required</Text>
        {selectedParts.map(({ part, qty }) => (
          <View key={part.id} style={styles.partRow}>
            <View style={styles.partInfo}>
              <Text style={styles.partName}>{part.name}</Text>
              <Text style={styles.partMeta}>
                {part.quantity} in stock · ₱{part.selling_price}
              </Text>
            </View>
            <View style={styles.partQtyRow}>
              <TouchableOpacity onPress={() => setSelectedParts(p => p.map(x => x.part.id === part.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}>
                <MaterialCommunityIcons name="minus-circle-outline" size={22} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.partQty}>{qty}</Text>
              <TouchableOpacity onPress={() => setSelectedParts(p => p.map(x => x.part.id === part.id ? { ...x, qty: Math.min(x.part.quantity, x.qty + 1) } : x))}>
                <MaterialCommunityIcons name="plus-circle-outline" size={22} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedParts(p => p.filter(x => x.part.id !== part.id))} style={{ marginLeft: 8 }}>
                <MaterialCommunityIcons name="close-circle-outline" size={22} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <Button mode="outlined" icon="plus" onPress={() => setPartPickerVisible(true)} style={styles.addPartBtn}>
          Add Part
        </Button>
        {partPickerVisible && (
          <View style={styles.partPicker}>
            {allParts.filter(p => p.quantity > 0 && !selectedParts.find(s => s.part.id === p.id)).map(part => (
              <TouchableOpacity
                key={part.id}
                style={styles.partPickerItem}
                onPress={() => {
                  setSelectedParts(prev => [...prev, { part, qty: 1 }]);
                  setPartPickerVisible(false);
                }}
              >
                <Text style={styles.partName}>{part.name}</Text>
                <Text style={styles.partMeta}>{part.quantity} in stock · ₱{part.selling_price}</Text>
              </TouchableOpacity>
            ))}
            {allParts.filter(p => p.quantity > 0 && !selectedParts.find(s => s.part.id === p.id)).length === 0 && (
              <Text style={styles.partMeta}>No available parts in stock.</Text>
            )}
          </View>
        )}

        <Text style={styles.section}>Photos</Text>
        <MultiImagePicker images={photos} onChange={setPhotos} maxImages={6} />

        <Text style={styles.section}>Cost & Notes</Text>

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
  container: { padding: 16, paddingBottom: 32 },
  section: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { marginBottom: 2, backgroundColor: Colors.surface },
  suggestionBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, marginTop: 2, marginBottom: 6, elevation: 4, zIndex: 99 },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  suggestionName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  suggestionPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deviceInput: { flex: 1, backgroundColor: Colors.surface },
  cameraBtn: { alignItems: 'center', justifyContent: 'center', padding: 6 },
  cameraBtnLabel: { fontSize: 10, color: Colors.primary, marginTop: 2 },
  cameraHint: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4, fontStyle: 'italic' },
  selectedBadge: { backgroundColor: Colors.primary + '15', borderRadius: 8, padding: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  selectedText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  partRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 8, padding: 10, marginBottom: 6 },
  partInfo: { flex: 1 },
  partName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  partMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  partQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  partQty: { fontSize: 16, fontWeight: '700', color: Colors.primary, minWidth: 20, textAlign: 'center' },
  addPartBtn: { marginBottom: 8, borderRadius: 8 },
  partPicker: { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, marginBottom: 8, overflow: 'hidden' },
  partPickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  issueChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  issueChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  issueChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  issueChipLabel: { fontSize: 12, color: Colors.text },
  issueChipLabelActive: { color: '#fff', fontWeight: '600' },
  button: { marginTop: 20, borderRadius: 8 },
  buttonContent: { paddingVertical: 6 },
});
