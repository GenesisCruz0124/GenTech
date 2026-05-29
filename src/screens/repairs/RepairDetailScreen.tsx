import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, Text, TextInput, IconButton, Portal, Modal } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useRepairStore } from '../../store/repairStore';
import { usePartsStore } from '../../store/partsStore';
import { getRepairById, RepairWithCustomer } from '../../repositories/repairRepository';
import StatusBadge from '../../components/repairs/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Colors } from '../../constants/colors';
import { STATUS_NEXT, STATUS_LABELS } from '../../constants/statusOptions';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'RepairDetail'>;

export default function RepairDetailScreen({ route, navigation }: Props) {
  const { repairId } = route.params;
  const { advanceStatus, removeRepair, editRepair, addNote, getNotes } = useRepairStore();
  const { getForRepair } = usePartsStore();

  const [repair, setRepair] = useState<RepairWithCustomer | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [noteText, setNoteText] = useState('');
  const [deleteVisible, setDeleteVisible] = useState(false);

  // Edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editDevice, setEditDevice] = useState('');
  const [editIssue, setEditIssue] = useState('');
  const [editEstimated, setEditEstimated] = useState('');
  const [editFinal, setEditFinal] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await getRepairById(repairId);
    setRepair(r);
    const n = await getNotes(repairId);
    setNotes(n);
    const p = await getForRepair(repairId);
    setParts(p);
  }, [repairId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!repair) return null;

  const nextStatus = STATUS_NEXT[repair.status];

  const openEdit = () => {
    setEditDevice(repair.device_model);
    setEditIssue(repair.issue_desc);
    setEditEstimated(String(repair.estimated_cost));
    setEditFinal(repair.final_cost != null ? String(repair.final_cost) : '');
    setEditNotes(repair.notes ?? '');
    setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await editRepair(repairId, {
        device_model: editDevice.trim(),
        issue_desc: editIssue.trim(),
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

  const handleAdvance = async () => {
    if (!nextStatus) return;
    await advanceStatus(repairId, nextStatus);
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
        {nextStatus && (
          <Button mode="contained" onPress={handleAdvance} style={styles.advanceBtn}>
            Mark as {STATUS_LABELS[nextStatus]}
          </Button>
        )}

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

      {/* Edit Modal */}
      <Portal>
        <Modal visible={editVisible} onDismiss={() => setEditVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Edit Repair</Text>

            <Text style={styles.modalLabel}>Device Model</Text>
            <TextInput
              mode="outlined"
              value={editDevice}
              onChangeText={setEditDevice}
              style={styles.input}
            />

            <Text style={styles.modalLabel}>Issue Description</Text>
            <TextInput
              mode="outlined"
              value={editIssue}
              onChangeText={setEditIssue}
              style={styles.input}
              multiline
              numberOfLines={3}
            />

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
                disabled={saving || !editDevice.trim() || !editIssue.trim()}
                style={styles.saveBtn}
              >
                Save
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

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
