import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal as RNModal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text, TextInput, IconButton, Portal, Modal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useRepairStore } from '../../store/repairStore';
import { usePartsStore } from '../../store/partsStore';
import { getRepairById, RepairWithCustomer } from '../../repositories/repairRepository';
import { getAllIssues, Issue } from '../../repositories/issueRepository';
import { getAllParts, Part } from '../../repositories/partsRepository';
import { updateCustomer, searchCustomers, Customer } from '../../repositories/customerRepository';
import {
  RepairPayment,
  addRepairPayment,
  getRepairPayments,
  getTotalPaid,
  deleteRepairPayment,
  PAYMENT_MODES,
} from '../../repositories/repairPaymentRepository';
import {
  RepairImage,
  getRepairImages,
  saveRepairImage,
  deleteRepairImage,
} from '../../repositories/repairImageRepository';
import MultiImagePicker from '../../components/common/MultiImagePicker';
import ImagePickerField from '../../components/common/ImagePickerField';
import DatePickerField from '../../components/common/DatePickerField';
import StatusBadge from '../../components/repairs/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Colors } from '../../constants/colors';
import { STATUS_NEXT, STATUS_LABELS } from '../../constants/statusOptions';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'RepairDetail'>;

export default function RepairDetailScreen({ route, navigation }: Props) {
  const { repairId } = route.params;
  const { advanceStatus, removeRepair, editRepair, setNotRepaired, deliver } = useRepairStore();
  const { getForRepair, addToRepair } = usePartsStore();

  const [repair, setRepair] = useState<RepairWithCustomer | null>(null);
  const [parts, setParts] = useState<any[]>([]);
  const [repairImages, setRepairImages] = useState<RepairImage[]>([]);
  const [payments, setPayments] = useState<RepairPayment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [deleteVisible, setDeleteVisible] = useState(false);

  // Date recorded editing
  const [editingDate, setEditingDate] = useState(false);
  const [editDateValue, setEditDateValue] = useState('');
  const [dateSaving, setDateSaving] = useState(false);

  // Delivery date editing
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [editDeliveryValue, setEditDeliveryValue] = useState('');
  const [deliverySaving, setDeliverySaving] = useState(false);

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [editNotesValue, setEditNotesValue] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  // Warranty editing
  const [editingWarranty, setEditingWarranty] = useState(false);
  const [editWarranty, setEditWarranty] = useState(false);
  const [editWarrantyUntil, setEditWarrantyUntil] = useState('');
  const [warrantySaving, setWarrantySaving] = useState(false);

  // Payment modal
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentImage, setPaymentImage] = useState<string | null>(null);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [viewProofUri, setViewProofUri] = useState<string | null>(null);
  // Deliver-with-payment modal
  const [deliverModalVisible, setDeliverModalVisible] = useState(false);
  const [deliverAmount, setDeliverAmount] = useState('');
  const [deliverDate, setDeliverDate] = useState('');
  const [deliverMode, setDeliverMode] = useState('Cash');
  const [deliverNotes, setDeliverNotes] = useState('');
  const [deliverImage, setDeliverImage] = useState<string | null>(null);
  const [deliverSaving, setDeliverSaving] = useState(false);
  const [deliverWarranty, setDeliverWarranty] = useState(false);
  const [deliverWarrantyUntil, setDeliverWarrantyUntil] = useState('');

  // Issue editing
  const [editingIssues, setEditingIssues] = useState(false);
  const [editIssueQuery, setEditIssueQuery] = useState('');
  const [currentIssues, setCurrentIssues] = useState<string[]>([]);
  const [issuesSaving, setIssuesSaving] = useState(false);

  // Estimated cost editing
  const [editingCost, setEditingCost] = useState(false);
  const [editCostValue, setEditCostValue] = useState('');
  const [costSaving, setCostSaving] = useState(false);

  // Customer editing
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editCustomerInput, setEditCustomerInput] = useState('');
  const [customerSuggestions2, setCustomerSuggestions2] = useState<any[]>([]);
  const [customerSaving, setCustomerSaving] = useState(false);

  // Brand/Model editing
  const [editingModel, setEditingModel] = useState(false);
  const [editModelInput, setEditModelInput] = useState('');
  const [modelSuggestions2, setModelSuggestions2] = useState<any[]>([]);
  const [modelSaving, setModelSaving] = useState(false);

  // Parts add in edit modal
  const [allPartsForEdit, setAllPartsForEdit] = useState<any[]>([]);
  const [editPartPickerVisible, setEditPartPickerVisible] = useState(false);
  const [editPartsToAdd, setEditPartsToAdd] = useState<{ part: any; qty: number }[]>([]);

  // Edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerSuggestions, setEditCustomerSuggestions] = useState<Customer[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const [editDevice, setEditDevice] = useState('');
  const [editSelectedIssues, setEditSelectedIssues] = useState<string[]>([]);
  const [editEstimated, setEditEstimated] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);

  const load = useCallback(async () => {
    const r = await getRepairById(repairId);
    setRepair(r);
    const p = await getForRepair(repairId);
    setParts(p);
    const imgs = await getRepairImages(repairId);
    setRepairImages(imgs);
    const pmt = await getRepairPayments(repairId);
    setPayments(pmt);
    const paid = await getTotalPaid(repairId);
    setTotalPaid(paid);
  }, [repairId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => { getAllIssues().then(setAllIssues); }, []);

  useEffect(() => {
    if (!repair) return;
    navigation.setOptions({
      headerTitle: () => (
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 0.5 }}>
          RPN-{String(repair.id).padStart(4, '0')}
        </Text>
      ),
      headerRight: () => (
        <IconButton icon="delete-outline" iconColor="rgba(255,255,255,0.85)" onPress={() => setDeleteVisible(true)} />
      ),
    });
  }, [repair]);

  const scrollRef = useRef<ScrollView>(null);

  if (!repair) return null;

  const nextStatus = STATUS_NEXT[repair.status];

  const openEdit = () => {
    setEditPartsToAdd([]);
    setEditPartPickerVisible(false);
    getAllParts().then(setAllPartsForEdit);
    setEditDevice(repair.device_model);
    const saved = repair.issue_desc.split(', ').map(s => s.trim()).filter(Boolean);
    setEditSelectedIssues(saved);
    setEditCustomerName(repair.customer_name);
    setSelectedCustomerId(null);
    setShowCustomerSuggestions(false);
    setEditCustomerSuggestions([]);
    setEditEstimated(String(repair.estimated_cost));
    setEditNotes(repair.notes ?? '');
    setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      if (selectedCustomerId && selectedCustomerId !== repair.customer_id) {
        await editRepair(repairId, { customer_id: selectedCustomerId });
      } else if (editCustomerName.trim() && editCustomerName.trim() !== repair.customer_name) {
        await updateCustomer(repair.customer_id, { name: editCustomerName.trim() });
      }
      await editRepair(repairId, {
        device_model: editDevice.trim(),
        issue_desc: editSelectedIssues.join(', ') || repair.issue_desc,
        estimated_cost: parseFloat(editEstimated) || 0,
        notes: editNotes.trim() || undefined,
      });
      for (const { part, qty } of editPartsToAdd) {
        await addToRepair(repairId, part.id, qty, part.selling_price);
      }
      setEditVisible(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const openPaymentModal = () => {
    const now = new Date();
    setPaymentDate(now.toISOString().split('T')[0]);
    setPaymentAmount('');
    setPaymentMode('Cash');
    setPaymentNotes('');
    setPaymentImage(null);
    setPaymentModalVisible(true);
  };

  const handleAddPayment = async () => {
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) return;
    setPaymentSaving(true);
    await addRepairPayment(repairId, amt, paymentDate, {
      notes: paymentNotes.trim() || undefined,
      paymentMode: paymentMode,
      imageUri: paymentImage || undefined,
    });
    setPaymentSaving(false);
    setPaymentModalVisible(false);
    load();
  };

  const openDeliverModal = () => {
    const now = new Date();
    const totalOwed = repair?.final_cost ?? repair?.estimated_cost ?? 0;
    setDeliverAmount(String(totalOwed));
    setDeliverDate(now.toISOString().split('T')[0]);
    setDeliverMode('Cash');
    setDeliverNotes('');
    setDeliverImage(null);
    setDeliverWarranty(false);
    setDeliverWarrantyUntil('');
    setDeliverModalVisible(true);
  };

  const handleDeliverWithPayment = async () => {
    setDeliverSaving(true);
    await deliver(repairId, true);
    const amt = parseFloat(deliverAmount);
    if (amt > 0) {
      await addRepairPayment(repairId, amt, deliverDate, {
        notes: deliverNotes.trim() || undefined,
        paymentMode: deliverMode,
        imageUri: deliverImage || undefined,
      });
    }
    await editRepair(repairId, {
      has_warranty: deliverWarranty ? 1 : 0,
      warranty_until: deliverWarranty && deliverWarrantyUntil ? deliverWarrantyUntil : undefined,
    } as any);
    setDeliverSaving(false);
    setDeliverModalVisible(false);
    load();
  };

  const handleDeletePayment = (pmtId: number) => {
    Alert.alert('Delete Payment', 'Remove this payment record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteRepairPayment(pmtId, repairId); load(); } },
    ]);
  };

  const handleAdvance = async () => {
    if (!nextStatus || nextStatus === 'delivered') return;
    await advanceStatus(repairId, nextStatus);
    load();
  };

  const handleDeliver = async (isPaid: boolean) => {
    await deliver(repairId, isPaid);
    load();
  };

  const handleNotRepaired = async () => {
    await setNotRepaired(repairId);
    load();
  };

  const handleDelete = async () => {
    await removeRepair(repairId);
    navigation.goBack();
  };

  const partsTotal = parts.reduce((sum, p) => sum + p.unit_price * p.quantity, 0);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={80}>
      <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* ── OVERVIEW CARD ──────────────────────────────── */}
        <View style={styles.card}>

          {/* Date Recorded — first */}
          <View style={[styles.fieldRow, { alignItems: 'center' }]}>
            <View style={styles.fieldIconWrap}>
              <MaterialCommunityIcons name="calendar-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>Date Recorded</Text>
              {editingDate ? (
                <View style={{ marginTop: 4 }}>
                  <DatePickerField
                    label=""
                    value={editDateValue}
                    onChange={setEditDateValue}
                    maxDate={new Date()}
                  />
                  <Button mode="contained" compact loading={dateSaving} style={styles.inlineSaveBtn}
                    onPress={async () => {
                      setDateSaving(true);
                      await editRepair(repairId, { created_at: editDateValue } as any);
                      setDateSaving(false);
                      setEditingDate(false);
                      load();
                    }}>Save</Button>
                </View>
              ) : (
                <Text style={styles.fieldValue}>
                  {repair.created_at ? new Date(repair.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.editIconBtn}
              onPress={() => { setEditDateValue(repair.created_at?.split('T')[0] ?? ''); setEditingDate(v => !v); }}>
              <MaterialCommunityIcons name={editingDate ? 'close' : 'pencil-outline'} size={15} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.rowDivider} />

          {/* Device / Model */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconWrap}>
              <MaterialCommunityIcons name="cellphone" size={18} color={Colors.primary} />
            </View>
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>Device</Text>
              {editingModel ? (
                <View style={{ marginTop: 6 }}>
                  <TextInput mode="outlined" dense label="Brand / Model" value={editModelInput}
                    style={styles.inlineInput}
                    onChangeText={async (text) => {
                      setEditModelInput(text);
                      if (text.length >= 1) {
                        const { searchDeviceModels } = await import('../../repositories/deviceModelRepository');
                        setModelSuggestions2(await searchDeviceModels(text));
                      } else setModelSuggestions2([]);
                    }} />
                  {modelSuggestions2.length > 0 && (
                    <View style={styles.suggestionBox}>
                      {modelSuggestions2.slice(0, 5).map((m: any) => (
                        <TouchableOpacity key={m.id} style={styles.suggestionItem}
                          onPress={async () => {
                            const display = m.brand_name ? `${m.brand_name} ${m.name}` : m.name;
                            setModelSaving(true);
                            await editRepair(repairId, { device_model: display });
                            setModelSaving(false); setEditingModel(false); setModelSuggestions2([]); load();
                          }}>
                          <Text style={styles.suggestionName}>{m.brand_name ? `${m.brand_name} ` : ''}{m.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <Button mode="contained" compact loading={modelSaving} style={styles.inlineSaveBtn}
                    onPress={async () => {
                      setModelSaving(true);
                      await editRepair(repairId, { device_model: editModelInput.trim() });
                      setModelSaving(false); setEditingModel(false); setModelSuggestions2([]); load();
                    }}>Save</Button>
                </View>
              ) : (
                <Text style={styles.fieldValueLarge}>{repair.device_model || '—'}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.editIconBtn}
              onPress={() => { setEditModelInput(repair.device_model || ''); setModelSuggestions2([]); setEditingModel(v => !v); }}>
              <MaterialCommunityIcons name={editingModel ? 'close' : 'pencil-outline'} size={15} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.rowDivider} />

          {/* Customer */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconWrap}>
              <MaterialCommunityIcons name="account-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>Customer</Text>
              {editingCustomer ? (
                <View style={{ marginTop: 6 }}>
                  <TextInput mode="outlined" dense label="Customer name" value={editCustomerInput}
                    style={styles.inlineInput}
                    onChangeText={async (text) => {
                      setEditCustomerInput(text);
                      if (text.length >= 2) {
                        const { searchCustomers } = await import('../../repositories/customerRepository');
                        setCustomerSuggestions2(await searchCustomers(text));
                      } else setCustomerSuggestions2([]);
                    }} />
                  {customerSuggestions2.length > 0 && (
                    <View style={styles.suggestionBox}>
                      {customerSuggestions2.slice(0, 5).map((c: any) => (
                        <TouchableOpacity key={c.id} style={styles.suggestionItem}
                          onPress={async () => {
                            setCustomerSaving(true);
                            await editRepair(repairId, { customer_id: c.id });
                            setCustomerSaving(false); setEditingCustomer(false); load();
                          }}>
                          <Text style={styles.suggestionName}>{c.name}</Text>
                          {c.phone ? <Text style={styles.suggestionPhone}>{c.phone}</Text> : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <Button mode="contained" compact loading={customerSaving} style={styles.inlineSaveBtn}
                    onPress={async () => {
                      setCustomerSaving(true);
                      const { upsertCustomerByPhone } = await import('../../repositories/customerRepository');
                      const cid = await upsertCustomerByPhone({ name: editCustomerInput.trim(), phone: repair.customer_phone || '' });
                      await editRepair(repairId, { customer_id: cid });
                      setCustomerSaving(false); setEditingCustomer(false); load();
                    }}>Save</Button>
                </View>
              ) : (
                <Text style={styles.fieldValue}>
                  {repair.customer_name}{repair.customer_phone ? ` · ${repair.customer_phone}` : ''}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.editIconBtn}
              onPress={() => { setEditCustomerInput(repair.customer_name); setCustomerSuggestions2([]); setEditingCustomer(v => !v); }}>
              <MaterialCommunityIcons name={editingCustomer ? 'close' : 'pencil-outline'} size={15} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.rowDivider} />

          {/* Status + Cost */}
          <View style={[styles.fieldRow, { alignItems: 'center' }]}>
            <View style={styles.fieldIconWrap}>
              <MaterialCommunityIcons name="tag-outline" size={18} color={Colors.primary} />
            </View>
            <View style={[styles.fieldBody, { justifyContent: 'center' }]}>
              <StatusBadge status={repair.status} />
            </View>
            {editingCost ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextInput mode="outlined" dense value={editCostValue} onChangeText={setEditCostValue}
                  keyboardType="decimal-pad"
                  style={{ width: 110, backgroundColor: Colors.surface }}
                  left={<TextInput.Affix text="₱" />} />
                <Button mode="contained" compact loading={costSaving} style={{ borderRadius: 8 }}
                  onPress={async () => {
                    setCostSaving(true);
                    await editRepair(repairId, { estimated_cost: parseFloat(editCostValue) || 0 });
                    setCostSaving(false); setEditingCost(false); load();
                  }}>Save</Button>
              </View>
            ) : (
              <TouchableOpacity style={styles.costTouchable}
                onPress={() => { setEditCostValue(String(repair.estimated_cost)); setEditingCost(v => !v); }}>
                <Text style={styles.costDisplay}>{formatCurrency(repair.estimated_cost)}</Text>
                <MaterialCommunityIcons name="pencil-outline" size={13} color={Colors.primary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.rowDivider} />

          {/* Warranty */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconWrap}>
              <MaterialCommunityIcons
                name={repair.has_warranty ? 'shield-check' : 'shield-off-outline'}
                size={18}
                color={repair.has_warranty ? Colors.success : Colors.textSecondary}
              />
            </View>
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>Warranty</Text>
              {editingWarranty ? (
                <View style={{ marginTop: 8 }}>
                  <View style={styles.warrantyToggleRow}>
                    <TouchableOpacity
                      style={[styles.warrantyToggleBtn, editWarranty && styles.warrantyToggleBtnActive]}
                      onPress={() => setEditWarranty(true)}
                      activeOpacity={0.8}>
                      <MaterialCommunityIcons name="shield-check-outline" size={14} color={editWarranty ? '#fff' : Colors.textSecondary} />
                      <Text style={[styles.warrantyToggleLabel, editWarranty && { color: '#fff' }]}>With Warranty</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.warrantyToggleBtn, !editWarranty && styles.warrantyToggleBtnNone]}
                      onPress={() => { setEditWarranty(false); setEditWarrantyUntil(''); }}
                      activeOpacity={0.8}>
                      <MaterialCommunityIcons name="shield-off-outline" size={14} color={!editWarranty ? '#fff' : Colors.textSecondary} />
                      <Text style={[styles.warrantyToggleLabel, !editWarranty && { color: '#fff' }]}>No Warranty</Text>
                    </TouchableOpacity>
                  </View>
                  {editWarranty && (
                    <View style={{ marginTop: 8 }}>
                      <DatePickerField label="Warranty Until" value={editWarrantyUntil} onChange={setEditWarrantyUntil} minDate={new Date()} />
                    </View>
                  )}
                  <Button mode="contained" compact loading={warrantySaving} style={styles.inlineSaveBtn}
                    onPress={async () => {
                      setWarrantySaving(true);
                      await editRepair(repairId, {
                        has_warranty: editWarranty ? 1 : 0,
                        warranty_until: editWarranty && editWarrantyUntil ? editWarrantyUntil : undefined,
                      } as any);
                      setWarrantySaving(false);
                      setEditingWarranty(false);
                      load();
                    }}>Save</Button>
                </View>
              ) : (
                <View style={styles.warrantyDisplay}>
                  {repair.has_warranty ? (
                    <>
                      <View style={styles.warrantyBadgeYes}>
                        <MaterialCommunityIcons name="shield-check" size={13} color={Colors.success} />
                        <Text style={styles.warrantyBadgeYesText}>Under Warranty</Text>
                      </View>
                      {repair.warranty_until ? (
                        <Text style={styles.warrantyUntilText}>Until {repair.warranty_until}</Text>
                      ) : null}
                    </>
                  ) : (
                    <View style={styles.warrantyBadgeNo}>
                      <MaterialCommunityIcons name="shield-off" size={13} color={Colors.textSecondary} />
                      <Text style={styles.warrantyBadgeNoText}>No Warranty</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.editIconBtn}
              onPress={() => {
                setEditWarranty(!!repair.has_warranty);
                setEditWarrantyUntil(repair.warranty_until ?? '');
                setEditingWarranty(v => !v);
              }}>
              <MaterialCommunityIcons name={editingWarranty ? 'close' : 'pencil-outline'} size={15} color={Colors.primary} />
            </TouchableOpacity>
          </View>

        </View>

        {/* ── REPAIR DETAILS CARD ────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>Repair Details</Text>

          {/* Issues */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconWrap}>
              <MaterialCommunityIcons name="wrench-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>Issues</Text>
              {editingIssues ? (
                <View style={{ marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {currentIssues.map(name => (
                      <View key={name} style={styles.issueTag}>
                        <Text style={styles.issueTagText}>{name}</Text>
                        <TouchableOpacity onPress={() => setCurrentIssues(p => p.filter(i => i !== name))}>
                          <MaterialCommunityIcons name="close" size={13} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput mode="outlined" dense label="Search issue..." value={editIssueQuery}
                      onChangeText={setEditIssueQuery} style={{ flex: 1, backgroundColor: Colors.surface }} />
                    {editIssueQuery.trim().length > 0 && !currentIssues.includes(editIssueQuery.trim()) && (
                      <TouchableOpacity onPress={() => { setCurrentIssues(p => [...p, editIssueQuery.trim()]); setEditIssueQuery(''); }}>
                        <MaterialCommunityIcons name="plus-circle" size={28} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {editIssueQuery.length >= 1 && (
                    <View style={styles.issueDropdown}>
                      {allIssues
                        .filter(i => i.name.toLowerCase().includes(editIssueQuery.toLowerCase()) && !currentIssues.includes(i.name))
                        .slice(0, 5)
                        .map(i => (
                          <TouchableOpacity key={i.id} style={styles.issueDropdownItem}
                            onPress={() => { setCurrentIssues(p => [...p, i.name]); setEditIssueQuery(''); }}>
                            <Text style={{ fontSize: 13, color: Colors.text }}>{i.name}</Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  )}
                  <Button mode="contained" compact loading={issuesSaving} style={styles.inlineSaveBtn}
                    onPress={async () => {
                      setIssuesSaving(true);
                      await editRepair(repairId, { issue_desc: currentIssues.join(', ') });
                      setIssuesSaving(false); setEditingIssues(false); load();
                    }}>Save Issues</Button>
                </View>
              ) : (
                <Text style={styles.fieldValue}>{repair.issue_desc || '—'}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.editIconBtn}
              onPress={() => {
                setCurrentIssues(repair.issue_desc.split(', ').map(s => s.trim()).filter(Boolean));
                setEditIssueQuery('');
                setEditingIssues(v => !v);
              }}>
              <MaterialCommunityIcons name={editingIssues ? 'close' : 'pencil-outline'} size={15} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.rowDivider} />

          {/* Photos */}
          <View style={[styles.fieldRow, { alignItems: 'flex-start' }]}>
            <View style={styles.fieldIconWrap}>
              <MaterialCommunityIcons name="image-outline" size={18} color={Colors.primary} />
            </View>
            <View style={[styles.fieldBody, { paddingBottom: 4 }]}>
              <Text style={[styles.fieldLabel, { marginBottom: 10 }]}>Photos</Text>
              <MultiImagePicker
                images={repairImages.map(i => i.image_uri)}
                maxImages={10}
                onChange={async (uris) => {
                  for (const uri of uris) {
                    if (!repairImages.find(i => i.image_uri === uri)) await saveRepairImage(repairId, uri);
                  }
                  for (const img of repairImages) {
                    if (!uris.includes(img.image_uri)) await deleteRepairImage(img.id, img.image_uri);
                  }
                  load();
                }}
              />
            </View>
          </View>

          <View style={styles.rowDivider} />

          {/* Notes */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconWrap}>
              <MaterialCommunityIcons name="note-text-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>Notes</Text>
              {editingNotes ? (
                <View style={{ marginTop: 6 }}>
                  <TextInput
                    mode="outlined"
                    dense
                    multiline
                    numberOfLines={3}
                    value={editNotesValue}
                    onChangeText={setEditNotesValue}
                    style={styles.inlineInput}
                    onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 350)}
                  />
                  <Button mode="contained" compact loading={notesSaving} style={styles.inlineSaveBtn}
                    onPress={async () => {
                      setNotesSaving(true);
                      await editRepair(repairId, { notes: editNotesValue.trim() || undefined });
                      setNotesSaving(false);
                      setEditingNotes(false);
                      load();
                    }}>Save</Button>
                </View>
              ) : (
                <Text style={[styles.fieldValue, !repair.notes && { color: Colors.textSecondary, fontStyle: 'italic' }]}>
                  {repair.notes || 'No notes'}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.editIconBtn}
              onPress={() => { setEditNotesValue(repair.notes || ''); setEditingNotes(v => !v); }}>
              <MaterialCommunityIcons name={editingNotes ? 'close' : 'pencil-outline'} size={15} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── ACTION BUTTONS ─────────────────────────────── */}
        <View style={styles.actionsWrap}>
          {/* Advance status (pending / in_progress) */}
          {nextStatus && nextStatus !== 'delivered' && (
            <Button mode="contained" icon="arrow-right-circle-outline" onPress={handleAdvance}
              style={styles.primaryBtn} contentStyle={{ flexDirection: 'row-reverse' }}>
              Mark as {STATUS_LABELS[nextStatus]}
            </Button>
          )}

          {/* Revert to Pending when In Progress */}
          {repair.status === 'in_progress' && (
            <Button mode="outlined" icon="undo" compact
              onPress={() => advanceStatus(repairId, 'pending').then(load)}
              style={[styles.secondaryBtn, { flex: undefined, borderColor: Colors.textSecondary }]}
              textColor={Colors.textSecondary}>
              Revert to Pending
            </Button>
          )}

          {/* Ready → Delivered */}
          {repair.status === 'ready' && (
            <>
              <Button mode="contained" icon="check-circle-outline"
                onPress={openDeliverModal}
                style={styles.primaryBtn}>
                Mark as Delivered
              </Button>
              <View style={styles.secondaryRow}>
                <Button mode="outlined" icon="cash-remove" compact
                  onPress={() => Alert.alert('Skip Payment', 'Mark delivered without collecting payment?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Skip', style: 'destructive', onPress: () => handleDeliver(false) },
                  ])}
                  style={[styles.secondaryBtn, { borderColor: Colors.warning }]}
                  textColor={Colors.warning}>
                  Skip Payment
                </Button>
                <Button mode="outlined" icon="undo" compact
                  onPress={() => advanceStatus(repairId, 'pending').then(load)}
                  style={[styles.secondaryBtn, { borderColor: Colors.textSecondary }]}
                  textColor={Colors.textSecondary}>
                  Revert
                </Button>
              </View>
            </>
          )}

          {/* Revert to Ready when Delivered */}
          {repair.status === 'delivered' && (
            <Button mode="outlined" icon="undo" compact
              onPress={() => Alert.alert('Revert to Ready', 'This will undo the delivery and mark the repair as ready again. Payment records will not be deleted.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Revert', onPress: () => advanceStatus(repairId, 'ready').then(load) },
              ])}
              style={[styles.secondaryBtn, { flex: undefined, borderColor: Colors.textSecondary }]}
              textColor={Colors.textSecondary}>
              Revert to Ready
            </Button>
          )}

          {/* Not Repaired */}
          {repair.status !== 'delivered' && repair.status !== 'not_repaired' && (
            <Button mode="outlined" icon="close-circle-outline" compact
              onPress={() => Alert.alert('Mark as Not Repaired', 'Parts used will be restored to inventory.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', style: 'destructive', onPress: handleNotRepaired },
              ])}
              style={[styles.secondaryBtn, { flex: undefined, borderColor: Colors.error }]}
              textColor={Colors.error}>
              Mark as Not Repaired
            </Button>
          )}
        </View>

        {/* ── DELIVERY DATE ─────────────────────────────── */}
        {repair.status === 'delivered' && (
          <View style={styles.card}>
            <View style={[styles.fieldRow, { alignItems: 'center' }]}>
              <View style={styles.fieldIconWrap}>
                <MaterialCommunityIcons name="package-check" size={18} color={Colors.success} />
              </View>
              <View style={styles.fieldBody}>
                <Text style={styles.fieldLabel}>Date Delivered</Text>
                {editingDelivery ? (
                  <View style={{ marginTop: 4 }}>
                    <DatePickerField label="" value={editDeliveryValue} onChange={setEditDeliveryValue} maxDate={new Date()} />
                    <Button mode="contained" compact loading={deliverySaving} style={styles.inlineSaveBtn}
                      onPress={async () => {
                        setDeliverySaving(true);
                        await editRepair(repairId, { delivered_at: editDeliveryValue } as any);
                        setDeliverySaving(false);
                        setEditingDelivery(false);
                        load();
                      }}>Save</Button>
                  </View>
                ) : (
                  <Text style={styles.fieldValue}>
                    {repair.delivered_at
                      ? new Date(repair.delivered_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
                      : '—'}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.editIconBtn}
                onPress={() => { setEditDeliveryValue(repair.delivered_at?.split('T')[0] ?? ''); setEditingDelivery(v => !v); }}>
                <MaterialCommunityIcons name={editingDelivery ? 'close' : 'pencil-outline'} size={15} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── PAYMENT CARD ───────────────────────────────── */}
        {repair.status === 'delivered' && (() => {
          const totalOwed = repair.final_cost ?? repair.estimated_cost;
          const remaining = totalOwed - totalPaid;
          return (
            <View style={styles.card}>
              <Text style={styles.cardSectionLabel}>Payment</Text>

              <View style={styles.paymentGrid}>
                <View style={styles.paymentGridCell}>
                  <Text style={styles.paymentGridLabel}>Total Owed</Text>
                  <Text style={styles.paymentGridVal}>{formatCurrency(totalOwed)}</Text>
                </View>
                <View style={[styles.paymentGridCell, styles.paymentGridCellBorder]}>
                  <Text style={styles.paymentGridLabel}>Paid</Text>
                  <Text style={[styles.paymentGridVal, { color: Colors.success }]}>{formatCurrency(totalPaid)}</Text>
                </View>
                <View style={[styles.paymentGridCell, styles.paymentGridCellBorder]}>
                  <Text style={styles.paymentGridLabel}>Balance</Text>
                  <Text style={[styles.paymentGridVal, { color: remaining > 0 ? Colors.error : Colors.success }]}>
                    {formatCurrency(remaining > 0 ? remaining : 0)}
                  </Text>
                </View>
              </View>

              {repair.is_paid === 0 && (
                <View style={styles.unpaidBanner}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={15} color={Colors.warning} />
                  <Text style={styles.unpaidText}>Payment not fully collected</Text>
                </View>
              )}

              {payments.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  {payments.map((p) => (
                    <View key={p.id} style={styles.paymentRow}>
                      <View style={styles.paymentRowLeft}>
                        <Text style={styles.paymentRowDate}>{p.payment_date}{p.payment_mode ? ` · ${p.payment_mode}` : ''}</Text>
                        {p.notes ? <Text style={styles.paymentRowNote}>{p.notes}</Text> : null}
                        {p.image_uri ? (
                          <TouchableOpacity onPress={() => setViewProofUri(p.image_uri)} style={styles.proofThumbWrap}>
                            <Image source={{ uri: p.image_uri }} style={styles.proofThumb} resizeMode="cover" />
                            <Text style={styles.proofLabel}>View proof</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <Text style={[styles.paymentGridVal, { color: Colors.success }]}>{formatCurrency(p.amount)}</Text>
                      <IconButton icon="delete-outline" size={16} iconColor={Colors.error} onPress={() => handleDeletePayment(p.id)} />
                    </View>
                  ))}
                </View>
              )}

              {repair.is_paid === 0 && (
                <Button mode="outlined" icon="cash-plus" onPress={openPaymentModal}
                  style={[styles.primaryBtn, { marginTop: 12 }]}>
                  Add Payment
                </Button>
              )}
            </View>
          );
        })()}

        {/* ── INVOICE BUTTON ─────────────────────────────── */}
        <View style={styles.invoiceWrap}>
          <Button mode="outlined" icon="receipt"
            onPress={() => navigation.navigate('InvoicePreview', { invoiceId: repairId, type: 'repair' })}
            style={styles.invoiceBtn}>
            Create Invoice
          </Button>
        </View>

      </ScrollView>

      {/* ── ADD PAYMENT MODAL ──────────────────────────── */}
      <Portal>
        <Modal visible={paymentModalVisible} onDismiss={() => setPaymentModalVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Add Payment</Text>
            <TextInput label="Amount (₱) *" value={paymentAmount} onChangeText={setPaymentAmount} mode="outlined" style={styles.modalInput} keyboardType="decimal-pad" />
            <DatePickerField label="Payment Date *" value={paymentDate} onChange={setPaymentDate} maxDate={new Date()} />
            <Text style={styles.modeLabel}>Mode of Payment</Text>
            <View style={styles.modeChips}>
              {PAYMENT_MODES.map(m => (
                <TouchableOpacity key={m} style={[styles.modeChip, paymentMode === m && styles.modeChipActive]} onPress={() => setPaymentMode(m)}>
                  <Text style={[styles.modeChipLabel, paymentMode === m && styles.modeChipLabelActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput label="Notes (optional)" value={paymentNotes} onChangeText={setPaymentNotes} mode="outlined" style={styles.modalInput} />
            <Text style={styles.modeLabel}>Proof of Payment</Text>
            <ImagePickerField uri={paymentImage} onPicked={setPaymentImage} onClear={() => setPaymentImage(null)} />
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setPaymentModalVisible(false)} style={styles.btnHalf}>Cancel</Button>
              <Button mode="contained" onPress={handleAddPayment} loading={paymentSaving} disabled={!paymentAmount || paymentSaving} style={styles.btnHalf}>Save</Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* ── DELIVER WITH PAYMENT MODAL ─────────────────── */}
      <Portal>
        <Modal visible={deliverModalVisible} onDismiss={() => setDeliverModalVisible(false)} contentContainerStyle={styles.deliverModal}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Header */}
            <View style={styles.deliverModalHeader}>
              <View style={styles.deliverModalIcon}>
                <MaterialCommunityIcons name="check-circle-outline" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.deliverModalTitle}>Mark as Delivered</Text>
              <Text style={styles.deliverModalSub}>Record the final payment before confirming delivery</Text>
            </View>

            {/* Amount */}
            <Text style={styles.deliverFieldLabel}>Final Payment Amount</Text>
            <TextInput
              mode="outlined"
              value={deliverAmount}
              onChangeText={setDeliverAmount}
              keyboardType="decimal-pad"
              style={styles.deliverInput}
              left={<TextInput.Affix text="₱" />}
              placeholder="0.00"
            />

            {/* Date */}
            <Text style={styles.deliverFieldLabel}>Payment Date</Text>
            <DatePickerField label="" value={deliverDate} onChange={setDeliverDate} maxDate={new Date()} />

            {/* Mode */}
            <Text style={styles.deliverFieldLabel}>Mode of Payment</Text>
            <View style={styles.modeChips}>
              {PAYMENT_MODES.map(m => (
                <TouchableOpacity key={m}
                  style={[styles.modeChip, deliverMode === m && styles.modeChipActive]}
                  onPress={() => setDeliverMode(m)}>
                  <Text style={[styles.modeChipLabel, deliverMode === m && styles.modeChipLabelActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={styles.deliverFieldLabel}>Notes (optional)</Text>
            <TextInput label="" value={deliverNotes} onChangeText={setDeliverNotes}
              mode="outlined" style={styles.deliverInput} />

            {/* Proof */}
            <Text style={styles.deliverFieldLabel}>Proof of Payment</Text>
            <ImagePickerField uri={deliverImage} onPicked={setDeliverImage} onClear={() => setDeliverImage(null)} />

            {/* Warranty */}
            <Text style={styles.deliverFieldLabel}>Warranty</Text>
            <View style={styles.warrantyRow}>
              <TouchableOpacity
                style={[styles.warrantyBtn, deliverWarranty && styles.warrantyBtnActive]}
                onPress={() => setDeliverWarranty(true)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="shield-check-outline" size={16} color={deliverWarranty ? '#fff' : Colors.textSecondary} />
                <Text style={[styles.warrantyBtnLabel, deliverWarranty && { color: '#fff' }]}>With Warranty</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.warrantyBtn, !deliverWarranty && styles.warrantyBtnNone]}
                onPress={() => { setDeliverWarranty(false); setDeliverWarrantyUntil(''); }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="shield-off-outline" size={16} color={!deliverWarranty ? '#fff' : Colors.textSecondary} />
                <Text style={[styles.warrantyBtnLabel, !deliverWarranty && { color: '#fff' }]}>No Warranty</Text>
              </TouchableOpacity>
            </View>
            {deliverWarranty && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.deliverFieldLabel}>Warranty Until</Text>
                <DatePickerField label="" value={deliverWarrantyUntil} onChange={setDeliverWarrantyUntil} minDate={new Date()} />
              </View>
            )}

            <View style={styles.deliverActions}>
              <Button mode="outlined" onPress={() => setDeliverModalVisible(false)}
                style={styles.btnHalf}>Cancel</Button>
              <Button mode="contained" onPress={handleDeliverWithPayment}
                loading={deliverSaving} disabled={deliverSaving}
                style={styles.btnHalf} icon="check">
                Confirm Delivery
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* ── EDIT MODAL ─────────────────────────────────── */}
      <Portal>
        <Modal visible={editVisible} onDismiss={() => setEditVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Edit Repair</Text>

            <Text style={styles.modalLabel}>Customer Name</Text>
            <TextInput mode="outlined" value={editCustomerName}
              onChangeText={async (text) => {
                setEditCustomerName(text); setSelectedCustomerId(null);
                if (text.length >= 2) {
                  const results = await searchCustomers(text);
                  setEditCustomerSuggestions(results);
                  setShowCustomerSuggestions(results.length > 0);
                } else setShowCustomerSuggestions(false);
              }}
              style={styles.input} placeholder="Customer name" />
            {showCustomerSuggestions && (
              <View style={styles.suggestionBox}>
                {editCustomerSuggestions.map(c => (
                  <TouchableOpacity key={c.id} style={styles.suggestionItem}
                    onPress={() => { setEditCustomerName(c.name); setSelectedCustomerId(c.id); setShowCustomerSuggestions(false); }}>
                    <Text style={styles.suggestionName}>{c.name}</Text>
                    {c.phone ? <Text style={styles.suggestionPhone}>{c.phone}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.modalLabel}>Device Model</Text>
            <TextInput mode="outlined" value={editDevice} onChangeText={setEditDevice} style={styles.input} />

            <Text style={styles.modalLabel}>Issue(s)</Text>
            {editSelectedIssues.length > 0 && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedText}>{editSelectedIssues.join(' · ')}</Text>
              </View>
            )}
            <View style={styles.issueChips}>
              {allIssues.map(issue => {
                const active = editSelectedIssues.includes(issue.name);
                return (
                  <TouchableOpacity key={issue.id} style={[styles.issueChip, active && styles.issueChipActive]}
                    onPress={() => setEditSelectedIssues(prev => prev.includes(issue.name) ? prev.filter(i => i !== issue.name) : [...prev, issue.name])}
                    activeOpacity={0.7}>
                    <Text style={[styles.issueChipLabel, active && styles.issueChipLabelActive]}>{issue.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.modalLabel}>Estimated Cost (₱)</Text>
            <TextInput mode="outlined" value={editEstimated} onChangeText={setEditEstimated} style={styles.input} keyboardType="decimal-pad" />

            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput mode="outlined" value={editNotes} onChangeText={setEditNotes} style={styles.input} multiline numberOfLines={2} />

            <Text style={styles.modalLabel}>Add Parts</Text>
            {editPartsToAdd.map(({ part, qty }) => (
              <View key={part.id} style={styles.editPartRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.partNameTxt}>{part.name}</Text>
                  <Text style={styles.partMetaTxt}>₱{part.selling_price} · {part.quantity} in stock</Text>
                </View>
                <View style={styles.editPartQtyRow}>
                  <TouchableOpacity onPress={() => setEditPartsToAdd(p => p.map(x => x.part.id === part.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}>
                    <Text style={styles.qtyBtn}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyNum}>{qty}</Text>
                  <TouchableOpacity onPress={() => setEditPartsToAdd(p => p.map(x => x.part.id === part.id ? { ...x, qty: Math.min(x.part.quantity, x.qty + 1) } : x))}>
                    <Text style={styles.qtyBtn}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditPartsToAdd(p => p.filter(x => x.part.id !== part.id))} style={{ marginLeft: 6 }}>
                    <Text style={{ color: Colors.error, fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <Button mode="outlined" icon="plus" onPress={() => setEditPartPickerVisible(v => !v)} style={{ borderRadius: 8, marginBottom: 8 }} compact>
              {editPartPickerVisible ? 'Close' : 'Add Part'}
            </Button>
            {editPartPickerVisible && (
              <View style={styles.editPartPicker}>
                {allPartsForEdit.filter(p => p.quantity > 0 && !editPartsToAdd.find(s => s.part.id === p.id)).map((part: any) => (
                  <TouchableOpacity key={part.id} style={styles.editPartPickerItem}
                    onPress={() => { setEditPartsToAdd(prev => [...prev, { part, qty: 1 }]); setEditPartPickerVisible(false); }}>
                    <Text style={styles.partNameTxt}>{part.name}</Text>
                    <Text style={styles.partMetaTxt}>{part.quantity} in stock · ₱{part.selling_price}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setEditVisible(false)} style={styles.btnHalf}>Cancel</Button>
              <Button mode="contained" onPress={handleSaveEdit} loading={saving}
                disabled={saving || !editDevice.trim() || editSelectedIssues.length === 0}
                style={styles.btnHalf}>Save</Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* ── PROOF IMAGE VIEWER ─────────────────────────── */}
      <RNModal visible={!!viewProofUri} transparent animationType="fade" onRequestClose={() => setViewProofUri(null)}>
        <TouchableOpacity style={styles.proofViewer} activeOpacity={1} onPress={() => setViewProofUri(null)}>
          {viewProofUri && <Image source={{ uri: viewProofUri }} style={styles.proofFullImg} resizeMode="contain" />}
          <TouchableOpacity style={styles.proofCloseBtn} onPress={() => setViewProofUri(null)}>
            <Text style={{ color: '#fff', fontSize: 28 }}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Repair"
        message="This will permanently delete this repair record. Are you sure?"
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onDismiss={() => setDeleteVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F2F4F7' },
  container: { paddingBottom: 160, paddingTop: 12 },

  // ── Card shell
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  cardSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 2,
  },

  // ── Field rows
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldIconWrap: {
    width: 28,
    alignItems: 'center',
    marginTop: 2,
  },
  fieldBody: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
    marginTop: 2,
  },
  fieldValueLarge: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  editIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F0F1F3',
    marginLeft: 54,
  },

  // ── Cost display (tappable)
  costTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  costDisplay: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },

  // ── Inline edit helpers
  inlineInput: {
    backgroundColor: '#fff',
  },
  inlineSaveBtn: {
    marginTop: 8,
    borderRadius: 8,
  },

  // ── Action buttons
  actionsWrap: {
    marginHorizontal: 12,
    marginBottom: 10,
    gap: 8,
  },
  primaryBtn: {
    borderRadius: 12,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
  },

  // ── Payment card internals
  paymentGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FB',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  paymentGridCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  paymentGridCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#E8EAED',
  },
  paymentGridLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentGridVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
  },
  unpaidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.warning + '18',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  unpaidText: {
    color: Colors.warning,
    fontWeight: '700',
    fontSize: 12,
    flex: 1,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F3',
  },
  paymentRowLeft: { flex: 1 },
  paymentRowDate: { fontSize: 13, fontWeight: '600', color: Colors.text },
  paymentRowNote: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  // ── Proof
  proofThumbWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  proofThumb: { width: 48, height: 48, borderRadius: 8 },
  proofLabel: { fontSize: 12, color: Colors.primary },
  proofViewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  proofFullImg: { width: '100%', height: '80%' },
  proofCloseBtn: { position: 'absolute', top: 48, right: 16 },

  // ── Invoice
  invoiceWrap: { paddingHorizontal: 12, marginTop: 2 },
  invoiceBtn: { borderRadius: 12 },

  // ── Payment mode chips
  modeLabel: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  modeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  modeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeChipLabel: { fontSize: 12, color: Colors.text, fontWeight: '500' },
  modeChipLabelActive: { color: '#fff', fontWeight: '700' },

  // ── Warranty inline editor
  warrantyDisplay: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  warrantyBadgeYes: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.success + '12', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.success + '30' },
  warrantyBadgeYesText: { fontSize: 12, fontWeight: '700', color: Colors.success },
  warrantyBadgeNo: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F2F4F7', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.border },
  warrantyBadgeNoText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  warrantyUntilText: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
  warrantyToggleRow: { flexDirection: 'row', gap: 8 },
  warrantyToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  warrantyToggleBtnActive: { backgroundColor: Colors.success, borderColor: Colors.success },
  warrantyToggleBtnNone: { backgroundColor: Colors.textSecondary, borderColor: Colors.textSecondary },
  warrantyToggleLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  // ── Issue tags (inline editor)
  issueTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary + '15', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, gap: 4, borderWidth: 1, borderColor: Colors.primary + '30' },
  issueTagText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  issueDropdown: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: Colors.border, marginTop: 2, overflow: 'hidden' },
  issueDropdownItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },

  // ── Deliver modal
  deliverModal: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  deliverModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  deliverModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  deliverModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  deliverModalSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  deliverFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 14,
  },
  deliverInput: {
    backgroundColor: '#fff',
  },
  deliverActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  warrantyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  warrantyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  warrantyBtnActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  warrantyBtnNone: {
    backgroundColor: Colors.textSecondary,
    borderColor: Colors.textSecondary,
  },
  warrantyBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // ── Edit modal
  modal: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 14 },
  modalLabel: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 4 },
  modalInput: { marginBottom: 8, backgroundColor: '#fff' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  input: { backgroundColor: '#fff', marginBottom: 4 },
  btnHalf: { flex: 1, borderRadius: 10 },

  // ── Customer suggestion
  suggestionBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border, borderRadius: 10, marginTop: 2, marginBottom: 6, elevation: 6, zIndex: 99, overflow: 'hidden' },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border },
  suggestionName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  suggestionPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

  // ── Issue chips (edit modal)
  selectedBadge: { backgroundColor: Colors.primary + '12', borderRadius: 8, padding: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  selectedText: { fontSize: 13, color: Colors.primary, fontWeight: '600', lineHeight: 18 },
  issueChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  issueChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  issueChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  issueChipLabel: { fontSize: 12, color: Colors.text, fontWeight: '500' },
  issueChipLabelActive: { color: '#fff', fontWeight: '700' },

  // ── Edit parts (modal)
  editPartRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  editPartQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  partNameTxt: { fontSize: 13, fontWeight: '600', color: Colors.text },
  partMetaTxt: { fontSize: 11, color: Colors.textSecondary },
  qtyBtn: { fontSize: 22, color: Colors.primary, paddingHorizontal: 4 },
  qtyNum: { fontSize: 16, fontWeight: '700', color: Colors.primary, minWidth: 24, textAlign: 'center' },
  editPartPicker: { backgroundColor: Colors.background, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 8, overflow: 'hidden' },
  editPartPickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
});
