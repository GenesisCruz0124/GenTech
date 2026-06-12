import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Keyboard, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Divider, IconButton, List, Portal, Modal, TextInput, Button, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { RootStackParamList } from '../../navigation/types';
import { Supplier, getAllSuppliers, updateSupplier, deleteSupplier } from '../../repositories/supplierRepository';
import { getPartsPurchaseHistory, PartsPurchase } from '../../repositories/partsRepository';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatDate } from '../../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'SupplierDetail'>;

export default function SupplierDetailScreen({ route, navigation }: Props) {
  const { supplierId } = route.params;
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<PartsPurchase[]>([]);
  const [deleteVisible, setDeleteVisible] = useState(false);

  // Edit modal
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editFacebook, setEditFacebook] = useState('');
  const [editShopeeUrl, setEditShopeeUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const load = useCallback(async () => {
    const all = await getAllSuppliers();
    const found = all.find(s => s.id === supplierId) ?? null;
    setSupplier(found);
    const hist = await getPartsPurchaseHistory();
    setPurchases(hist.filter(p =>
      p.supplier_name && found?.name &&
      p.supplier_name.toLowerCase().trim() === found.name.toLowerCase().trim()
    ));
  }, [supplierId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Photo pick / change / remove ──────────────────────────────
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
    const destDir = (FileSystem.documentDirectory ?? '') + 'supplier_photos/';
    const dirInfo = await FileSystem.getInfoAsync(destDir);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
    const dest = destDir + `supplier_${supplierId}_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: tempUri, to: dest });
    if (supplier?.photo_uri?.startsWith(FileSystem.documentDirectory ?? '')) {
      try { await FileSystem.deleteAsync(supplier.photo_uri, { idempotent: true }); } catch {}
    }
    await updateSupplier(supplierId, {
      name: supplier!.name,
      phone: supplier!.phone ?? undefined,
      email: supplier!.email ?? undefined,
      address: supplier!.address ?? undefined,
      facebook: supplier!.facebook ?? undefined,
      photo_uri: dest,
    });
    load();
  };

  const handlePickPhoto = () => {
    if (supplier?.photo_uri) {
      Alert.alert('Profile Photo', 'What would you like to do?', [
        { text: 'Change Photo', onPress: pickPhoto },
        {
          text: 'Remove Photo', style: 'destructive', onPress: async () => {
            if (supplier.photo_uri?.startsWith(FileSystem.documentDirectory ?? '')) {
              try { await FileSystem.deleteAsync(supplier.photo_uri, { idempotent: true }); } catch {}
            }
            await updateSupplier(supplierId, {
              name: supplier.name,
              phone: supplier.phone ?? undefined,
              email: supplier.email ?? undefined,
              address: supplier.address ?? undefined,
              facebook: supplier.facebook ?? undefined,
              photo_uri: null,
            });
            load();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      pickPhoto();
    }
  };

  // ── Header buttons ─────────────────────────────────────────────
  useEffect(() => {
    if (supplier) {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ flexDirection: 'row' }}>
            {supplier.shopee_url ? (
              <IconButton icon="shopping" iconColor="#fff"
                onPress={() => Linking.openURL(
                  supplier.shopee_url!.startsWith('http') ? supplier.shopee_url! : `https://${supplier.shopee_url}`
                )} />
            ) : null}
            {supplier.facebook ? (
              <IconButton
                icon="facebook-messenger"
                iconColor="#fff"
                onPress={() => {
                  const username = supplier.facebook!.replace(/^(https?:\/\/)?(www\.)?(facebook\.com|fb\.com|m\.me)\//i, '').replace(/\/$/, '');
                  Linking.openURL(`https://m.me/${username}`).catch(() =>
                    Linking.openURL(`https://www.facebook.com/${username}`)
                  );
                }}
              />
            ) : null}
            <IconButton icon="pencil-outline" iconColor="#fff" onPress={openEdit} />
            <IconButton icon="delete-outline" iconColor="#fff" onPress={() => setDeleteVisible(true)} />
          </View>
        ),
      });
    }
  }, [supplier]);

  if (!supplier) return null;

  const openEdit = () => {
    setEditName(supplier.name);
    setEditPhone(supplier.phone ?? '');
    setEditEmail(supplier.email ?? '');
    setEditAddress(supplier.address ?? '');
    setEditFacebook(supplier.facebook ?? '');
    setEditShopeeUrl(supplier.shopee_url ?? '');
    setEditVisible(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateSupplier(supplierId, {
      name: editName.trim(),
      phone: editPhone.trim() || undefined,
      email: editEmail.trim() || undefined,
      address: editAddress.trim() || undefined,
      facebook: editFacebook.trim() || undefined,
      shopee_url: editShopeeUrl.trim() || undefined,
    });
    setSaving(false);
    setEditVisible(false);
    load();
  };

  const handleDelete = async () => {
    await deleteSupplier(supplierId);
    navigation.goBack();
  };

  const totalSpend = purchases.reduce((sum, p) => sum + p.cost_price * p.quantity, 0);

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
                {supplier.photo_uri ? (
                  <Image source={{ uri: supplier.photo_uri }} style={styles.avatarImage} />
                ) : (
                  <Avatar.Text
                    size={64}
                    label={supplier.name.charAt(0).toUpperCase()}
                    style={styles.avatar}
                    labelStyle={{ fontSize: 26, fontWeight: '800', color: '#fff' }}
                  />
                )}
                <View style={styles.avatarEditBadge}>
                  <MaterialCommunityIcons name="camera" size={12} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={styles.headerInfo}>
                <Text style={styles.name}>{supplier.name}</Text>
                {supplier.phone ? <Text style={styles.meta}>{supplier.phone}</Text> : null}
                {supplier.email ? <Text style={styles.meta}>{supplier.email}</Text> : null}
                {supplier.address ? <Text style={styles.meta}>{supplier.address}</Text> : null}
                {supplier.facebook ? <Text style={styles.meta}>Facebook: {supplier.facebook}</Text> : null}
                {supplier.shopee_url ? <Text style={[styles.meta, { color: '#EE4D2D' }]}>🛒 Shopee Store</Text> : null}
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statVal}>{purchases.length}</Text>
                <Text style={styles.statLabel}>Purchases</Text>
              </View>
              <View style={[styles.statCell, styles.statCellBorder]}>
                <Text style={[styles.statVal, { color: Colors.primary }]}>{formatCurrency(totalSpend)}</Text>
                <Text style={styles.statLabel}>Total Spent</Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            {purchases.length > 0 ? (
              <>
                <Text style={styles.section}>Purchase History ({purchases.length})</Text>
                {purchases.map(p => (
                  <List.Item
                    key={p.id}
                    title={() => (
                      <View style={styles.purchaseTitleRow}>
                        <Text style={styles.purchaseTitle} numberOfLines={1}>{p.part_name}</Text>
                        {p.category_name && (
                          <View style={styles.catTag}>
                            <Text style={styles.catTagText}>{p.category_name}</Text>
                          </View>
                        )}
                      </View>
                    )}
                    description={`${p.quantity} unit${p.quantity !== 1 ? 's' : ''} @ ${formatCurrency(p.cost_price)} each  ·  ${formatDate(p.purchased_at)}`}
                    right={() => <Text style={styles.purchaseAmt}>{formatCurrency(p.cost_price * p.quantity)}</Text>}
                    left={props => <List.Icon {...props} icon="package-variant" color={Colors.primary} />}
                    style={styles.item}
                  />
                ))}
              </>
            ) : (
              <Text style={styles.noHistory}>No purchase history recorded for this supplier yet.</Text>
            )}
          </>
        }
      />

      {/* Edit Modal */}
      <Portal>
        <Modal visible={editVisible} onDismiss={() => setEditVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: kbHeight }}>
            <Text style={styles.modalTitle}>Edit Supplier</Text>
            <TextInput label="Name *" value={editName} onChangeText={setEditName} mode="outlined" style={styles.input} />
            <TextInput label="Phone" value={editPhone} onChangeText={setEditPhone} mode="outlined" style={styles.input} keyboardType="phone-pad" />
            <TextInput label="Email (optional)" value={editEmail} onChangeText={setEditEmail} mode="outlined" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
            <TextInput label="Address (optional)" value={editAddress} onChangeText={setEditAddress} mode="outlined" style={styles.input} />
            <TextInput label="Facebook (username or URL)" value={editFacebook} onChangeText={setEditFacebook} mode="outlined" style={styles.input} autoCapitalize="none" />
            <TextInput label="Shopee Store URL (optional)" value={editShopeeUrl} onChangeText={setEditShopeeUrl} mode="outlined" style={styles.input} autoCapitalize="none" placeholder="https://shopee.ph/yourstore" />
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setEditVisible(false)} style={styles.btnHalf}>Cancel</Button>
              <Button mode="contained" onPress={handleSave} loading={saving} disabled={!editName.trim() || saving} style={styles.btnHalf}>Save</Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Supplier"
        message={`Delete "${supplier.name}"? This cannot be undone.`}
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
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
  name: { fontSize: 22, fontWeight: '800', color: Colors.text },
  meta: { fontSize: 14, color: Colors.textSecondary, marginTop: 3 },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden', elevation: 2, marginBottom: 16 },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statCellBorder: { borderLeftWidth: 1, borderLeftColor: Colors.border },
  statVal: { fontSize: 22, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { marginBottom: 12 },
  section: { fontSize: 11, fontWeight: '800', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  item: { backgroundColor: Colors.surface, borderRadius: 8, marginVertical: 3 },
  purchaseTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  purchaseTitle: { fontSize: 16, color: Colors.text, flexShrink: 1 },
  catTag: { backgroundColor: Colors.secondary + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  catTagText: { fontSize: 11, color: Colors.secondary, fontWeight: '600' },
  purchaseAmt: { fontSize: 14, fontWeight: '700', color: Colors.primary, alignSelf: 'center', marginRight: 8 },
  noHistory: { textAlign: 'center', color: Colors.textSecondary, marginTop: 24, fontSize: 14 },
  modal: { backgroundColor: Colors.surface, margin: 20, borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  input: { marginBottom: 8, backgroundColor: Colors.surface },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btnHalf: { flex: 1, borderRadius: 10 },
});
