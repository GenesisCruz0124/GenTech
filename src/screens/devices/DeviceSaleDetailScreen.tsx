import React, { useCallback, useState } from 'react';
import { Alert, Image, Modal as RNModal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, IconButton, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { getDeviceSaleById, DeviceSale } from '../../repositories/deviceSaleRepository';
import {
  DeviceSalePayment,
  addDeviceSalePayment,
  getDeviceSalePayments,
  getTotalPaid,
  deleteDeviceSalePayment,
  PAYMENT_MODES,
} from '../../repositories/deviceSalePaymentRepository';
import ImagePickerField from '../../components/common/ImagePickerField';
import DatePickerField from '../../components/common/DatePickerField';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceSaleDetail'>;

export default function DeviceSaleDetailScreen({ route }: Props) {
  const { saleId } = route.params;
  const [sale, setSale] = useState<DeviceSale | null>(null);
  const [payments, setPayments] = useState<DeviceSalePayment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [viewProofUri, setViewProofUri] = useState<string | null>(null);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentImage, setPaymentImage] = useState<string | null>(null);
  const [paymentSaving, setPaymentSaving] = useState(false);

  const load = useCallback(async () => {
    const s = await getDeviceSaleById(saleId);
    setSale(s);
    const pmt = await getDeviceSalePayments(saleId);
    setPayments(pmt);
    setTotalPaid(await getTotalPaid(saleId));
  }, [saleId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
    await addDeviceSalePayment(saleId, amt, paymentDate, {
      notes: paymentNotes.trim() || undefined,
      paymentMode: paymentMode,
      imageUri: paymentImage || undefined,
    });
    setPaymentSaving(false);
    setPaymentModalVisible(false);
    load();
  };

  const handleDeletePayment = (pmtId: number) => {
    Alert.alert('Delete Payment', 'Remove this payment record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDeviceSalePayment(pmtId, saleId); load(); } },
    ]);
  };

  if (!sale) return null;

  const totalOwed = sale.sale_price;
  const remaining = totalOwed - totalPaid;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>Device Info</Text>
          <Text style={styles.deviceName}>{sale.device_name} {sale.device_model}</Text>
          <Text style={styles.metaLine}>{sale.customer_name}{sale.customer_phone ? ` · ${sale.customer_phone}` : ''}</Text>
          {sale.imei ? <Text style={styles.metaLine}>IMEI: {sale.imei}</Text> : null}
          <Text style={styles.metaLine}>Sold {formatDateTime(sale.sold_at)}</Text>
          {sale.notes ? <Text style={styles.metaLine}>{sale.notes}</Text> : null}
          {sale.image_uri ? (
            <Image source={{ uri: sale.image_uri }} style={styles.deviceImage} resizeMode="cover" />
          ) : null}
        </View>

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

          {remaining > 0 && (
            <View style={styles.unpaidBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color={Colors.warning} />
              <Text style={styles.unpaidText}>{totalPaid > 0 ? 'Partially paid' : 'Payment not yet collected'}</Text>
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

          {remaining > 0 && (
            <Button mode="outlined" icon="cash-plus" onPress={openPaymentModal} style={[styles.primaryBtn, { marginTop: 12 }]}>
              Add Payment
            </Button>
          )}
        </View>

      </ScrollView>

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

      <RNModal visible={!!viewProofUri} transparent animationType="fade" onRequestClose={() => setViewProofUri(null)}>
        <View style={styles.proofViewer}>
          {viewProofUri && <Image source={{ uri: viewProofUri }} style={styles.proofFullImg} resizeMode="contain" />}
          <IconButton icon="close" size={28} iconColor="#fff" style={styles.proofCloseBtn} onPress={() => setViewProofUri(null)} />
        </View>
      </RNModal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 12, paddingBottom: 32, gap: 10 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  deviceName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  metaLine: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  deviceImage: { width: '100%', height: 180, borderRadius: 10, marginTop: 10 },

  primaryBtn: { borderRadius: 12 },

  paymentGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FB',
    marginHorizontal: -16,
    marginTop: -4,
    marginBottom: 12,
    borderRadius: 0,
    overflow: 'hidden',
  },
  paymentGridCell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  paymentGridCellBorder: { borderLeftWidth: 1, borderLeftColor: '#E8EAED' },
  paymentGridLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentGridVal: { fontSize: 15, fontWeight: '800', color: Colors.text, marginTop: 4 },
  unpaidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.warning + '18',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  unpaidText: { color: Colors.warning, fontWeight: '700', fontSize: 12, flex: 1 },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F3',
  },
  paymentRowLeft: { flex: 1 },
  paymentRowDate: { fontSize: 13, fontWeight: '600', color: Colors.text },
  paymentRowNote: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  proofThumbWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  proofThumb: { width: 48, height: 48, borderRadius: 8 },
  proofLabel: { fontSize: 12, color: Colors.primary },
  proofViewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  proofFullImg: { width: '100%', height: '80%' },
  proofCloseBtn: { position: 'absolute', top: 48, right: 16 },

  modeLabel: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  modeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  modeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeChipLabel: { fontSize: 12, color: Colors.text, fontWeight: '500' },
  modeChipLabelActive: { color: '#fff', fontWeight: '700' },

  modal: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 14 },
  modalInput: { marginBottom: 8, backgroundColor: '#fff' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btnHalf: { flex: 1, borderRadius: 10 },
});
