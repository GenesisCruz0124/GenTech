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
import DatePickerField from '../../components/common/DatePickerField';
import { saveRepairImage } from '../../repositories/repairImageRepository';
import { RootStackParamList } from '../../navigation/types';
import { useRepairStore } from '../../store/repairStore';
import { useCustomerStore } from '../../store/customerStore';
import { getAllIssues, Issue } from '../../repositories/issueRepository';
import { Customer, searchCustomers } from '../../repositories/customerRepository';
import { Part, getAllParts, autoCreatePartIfNotExists } from '../../repositories/partsRepository';
import { getLicenseStatus, getTrialCounts, TRIAL_LIMITS } from '../../services/licenseService';
import { addRepairPart } from '../../repositories/partsRepository';
import { DeviceModel, searchDeviceModels, createDeviceModel } from '../../repositories/deviceModelRepository';
import { getAllDeviceBrands, DeviceBrand } from '../../repositories/deviceBrandRepository';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'NewRepair'>;

function IssueSearchAdd({ issues, selectedIssues, onAdd, onRemove }: {
  issues: { id: number; name: string }[];
  selectedIssues: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const [query, setQuery] = React.useState('');
  const filtered = query.length >= 1
    ? issues.filter(i => i.name.toLowerCase().includes(query.toLowerCase()) && !selectedIssues.includes(i.name))
    : [];

  return (
    <View>
      {/* Selected issues */}
      {selectedIssues.length > 0 && (
        <View style={issueStyles.selectedList}>
          {selectedIssues.map(name => (
            <View key={name} style={issueStyles.selectedTag}>
              <Text style={issueStyles.selectedTagText}>{name}</Text>
              <TouchableOpacity onPress={() => onRemove(name)} style={{ marginLeft: 4 }}>
                <MaterialCommunityIcons name="close" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Search + add row */}
      <View style={issueStyles.searchRow}>
        <TextInput
          mode="outlined"
          label="Search or type issue..."
          value={query}
          onChangeText={setQuery}
          style={issueStyles.searchInput}
          dense
        />
        {query.trim().length > 0 && !selectedIssues.includes(query.trim()) && (
          <TouchableOpacity
            style={issueStyles.addBtn}
            onPress={() => { onAdd(query.trim()); setQuery(''); }}
          >
            <MaterialCommunityIcons name="plus-circle" size={22} color={Colors.primary} />
            <Text style={issueStyles.addBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Suggestions */}
      {filtered.length > 0 && (
        <View style={issueStyles.suggestions}>
          {filtered.slice(0, 6).map(issue => (
            <TouchableOpacity
              key={issue.id}
              style={issueStyles.suggestionItem}
              onPress={() => { onAdd(issue.name); setQuery(''); }}
            >
              <MaterialCommunityIcons name="plus" size={14} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={issueStyles.suggestionText}>{issue.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const issueStyles = StyleSheet.create({
  selectedList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  selectedTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary + '15', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.primary + '30' },
  selectedTagText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, backgroundColor: Colors.surface },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 6 },
  addBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  suggestions: { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, marginTop: 4, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  suggestionText: { fontSize: 13, color: Colors.text },
});

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name={icon as any} size={16} color={Colors.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const schema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().optional(),
  deviceModel: z.string().min(1, 'Device model is required'),
  estimatedCost: z.string().min(1, 'Estimated cost is required'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewRepairScreen({ navigation, route }: Props) {
  const { addRepair } = useRepairStore();
  const { upsertByPhone } = useCustomerStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateRecorded, setDateRecorded] = useState(new Date().toISOString().split('T')[0]);
  const [hasWarranty, setHasWarranty] = useState(false);
  const [warrantyUntil, setWarrantyUntil] = useState('');

  // Pre-populate from navigation params
  useEffect(() => {
    if (route.params?.customerName) {
      setValue('customerName', route.params.customerName);
      if (route.params.customerPhone) setValue('customerPhone', route.params.customerPhone);
    }
    if (route.params?.deviceModel) {
      setValue('deviceModel', route.params.deviceModel);
      searchDeviceModels(route.params.deviceModel).then(results => {
        const exact = results.find(m => m.name.toLowerCase() === route.params!.deviceModel!.toLowerCase());
        if (exact?.brand_id) { setSelectedBrandId(exact.brand_id); setBrandName(exact.brand_name ?? ''); }
      });
    }
    if (route.params?.initialIssue) {
      setSelectedIssues(prev =>
        prev.includes(route.params!.initialIssue!) ? prev : [route.params!.initialIssue!]
      );
    }
  }, [route.params]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Device model autocomplete
  const [modelSuggestions, setModelSuggestions] = useState<DeviceModel[]>([]);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);

  // Brand field
  const [brands, setBrands] = useState<DeviceBrand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandSuggestions, setBrandSuggestions] = useState<DeviceBrand[]>([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);

  // Parts required
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [selectedParts, setSelectedParts] = useState<{ part: Part; qty: number }[]>([]);
  const [partPickerVisible, setPartPickerVisible] = useState(false);

  useEffect(() => {
    getAllIssues().then(setIssues);
    getAllParts().then(setAllParts);
    getAllDeviceBrands().then(setBrands);
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
    // Trial limit check
    const lic = await getLicenseStatus();
    if (!lic.isPro) {
      if (lic.isExpired) {
        Alert.alert('Trial Expired', 'Your free trial has ended. Please activate a Pro license to create more repairs.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('License') },
        ]);
        return;
      }
      const counts = await getTrialCounts();
      if (counts.repairs >= TRIAL_LIMITS.repairs) {
        Alert.alert('Trial Limit Reached', `You can create up to ${TRIAL_LIMITS.repairs} repairs during the free trial. Upgrade to Pro for unlimited repairs.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('License') },
        ]);
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const customerId = await upsertByPhone({
        name: data.customerName,
        phone: data.customerPhone || '',
      });
      // Save device model to list if it's new
      if (!selectedModelId && data.deviceModel.trim()) {
        await createDeviceModel(data.deviceModel.trim(), selectedBrandId ?? undefined);
      }

      const repairId = await addRepair({
        customer_id: customerId,
        device_model: data.deviceModel,
        issue_desc: selectedIssues.join(', '),
        estimated_cost: parseFloat(data.estimatedCost),
        notes: data.notes || undefined,
        created_at: dateRecorded,
        has_warranty: hasWarranty ? 1 : 0,
        warranty_until: hasWarranty && warrantyUntil ? warrantyUntil : undefined,
      });
      // Save photos
      for (const uri of photos) {
        await saveRepairImage(repairId, uri);
      }
      // Deduct parts from inventory
      for (const { part, qty } of selectedParts) {
        await addRepairPart(repairId, part.id, qty, part.selling_price);
      }

      // Auto-create stock entry for the device model based on issue type
      const modelName = data.deviceModel.trim();
      if (modelName) {
        const issuesLower = selectedIssues.join(', ').toLowerCase();
        const isLcd = issuesLower.includes('lcd') || issuesLower.includes('display') || issuesLower.includes('screen');
        const isBattery = issuesLower.includes('battery');
        if (isLcd) await autoCreatePartIfNotExists(modelName, 'display', selectedBrandId ?? undefined).catch(() => {});
        if (isBattery) await autoCreatePartIfNotExists(modelName, 'battery', selectedBrandId ?? undefined).catch(() => {});
      }

      navigation.replace('RepairDetail', { repairId });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Main form card */}
        <View style={styles.formCard}>

          {/* Date Recorded */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldGroupHeader}>
              <View style={[styles.fieldGroupDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.fieldGroupLabel}>Date Recorded</Text>
            </View>
            <DatePickerField
              label=""
              value={dateRecorded}
              onChange={setDateRecorded}
              maxDate={new Date()}
            />
          </View>

          <View style={styles.fieldDivider} />

          {/* Customer */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldGroupHeader}>
              <View style={[styles.fieldGroupDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.fieldGroupLabel}>Customer</Text>
            </View>
            <Controller control={control} name="customerName" render={({ field: { onChange, value } }) => (
              <>
                <TextInput label="Customer Name *" value={value} onChangeText={async (text) => {
                  onChange(text);
                  if (text.length >= 2) {
                    const results = await searchCustomers(text);
                    setSuggestions(results);
                    setShowSuggestions(results.length > 0);
                  } else { setShowSuggestions(false); }
                }} mode="outlined" style={styles.input} error={!!errors.customerName} />
                {showSuggestions && (
                  <View style={styles.suggestionBox}>
                    {suggestions.map(c => (
                      <TouchableOpacity key={c.id} style={styles.suggestionItem}
                        onPress={() => { onChange(c.name); setShowSuggestions(false); setSuggestions([]); setValue('customerPhone', c.phone ?? ''); }}>
                        <Text style={styles.suggestionName}>{c.name}</Text>
                        <Text style={styles.suggestionPhone}>{c.phone}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <HelperText type="error" visible={!!errors.customerName}>{errors.customerName?.message}</HelperText>
              </>
            )} />
          </View>

          <View style={styles.fieldDivider} />

          {/* Device */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldGroupHeader}>
              <View style={[styles.fieldGroupDot, { backgroundColor: Colors.info }]} />
              <Text style={styles.fieldGroupLabel}>Device</Text>
            </View>
            <Controller control={control} name="deviceModel" render={({ field: { onChange, value } }) => (
              <>
                <TextInput label="Device Model *" value={value} onChangeText={async (text) => {
                  onChange(text); setSelectedModelId(null); setSelectedBrandId(null); setBrandName('');
                  if (text.length >= 2) {
                    const results = await searchDeviceModels(text);
                    setModelSuggestions(results);
                    setShowModelSuggestions(results.length > 0);
                    const exact = results.find(m => m.name.toLowerCase() === text.toLowerCase());
                    if (exact?.brand_id) { setSelectedBrandId(exact.brand_id); setBrandName(exact.brand_name ?? ''); }
                  } else { setShowModelSuggestions(false); }
                }} mode="outlined" style={styles.input} placeholder="e.g. iPhone 13, Samsung A54" error={!!errors.deviceModel} />
                {showModelSuggestions && (
                  <View style={styles.suggestionBox}>
                    {modelSuggestions.map(m => (
                      <TouchableOpacity key={m.id} style={styles.suggestionItem}
                        onPress={() => {
                          onChange(m.name);
                          setSelectedModelId(m.id);
                          setShowModelSuggestions(false);
                          if (m.brand_id) { setSelectedBrandId(m.brand_id); setBrandName(m.brand_name ?? ''); }
                        }}>
                        <Text style={styles.suggestionName}>{m.name}</Text>
                        {m.brand_name ? <Text style={styles.suggestionPhone}>{m.brand_name}</Text> : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <HelperText type="error" visible={!!errors.deviceModel}>{errors.deviceModel?.message}</HelperText>
              </>
            )} />
          </View>

          <View style={styles.fieldDivider} />

          {/* Brand — auto-filled from selected model */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldGroupHeader}>
              <View style={[styles.fieldGroupDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.fieldGroupLabel}>Brand</Text>
            </View>
            <View style={styles.brandDisplay}>
              <MaterialCommunityIcons
                name={selectedBrandId ? 'check-circle' : 'information-outline'}
                size={16}
                color={selectedBrandId ? Colors.success : Colors.textSecondary}
              />
              <Text style={[styles.brandDisplayText, !selectedBrandId && { color: Colors.textSecondary, fontStyle: 'italic' }]}>
                {brandName || 'Auto-filled when a model is selected'}
              </Text>
            </View>
          </View>

          <View style={styles.fieldDivider} />

          {/* Issues */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldGroupHeader}>
              <View style={[styles.fieldGroupDot, { backgroundColor: Colors.warning }]} />
              <Text style={styles.fieldGroupLabel}>Problem / Issue(s)</Text>
            </View>
            <IssueSearchAdd
              issues={issues}
              selectedIssues={selectedIssues}
              onAdd={(name) => { if (!selectedIssues.includes(name)) setSelectedIssues(prev => [...prev, name]); }}
              onRemove={(name) => setSelectedIssues(prev => prev.filter(i => i !== name))}
            />
          </View>

          <View style={styles.fieldDivider} />

          {/* Cost */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldGroupHeader}>
              <View style={[styles.fieldGroupDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.fieldGroupLabel}>Estimated Cost</Text>
            </View>
            <Controller control={control} name="estimatedCost" render={({ field: { onChange, value } }) => (
              <TextInput label="Amount (₱) *" value={value} onChangeText={onChange} mode="outlined" style={styles.input} keyboardType="decimal-pad" error={!!errors.estimatedCost} />
            )} />
            <HelperText type="error" visible={!!errors.estimatedCost}>{errors.estimatedCost?.message}</HelperText>
          </View>

          <View style={styles.fieldDivider} />

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldGroupHeader}>
              <View style={[styles.fieldGroupDot, { backgroundColor: Colors.textSecondary }]} />
              <Text style={styles.fieldGroupLabel}>Notes / Instructions (optional)</Text>
            </View>
            <Controller control={control} name="notes" render={({ field: { onChange, value } }) => (
              <TextInput
                label="e.g. Handle with care, customer will call back..."
                value={value}
                onChangeText={onChange}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={3}
              />
            )} />
          </View>

          <View style={styles.fieldDivider} />

          {/* Warranty */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldGroupHeader}>
              <View style={[styles.fieldGroupDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.fieldGroupLabel}>Warranty</Text>
            </View>
            <View style={styles.warrantyToggleRow}>
              <TouchableOpacity
                style={[styles.warrantyBtn, hasWarranty && styles.warrantyBtnActive]}
                onPress={() => setHasWarranty(true)}
                activeOpacity={0.8}>
                <MaterialCommunityIcons name="shield-check-outline" size={15} color={hasWarranty ? '#fff' : Colors.textSecondary} />
                <Text style={[styles.warrantyBtnLabel, hasWarranty && { color: '#fff' }]}>With Warranty</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.warrantyBtn, !hasWarranty && styles.warrantyBtnNone]}
                onPress={() => { setHasWarranty(false); setWarrantyUntil(''); }}
                activeOpacity={0.8}>
                <MaterialCommunityIcons name="shield-off-outline" size={15} color={!hasWarranty ? '#fff' : Colors.textSecondary} />
                <Text style={[styles.warrantyBtnLabel, !hasWarranty && { color: '#fff' }]}>No Warranty</Text>
              </TouchableOpacity>
            </View>
            {hasWarranty && (
              <View style={{ marginTop: 8 }}>
                <DatePickerField
                  label="Warranty Until"
                  value={warrantyUntil}
                  onChange={setWarrantyUntil}
                  minDate={new Date()}
                />
              </View>
            )}
          </View>

        </View>

        {/* Photos */}
        <View style={styles.photoCard}>
          <View style={styles.fieldGroupHeader}>
            <MaterialCommunityIcons name="camera-outline" size={15} color={Colors.primary} />
            <Text style={[styles.fieldGroupLabel, { marginLeft: 6 }]}>Photos (optional)</Text>
          </View>
          <MultiImagePicker images={photos} onChange={setPhotos} maxImages={6} />
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.button}
          contentStyle={styles.buttonContent}
          icon="check-circle"
        >
          Create Repair
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F2F4F7' },
  container: { padding: 14, paddingBottom: 120, gap: 12 },

  // Main form card
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
  fieldGroupDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  fieldGroupLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7 },
  fieldDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },

  // Photo card
  photoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },

  input: { marginBottom: 2, backgroundColor: Colors.surface },
  suggestionBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginTop: 2,
    marginBottom: 4,
    elevation: 8,
    zIndex: 99,
    overflow: 'hidden',
  },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border },
  suggestionName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  suggestionPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  deviceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  deviceInput: { flex: 1, backgroundColor: Colors.surface },

  // kept for SectionCard (unused but harmless)
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  cameraBtn: { padding: 8 },
  cameraBtnLabel: { fontSize: 10, color: Colors.primary },
  cameraHint: { fontSize: 11, color: Colors.textSecondary },
  selectedBadge: { backgroundColor: Colors.primary + '12', borderRadius: 8, padding: 8, marginBottom: 8 },
  selectedText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  issueChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  issueChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  issueChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  issueChipLabel: { fontSize: 12, color: Colors.text },
  issueChipLabelActive: { color: '#fff', fontWeight: '700' },
  partRow: { flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 6 },
  partInfo: { flex: 1 },
  partName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  partMeta: { fontSize: 12, color: Colors.textSecondary },
  partQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  partQty: { fontSize: 17, fontWeight: '700', color: Colors.primary },
  addPartBtn: { borderRadius: 10 },
  partPicker: { backgroundColor: Colors.background, borderRadius: 10, overflow: 'hidden' },
  partPickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },

  brandDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  brandDisplayText: { fontSize: 14, color: Colors.text, flex: 1 },

  button: { borderRadius: 14 },
  buttonContent: { paddingVertical: 10 },
  warrantyToggleRow: { flexDirection: 'row', gap: 8 },
  warrantyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  warrantyBtnActive: { backgroundColor: Colors.success, borderColor: Colors.success },
  warrantyBtnNone: { backgroundColor: Colors.textSecondary, borderColor: Colors.textSecondary },
  warrantyBtnLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
});
