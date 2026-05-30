import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Avatar, Divider, IconButton, List, Portal, Modal, TextInput, Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { getCustomerById, Customer } from '../../repositories/customerRepository';
import { listRepairs, RepairWithCustomer } from '../../repositories/repairRepository';
import { getAllDeviceSales, DeviceSale } from '../../repositories/deviceSaleRepository';
import { getAllDevicePurchases, DevicePurchase } from '../../repositories/devicePurchaseRepository';
import { useCustomerStore } from '../../store/customerStore';
import StatusBadge from '../../components/repairs/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatDate } from '../../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerDetail'>;

export default function CustomerDetailScreen({ route, navigation }: Props) {
  const { customerId } = route.params;
  const { editCustomer, removeCustomer } = useCustomerStore();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [repairs, setRepairs] = useState<RepairWithCustomer[]>([]);
  const [sales, setSales] = useState<DeviceSale[]>([]);
  const [purchases, setPurchases] = useState<DevicePurchase[]>([]);
  const [deleteVisible, setDeleteVisible] = useState(false);

  // Edit modal
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const c = await getCustomerById(customerId);
    setCustomer(c);
    const allRepairs = await listRepairs({});
    setRepairs(allRepairs.filter(r => r.customer_id === customerId));
    const allSales = await getAllDeviceSales();
    setSales(allSales.filter(s => s.customer_id === customerId));
    const allPurchases = await getAllDevicePurchases();
    setPurchases(allPurchases.filter(p => p.customer_id === customerId));
  }, [customerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (customer) {
      navigation.setOptions({
        title: customer.name,
        headerRight: () => (
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon="pencil-outline" iconColor="#fff" onPress={openEdit} />
            <IconButton icon="delete-outline" iconColor="#fff" onPress={() => setDeleteVisible(true)} />
          </View>
        ),
      });
    }
  }, [customer]);

  if (!customer) return null;

  const openEdit = () => {
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditEmail(customer.email ?? '');
    setEditAddress(customer.address ?? '');
    setEditVisible(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await editCustomer(customerId, {
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim() || undefined,
      address: editAddress.trim() || undefined,
    });
    setSaving(false);
    setEditVisible(false);
    load();
  };

  const handleDelete = async () => {
    await removeCustomer(customerId);
    navigation.goBack();
  };

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* Profile header */}
            <View style={styles.header}>
              <Avatar.Text size={56} label={customer.name.charAt(0)} style={styles.avatar} labelStyle={{ fontSize: 24 }} />
              <View style={styles.headerInfo}>
                <Text style={styles.name}>{customer.name}</Text>
                <Text style={styles.phone}>{customer.phone}</Text>
                {customer.email ? <Text style={styles.phone}>{customer.email}</Text> : null}
                {customer.address ? <Text style={styles.phone}>{customer.address}</Text> : null}
              </View>
            </View>

            <Divider style={styles.divider} />

            {repairs.length > 0 && (
              <>
                <Text style={styles.section}>Repairs ({repairs.length})</Text>
                {repairs.map(r => (
                  <List.Item
                    key={r.id}
                    title={r.device_model}
                    description={r.issue_desc}
                    right={() => (
                      <View style={styles.right}>
                        <Text style={styles.cost}>{formatCurrency(r.final_cost ?? r.estimated_cost)}</Text>
                        <StatusBadge status={r.status} />
                      </View>
                    )}
                    style={styles.item}
                    onPress={() => navigation.navigate('RepairDetail', { repairId: r.id })}
                  />
                ))}
                <Divider style={styles.divider} />
              </>
            )}

            {sales.length > 0 && (
              <>
                <Text style={styles.section}>Devices Sold to Customer ({sales.length})</Text>
                {sales.map(s => (
                  <List.Item
                    key={s.id}
                    title={`${s.device_name} ${s.device_model}`}
                    description={`IMEI: ${s.imei ?? '—'} · ${formatDate(s.sold_at)}`}
                    right={() => <Text style={styles.cost}>{formatCurrency(s.sale_price)}</Text>}
                    style={styles.item}
                  />
                ))}
                <Divider style={styles.divider} />
              </>
            )}

            {purchases.length > 0 && (
              <>
                <Text style={styles.section}>Devices Bought from Customer ({purchases.length})</Text>
                {purchases.map(p => (
                  <List.Item
                    key={p.id}
                    title={`${p.device_name} ${p.device_model}`}
                    description={`IMEI: ${p.imei ?? '—'} · ${formatDate(p.purchased_at)}`}
                    right={() => <Text style={styles.cost}>{formatCurrency(p.purchase_price)}</Text>}
                    style={styles.item}
                  />
                ))}
              </>
            )}

            {repairs.length === 0 && sales.length === 0 && purchases.length === 0 && (
              <Text style={styles.noHistory}>No transactions recorded for this customer yet.</Text>
            )}
          </>
        }
      />

      {/* Edit Modal */}
      <Portal>
        <Modal visible={editVisible} onDismiss={() => setEditVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Edit Customer</Text>
          <TextInput label="Name *" value={editName} onChangeText={setEditName} mode="outlined" style={styles.input} />
          <TextInput label="Phone *" value={editPhone} onChangeText={setEditPhone} mode="outlined" style={styles.input} keyboardType="phone-pad" />
          <TextInput label="Email" value={editEmail} onChangeText={setEditEmail} mode="outlined" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
          <TextInput label="Address" value={editAddress} onChangeText={setEditAddress} mode="outlined" style={styles.input} />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setEditVisible(false)} style={styles.btnHalf}>Cancel</Button>
            <Button mode="contained" onPress={handleSave} loading={saving} disabled={!editName.trim() || saving} style={styles.btnHalf}>Save</Button>
          </View>
        </Modal>
      </Portal>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Customer"
        message={`Delete ${customer.name}? This will not delete their repair or device records.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onDismiss={() => setDeleteVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  avatar: { backgroundColor: Colors.primary },
  headerInfo: { marginLeft: 16, flex: 1 },
  name: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  phone: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  divider: { marginVertical: 12 },
  section: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 6 },
  item: { backgroundColor: Colors.surface, borderRadius: 8, marginVertical: 3 },
  right: { alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  cost: { fontSize: 15, fontWeight: 'bold', color: Colors.primary },
  noHistory: { textAlign: 'center', color: Colors.textSecondary, marginTop: 24, fontSize: 14 },
  modal: { backgroundColor: Colors.surface, margin: 20, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  input: { marginBottom: 8, backgroundColor: Colors.surface },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnHalf: { flex: 1, borderRadius: 8 },
});
