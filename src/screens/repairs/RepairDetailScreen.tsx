import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal as RNModal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Divider, Text, TextInput, IconButton, Portal, Modal } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useRepairStore } from '../../store/repairStore';
import { usePartsStore } from '../../store/partsStore';
import { getRepairById, RepairWithCustomer } from '../../repositories/repairRepository';
import { getAllIssues, Issue } from '../../repositories/issueRepository';
import { Customer, searchCustomers, upsertCustomerByPhone } from '../../repositories/customerRepository';
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
import StatusBadge from '../../components/repairs/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Colors } from '../../constants/colors';
import { STATUS_NEXT, STATUS_LABELS } from '../../constants/statusOptions';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'RepairDetail'>;

export default function RepairDetailScreen({ route, navigation }: Props) {
  const { repairId } = route.params;
  const { advanceStatus, removeRepair, editRepair, addNote, getNotes, setNotRepaired, deliver } = useRepairStore();
  const { getForRepair } = usePartsStore();

  const [repair, setRepair] = useState<RepairWithCustomer | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [repairImages, setRepairImages] = useState<RepairImage[]>([]);
  const [payments, setPayments] = useState<RepairPayment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [noteText, setNoteText] = useState('');
  const [deleteVisible, setDeleteVisible] = useState(false);

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

  // Edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editDevice, setEditDevice] = useState('');
  const [editSelectedIssues, setEditSelectedIssues] = useState<string[]>([]);
  const [editEstimated, setEditEstimated] = useState('');
  const [editFinal, setEditFinal] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  // Customer autocomplete in edit modal
  const [editSuggestions, setEditSuggestions] = useState<Customer[]>([]);
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);

  const load = useCallback(async () => {
    const r = await getRepairById(repairId);
    setRepair(r);
    const n = await getNotes(repairId);
    setNotes(n);
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

  if (!repair) return null;

  const nextStatus = STATUS_NEXT[repair.status];

  const openEdit = () => {
    setEditCustomerName(repair.customer_name);
    setEditCustomerPhone(repair.customer_phone ?? '');
    setEditDevice(repair.device_model);
    const saved = repair.issue_desc.split(', ').map(s => s.trim()).filter(Boolean);
    setEditSelectedIssues(saved);
    setEditEstimated(String(repair.estimated_cost));
    setEditFinal(repair.final_cost != null ? String(repair.final_cost) : '');
    setEditNotes(repair.notes ?? '');
    setShowEditSuggestions(false);
    setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      // Only upsert customer if name or phone actually changed
      const finalName = editCustomerName.trim() || repair.customer_name;
      const finalPhone = editCustomerPhone.trim() || repair.customer_phone || '';

      // Always upsert: finds existing by phone, or creates a new customer if not found
      const customerId = await upsertCustomerByPhone({
        name: finalName,
        phone: finalPhone,
      });
      await editRepair(repairId, {
        customer_id: customerId,
        device_model: editDevice.trim(),
        issue_desc: editSelectedIssues.join(', ') || repair.issue_desc,
        estimated_cost: parseFloat(editEstimated) || 0,
        final_cost: editFinal.trim() ? parseFloat(editFinal) : undefined,
        notes: editNotes.trim() || undefined,
      });
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

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    await addNote(repairId, noteText.trim());
    setNoteText('');
    load();
  };

  const handleDelete = async () => {
    await removeRepair(repairId);
    navigation.goBack();
  };

  const partsTotal = parts.reduce((sum, p) => sum + p.unit_price * p.quantity, 0);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.device}>{repair.device_model}</Text>
            <Text style={styles.customer}>{repair.customer_name} · {repair.customer_phone}</Text>
          </View>
          <View style={styles.headerActions}>
            <IconButton icon="pencil-outline" iconColor={Colors.primary} onPress={openEdit} />
            <IconButton icon="delete-outline" iconColor={Colors.error} onPress={() => setDeleteVisible(true)} />
          </View>
        </View>

        <StatusBadge status={repair.status} />

        {/* Repair photos */}
        <View style={styles.imageSection}>
          <Text style={styles.label}>Photos</Text>
          <MultiImagePicker
            images={repairImages.map(i => i.image_uri)}
            maxImages={10}
            onChange={async (uris) => {
              // Add newly added URIs
              for (const uri of uris) {
                if (!repairImages.find(i => i.image_uri === uri)) {
                  await saveRepairImage(repairId, uri);
                }
              }
              // Remove deleted URIs
              for (const img of repairImages) {
                if (!uris.includes(img.image_uri)) {
                  await deleteRepairImage(img.id, img.image_uri);
                }
              }
              load();
            }}
          />
        </View>

        <Divider style={styles.divider} />

        {/* Details */}
        <Text style={styles.label}>Issue</Text>
        <Text style={styles.value}>{repair.issue_desc}</Text>

        {repair.notes ? (
          <>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.value}>{repair.notes}</Text>
          </>
        ) : null}

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Estimated</Text>
            <Text style={styles.cost}>{formatCurrency(repair.estimated_cost)}</Text>
          </View>
          {repair.final_cost != null && (
            <View style={styles.half}>
              <Text style={styles.label}>Final Cost</Text>
              <Text style={[styles.cost, { color: Colors.success }]}>{formatCurrency(repair.final_cost)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.label}>Created</Text>
        <Text style={styles.value}>{formatDateTime(repair.created_at)}</Text>

        <Divider style={styles.divider} />

        {/* Parts used */}
        {parts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Parts Used</Text>
            {parts.map(p => (
              <View key={p.id} style={styles.partRow}>
                <Text style={styles.partName}>{p.name} × {p.quantity}</Text>
                <Text style={styles.partPrice}>{formatCurrency(p.unit_price * p.quantity)}</Text>
              </View>
            ))}
            <View style={[styles.partRow, { marginTop: 4 }]}>
              <Text style={[styles.partName, { fontWeight: '700' }]}>Parts Total</Text>
              <Text style={[styles.partPrice, { fontWeight: '700', color: Colors.primary }]}>{formatCurrency(partsTotal)}</Text>
            </View>
            <Divider style={styles.divider} />
          </>
        )}

        {/* Status advance */}
        {nextStatus && nextStatus !== 'delivered' && (
          <Button mode="contained" onPress={handleAdvance} style={styles.advanceBtn}>
            Mark as {STATUS_LABELS[nextStatus]}
          </Button>
        )}

        {/* Ready to Pickup — delivery options */}
        {repair.status === 'ready' && (
          <>
            <Button mode="contained" onPress={openDeliverModal} style={styles.advanceBtn}>
              Mark as Delivered (Paid)
            </Button>
            <Button
              mode="outlined"
              icon="cash-remove"
              onPress={() => handleDeliver(false)}
              style={[styles.advanceBtn, { borderColor: Colors.warning }]}
              textColor={Colors.warning}
            >
              Skip Payment (Unpaid)
            </Button>
          </>
        )}

        {/* Not Repaired — available until delivered */}
        {repair.status !== 'delivered' && repair.status !== 'not_repaired' && (
          <Button
            mode="outlined"
            icon="close-circle-outline"
            onPress={handleNotRepaired}
            style={[styles.advanceBtn, { borderColor: Colors.error }]}
            textColor={Colors.error}
          >
            Mark as Not Repaired
          </Button>
        )}

        {/* Payment section — visible for all delivered repairs */}
        {repair.status === 'delivered' && (() => {
          const totalOwed = repair.final_cost ?? repair.estimated_cost;
          const remaining = totalOwed - totalPaid;
          return (
            <>
              <Divider style={styles.divider} />
              <Text style={styles.sectionTitle}>Payment</Text>

              <View style={styles.paymentSummary}>
                <View style={styles.paymentCell}>
                  <Text style={styles.paymentLabel}>Total Owed</Text>
                  <Text style={styles.paymentVal}>{formatCurrency(totalOwed)}</Text>
                </View>
                <View style={styles.paymentCell}>
                  <Text style={styles.paymentLabel}>Paid</Text>
                  <Text style={[styles.paymentVal, { color: Colors.success }]}>{formatCurrency(totalPaid)}</Text>
                </View>
                <View style={styles.paymentCell}>
                  <Text style={styles.paymentLabel}>Balance</Text>
                  <Text style={[styles.paymentVal, { color: remaining > 0 ? Colors.error : Colors.success, fontWeight: '700' }]}>
                    {formatCurrency(remaining > 0 ? remaining : 0)}
                  </Text>
                </View>
              </View>

              {repair.is_paid === 0 && (
                <View style={styles.unpaidBadge}>
                  <Text style={styles.unpaidText}>⚠ Payment not fully collected</Text>
                </View>
              )}

              {payments.length > 0 && (
                <View style={styles.paymentHistory}>
                  {payments.map((p) => (
                    <View key={p.id} style={styles.paymentRow}>
                      <View style={styles.paymentLeft}>
                        <Text style={styles.paymentDate}>{p.payment_date}{p.payment_mode ? ` · ${p.payment_mode}` : ''}</Text>
                        {p.notes ? <Text style={styles.paymentNote}>{p.notes}</Text> : null}
                        {p.image_uri ? (
                          <TouchableOpacity onPress={() => setViewProofUri(p.image_uri)} style={styles.proofThumbWrap}>
                            <Image source={{ uri: p.image_uri }} style={styles.proofThumb} resizeMode="cover" />
                            <Text style={styles.proofLabel}>View proof</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <Text style={[styles.paymentVal, { color: Colors.success }]}>{formatCurrency(p.amount)}</Text>
                      <IconButton icon="delete-outline" size={16} iconColor={Colors.error} onPress={() => handleDeletePayment(p.id)} />
                    </View>
                  ))}
                </View>
              )}

              {repair.is_paid === 0 && (
                <Button mode="outlined" icon="cash-plus" onPress={openPaymentModal} style={styles.addPaymentBtn}>
                  Add Payment
                </Button>
              )}
            </>
          );
        })()}

        <Button
          mode="outlined"
          icon="receipt"
          onPress={() => navigation.navigate('InvoicePreview', { invoiceId: repairId, type: 'repair' })}
          style={styles.invoiceBtn}
        >
          Create Invoice
        </Button>

        <Divider style={styles.divider} />

        {/* Notes timeline */}
        <Text style={styles.sectionTitle}>Timeline</Text>
        {notes.map(n => (
          <View key={n.id} style={styles.note}>
            <Text style={styles.noteContent}>{n.content}</Text>
            <Text style={styles.noteMeta}>{formatDateTime(n.created_at)}{n.staff_name ? ` · ${n.staff_name}` : ''}</Text>
          </View>
        ))}

        <View style={styles.noteInput}>
          <TextInput
            mode="outlined"
            label="Add note..."
            value={noteText}
            onChangeText={setNoteText}
            style={styles.noteField}
            multiline
          />
          <Button mode="contained" onPress={handleAddNote} disabled={!noteText.trim()} style={styles.noteBtn}>
            Add
          </Button>
        </View>
      </ScrollView>

      {/* Add Payment Modal */}
      <Portal>
        <Modal visible={paymentModalVisible} onDismiss={() => setPaymentModalVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Add Payment</Text>
            <TextInput label="Amount (₱) *" value={paymentAmount} onChangeText={setPaymentAmount} mode="outlined" style={styles.modalInput} keyboardType="decimal-pad" />
            <TextInput label="Payment Date *" value={paymentDate} onChangeText={setPaymentDate} mode="outlined" style={styles.modalInput} placeholder="YYYY-MM-DD" />
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

      {/* Deliver with Payment Modal */}
      <Portal>
        <Modal visible={deliverModalVisible} onDismiss={() => setDeliverModalVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Mark as Delivered — Payment</Text>
            <TextInput label="Amount Received (₱)" value={deliverAmount} onChangeText={setDeliverAmount} mode="outlined" style={styles.modalInput} keyboardType="decimal-pad" />
            <TextInput label="Payment Date" value={deliverDate} onChangeText={setDeliverDate} mode="outlined" style={styles.modalInput} placeholder="YYYY-MM-DD" />
            <Text style={styles.modeLabel}>Mode of Payment</Text>
            <View style={styles.modeChips}>
              {PAYMENT_MODES.map(m => (
                <TouchableOpacity key={m} style={[styles.modeChip, deliverMode === m && styles.modeChipActive]} onPress={() => setDeliverMode(m)}>
                  <Text style={[styles.modeChipLabel, deliverMode === m && styles.modeChipLabelActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput label="Notes (optional)" value={deliverNotes} onChangeText={setDeliverNotes} mode="outlined" style={styles.modalInput} />
            <Text style={styles.modeLabel}>Proof of Payment</Text>
            <ImagePickerField uri={deliverImage} onPicked={setDeliverImage} onClear={() => setDeliverImage(null)} />
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setDeliverModalVisible(false)} style={styles.btnHalf}>Cancel</Button>
              <Button mode="contained" onPress={handleDeliverWithPayment} loading={deliverSaving} disabled={deliverSaving} style={styles.btnHalf}>Confirm</Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Edit Modal */}
      <Portal>
        <Modal visible={editVisible} onDismiss={() => setEditVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Edit Repair</Text>

            <Text style={styles.modalLabel}>Customer Name</Text>
            <TextInput
              mode="outlined"
              value={editCustomerName}
              onChangeText={async (text) => {
                setEditCustomerName(text);
                if (text.length >= 2) {
                  const results = await searchCustomers(text);
                  setEditSuggestions(results);
                  setShowEditSuggestions(results.length > 0);
                } else {
                  setShowEditSuggestions(false);
                }
              }}
              style={styles.input}
              placeholder="Customer name"
            />
            {showEditSuggestions && (
              <View style={styles.suggestionBox}>
                {editSuggestions.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setEditCustomerName(c.name);
                      setEditCustomerPhone(c.phone ?? '');
                      setShowEditSuggestions(false);
                    }}
                  >
                    <Text style={styles.suggestionName}>{c.name}</Text>
                    <Text style={styles.suggestionPhone}>{c.phone}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.modalLabel}>Customer Phone</Text>
            <TextInput
              mode="outlined"
              value={editCustomerPhone}
              onChangeText={setEditCustomerPhone}
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="Phone number"
            />

            <Text style={styles.modalLabel}>Device Model</Text>
            <TextInput
              mode="outlined"
              value={editDevice}
              onChangeText={setEditDevice}
              style={styles.input}
            />

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
                  <TouchableOpacity
                    key={issue.id}
                    style={[styles.issueChip, active && styles.issueChipActive]}
                    onPress={() =>
                      setEditSelectedIssues(prev =>
                        prev.includes(issue.name)
                          ? prev.filter(i => i !== issue.name)
                          : [...prev, issue.name]
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.issueChipLabel, active && styles.issueChipLabelActive]}>
                      {issue.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.modalLabel}>Estimated Cost (₱)</Text>
            <TextInput
              mode="outlined"
              value={editEstimated}
              onChangeText={setEditEstimated}
              style={styles.input}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Final Cost (₱) — leave blank if not done</Text>
            <TextInput
              mode="outlined"
              value={editFinal}
              onChangeText={setEditFinal}
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="e.g. 850"
            />

            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput
              mode="outlined"
              value={editNotes}
              onChangeText={setEditNotes}
              style={styles.input}
              multiline
              numberOfLines={2}
            />

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setEditVisible(false)} style={styles.cancelBtn}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveEdit}
                loading={saving}
                disabled={saving || !editDevice.trim() || editSelectedIssues.length === 0}
                style={styles.saveBtn}
              >
                Save
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Proof image full-screen viewer */}
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
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  headerLeft: { flex: 1 },
  headerActions: { flexDirection: 'row' },
  device: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  customer: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  divider: { marginVertical: 12 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  value: { fontSize: 15, color: Colors.text, marginTop: 2 },
  cost: { fontSize: 18, fontWeight: 'bold', color: Colors.primary, marginTop: 2 },
  row: { flexDirection: 'row', marginTop: 4 },
  half: { flex: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  partRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  partName: { fontSize: 14, color: Colors.text },
  partPrice: { fontSize: 14, color: Colors.textSecondary },
  advanceBtn: { marginBottom: 8, borderRadius: 8 },
  invoiceBtn: { borderRadius: 8 },
  unpaidBadge: { backgroundColor: Colors.warning + '20', borderRadius: 6, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: Colors.warning },
  unpaidText: { color: Colors.warning, fontWeight: '600', fontSize: 13 },
  imageSection: { marginTop: 8 },
  paymentSummary: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: 8, marginBottom: 10 },
  paymentCell: { flex: 1, alignItems: 'center', padding: 10 },
  paymentLabel: { fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase' },
  paymentVal: { fontSize: 14, fontWeight: '600', color: Colors.text, marginTop: 2 },
  paymentHistory: { backgroundColor: Colors.background, borderRadius: 8, marginBottom: 8 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  paymentLeft: { flex: 1 },
  paymentDate: { fontSize: 13, fontWeight: '600', color: Colors.text },
  proofThumbWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  proofThumb: { width: 56, height: 56, borderRadius: 6 },
  proofLabel: { fontSize: 12, color: Colors.primary },
  proofViewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  proofFullImg: { width: '100%', height: '80%' },
  proofCloseBtn: { position: 'absolute', top: 48, right: 16 },
  modeLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6, marginTop: 8 },
  modeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  modeChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  modeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeChipLabel: { fontSize: 12, color: Colors.text },
  modeChipLabelActive: { color: '#fff', fontWeight: '600' },
  paymentNote: { fontSize: 11, color: Colors.textSecondary },
  addPaymentBtn: { borderRadius: 8, marginBottom: 4 },
  suggestionBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, marginTop: 2, marginBottom: 6, elevation: 4, zIndex: 99 },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  suggestionName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  suggestionPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  selectedBadge: { backgroundColor: Colors.primary + '15', borderRadius: 8, padding: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  selectedText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  issueChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 8 },
  issueChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  issueChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  issueChipLabel: { fontSize: 12, color: Colors.text },
  issueChipLabelActive: { color: '#fff', fontWeight: '600' },
  modal: { backgroundColor: Colors.surface, margin: 16, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  modalInput: { marginBottom: 8, backgroundColor: Colors.surface },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnHalf: { flex: 1, borderRadius: 8 },
  note: { backgroundColor: Colors.surface, borderRadius: 6, padding: 10, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: Colors.primaryLight },
  noteContent: { fontSize: 14, color: Colors.text },
  noteMeta: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  noteInput: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  noteField: { flex: 1, backgroundColor: Colors.surface },
  noteBtn: { marginBottom: 2, borderRadius: 6 },
  // Modal
  modal: { backgroundColor: Colors.surface, margin: 16, borderRadius: 12, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: Colors.surface },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cancelBtn: { flex: 1, borderRadius: 8 },
  saveBtn: { flex: 1, borderRadius: 8 },
});
