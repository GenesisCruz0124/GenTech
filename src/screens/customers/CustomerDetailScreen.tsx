import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Keyboard, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Divider, IconButton, List, Portal, Modal, TextInput, Button, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
  const [editFacebook, setEditFacebook] = useState('');
  const [saving, setSaving] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const tempUri = result.assets[0].uri;
    const destDir = FileSystem.documentDirectory + 'customer_photos/';
    const dirInfo = await FileSystem.getInfoAsync(destDir);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
    const dest = destDir + `customer_${customerId}_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: tempUri, to: dest });
    if (customer?.photo_uri?.startsWith(FileSystem.documentDirectory ?? '')) {
      try { await FileSystem.deleteAsync(customer.photo_uri, { idempotent: true }); } catch {}
    }
    await editCustomer(customerId, { photo_uri: dest });
    load();
  };

  const handlePickPhoto = () => {
    if (customer?.photo_uri) {
      Alert.alert('Profile Photo', 'What would you like to do?', [
        { text: 'Change Photo', onPress: pickPhoto },
        {
          text: 'Remove Photo', style: 'destructive', onPress: async () => {
            if (customer.photo_uri?.startsWith(FileSystem.documentDirectory ?? '')) {
              try { await FileSystem.deleteAsync(customer.photo_uri, { idempotent: true }); } catch {}
            }
            await editCustomer(customerId, { photo_uri: null });
            load();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      pickPhoto();
    }
  };

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

  const openMessenger = (fbUsername: string) => {
    const username = fbUsername.replace(/^(https?:\/\/)?(www\.)?(facebook\.com|fb\.com|m\.me)\//i, '').replace(/\/$/, '');
    Linking.openURL(`https://m.me/${username}`).catch(() =>
      Linking.openURL(`https://www.facebook.com/${username}`)
    );
  };

  useEffect(() => {
    if (customer) {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ flexDirection: 'row' }}>
            {customer.facebook ? (
              <IconButton
                icon="facebook-messenger"
                iconColor="#fff"
                onPress={() => openMessenger(customer.facebook!)}
              />
            ) : null}
            <IconButton icon="wrench-outline" iconColor="#fff"
              onPress={() => navigation.navigate('NewRepair', { customerName: customer.name, customerPhone: customer.phone ?? '' })} />
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
    setEditFacebook(customer.facebook ?? '');
    setEditVisible(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await editCustomer(customerId, {
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim() || undefined,
      address: editAddress.trim() || undefined,
      facebook: editFacebook.trim() || undefined,
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
              <TouchableOpacity onPress={handlePickPhoto} style={styles.avatarWrap}>
                {customer.photo_uri ? (
                  <Image source={{ uri: customer.photo_uri }} style={styles.avatarImage} />
                ) : (
                  <Avatar.Text size={64} label={customer.name.charAt(0)} style={styles.avatar} labelStyle={{ fontSize: 26 }} />
                )}
                <View style={styles.avatarEditBadge}>
                  <MaterialCommunityIcons name="camera" size={12} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={styles.headerInfo}>
                <Text style={styles.name}>{customer.name}</Text>
                <Text style={styles.phone}>{customer.phone}</Text>
                {customer.address ? <Text style={styles.phone}>{customer.address}</Text> : null}
                {customer.facebook ? <Text style={styles.phone}>Facebook: {customer.facebook}</Text> : null}
              </View>
            </View>

            <Divider style={styles.divider} />

            {repairs.length > 0 && (
              <>
                <Text style={styles.section}>Repairs ({repairs.length})</Text>
                {repairs.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.repairCard}
                    onPress={() => navigation.navigate('RepairDetail', { repairId: r.id })}
                    activeOpacity={0.85}
                  >
                    {/* Top row: model + cost */}
                    <View style={styles.repairCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.repairModel}>{r.device_model}</Text>
                        <Text style={styles.repairIssue} numberOfLines={1}>{r.issue_desc}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={styles.repairCost}>{formatCurrency(r.final_cost ?? r.estimated_cost)}</Text>
                        <StatusBadge status={r.status} />
                      </View>
                    </View>

                    {/* Divider */}
                    <View style={styles.repairCardDivider} />

                    {/* Bottom row: dates + warranty */}
                    <View style={styles.repairCardBottom}>
                      <View style={styles.repairDateCol}>
                        <Text style={styles.repairDateLabel}>Recorded</Text>
                        <Text style={styles.repairDateVal}>{formatDate(r.created_at)}</Text>
                      </View>
                      {r.delivered_at ? (
                        <View style={styles.repairDateCol}>
                          <Text style={styles.repairDateLabel}>Delivered</Text>
                          <Text style={styles.repairDateVal}>{formatDate(r.delivered_at)}</Text>
                        </View>
                      ) : null}
                      <View style={[styles.warrantyChip, r.has_warranty ? styles.warrantyChipYes : styles.warrantyChipNo]}>
                        <MaterialCommunityIcons
                          name={r.has_warranty ? 'shield-check' : 'shield-off'}
                          size={12}
                          color={r.has_warranty ? Colors.success : Colors.textSecondary}
                        />
                        <Text style={[styles.warrantyChipText, r.has_warranty ? { color: Colors.success } : {}]}>
                          {r.has_warranty
                            ? (r.warranty_until ? `Warranty until ${formatDate(r.warranty_until)}` : 'Under Warranty')
                            : 'No Warranty'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                <View style={styles.divider} />
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
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: kbHeight }}>
            <Text style={styles.modalTitle}>Edit Customer</Text>
            <TextInput label="Name *" value={editName} onChangeText={setEditName} mode="outlined" style={styles.input} />
            <TextInput label="Phone" value={editPhone} onChangeText={setEditPhone} mode="outlined" style={styles.input} keyboardType="phone-pad" />
            <TextInput label="Email (optional)" value={editEmail} onChangeText={setEditEmail} mode="outlined" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
            <TextInput label="Address (optional)" value={editAddress} onChangeText={setEditAddress} mode="outlined" style={styles.input} />
            <TextInput label="Facebook (username or URL)" value={editFacebook} onChangeText={setEditFacebook} mode="outlined" style={styles.input} autoCapitalize="none" />
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setEditVisible(false)} style={styles.btnHalf}>Cancel</Button>
              <Button mode="contained" onPress={handleSave} loading={saving} disabled={!editName.trim() || saving} style={styles.btnHalf}>Save</Button>
            </View>
          </ScrollView>
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
  avatarWrap: { position: 'relative' },
  avatar: { backgroundColor: Colors.primary },
  avatarImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.border },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  headerInfo: { marginLeft: 16, flex: 1 },
  name: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  phone: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  divider: { marginVertical: 12 },
  section: { fontSize: 11, fontWeight: '800', color: Colors.primary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  item: { backgroundColor: Colors.surface, borderRadius: 8, marginVertical: 3 },
  right: { alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  cost: { fontSize: 15, fontWeight: 'bold', color: Colors.primary },
  noHistory: { textAlign: 'center', color: Colors.textSecondary, marginTop: 24, fontSize: 14 },
  modal: { backgroundColor: Colors.surface, margin: 20, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  input: { marginBottom: 8, backgroundColor: Colors.surface },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnHalf: { flex: 1, borderRadius: 8 },

  // Repair history card
  repairCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  repairCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 10,
  },
  repairModel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  repairIssue: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  repairCost: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  repairCardDivider: { height: 1, backgroundColor: '#F0F1F3' },
  repairCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    flexWrap: 'wrap',
  },
  repairDateCol: { gap: 1 },
  repairDateLabel: { fontSize: 9, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  repairDateVal: { fontSize: 12, fontWeight: '600', color: Colors.text },
  warrantyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 'auto',
  },
  warrantyChipYes: { backgroundColor: Colors.success + '12', borderColor: Colors.success + '40' },
  warrantyChipNo: { backgroundColor: '#F2F4F7', borderColor: Colors.border },
  warrantyChipText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
});
