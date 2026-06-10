import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, Image, Keyboard, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Button, FAB, List, Modal, Portal, Searchbar, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAnimatedTabTitle } from '../../hooks/useAnimatedTabTitle';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import {
  Supplier,
  getAllSuppliers,
  createSupplier,
} from '../../repositories/supplierRepository';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';
import { formatCurrency } from '../../utils/formatters';

const hdrBtn: any = { padding: 5, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', marginRight: 12 };
const hdrBtnActive: any = { backgroundColor: 'rgba(255,255,255,0.4)' };

export default function SupplierListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  useAnimatedTabTitle(navigation, 'Suppliers');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'has_purchases'>('all');
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortMode, setSortMode] = useState<'alpha' | 'recent'>('alpha');

  // Add modal
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [facebook, setFacebook] = useState('');
  const [shopeeUrl, setShopeeUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const toggleSort = () => setSortMode(s => s === 'alpha' ? 'recent' : 'alpha');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 8, gap: 4 }}>
          <TouchableOpacity style={hdrBtn} onPress={() => navigation.navigate('PriceInquiry')}>
            <MaterialCommunityIcons name="tag-search-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[hdrBtn, filterMode === 'has_purchases' && hdrBtnActive]} onPress={() => setFilterVisible(v => !v)}>
            <MaterialCommunityIcons name="filter-variant" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[hdrBtn, sortMode === 'recent' && hdrBtnActive]} onPress={toggleSort}>
            <MaterialCommunityIcons name={sortMode === 'alpha' ? 'sort-alphabetical-ascending' : 'sort-clock-descending-outline'} size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={hdrBtn} onPress={() => setSearchVisible(v => !v)}>
            <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, filterMode, filterVisible, sortMode]);

  const load = useCallback(async () => {
    setSuppliers(await getAllSuppliers());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => {
    setName(''); setPhone(''); setEmail(''); setAddress(''); setFacebook(''); setShopeeUrl('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createSupplier({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        facebook: facebook.trim() || undefined,
        shopee_url: shopeeUrl.trim() || undefined,
      });
      setModalVisible(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save supplier.');
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setName(''); setPhone(''); setEmail(''); setAddress(''); setFacebook('');
  };

  const openMessenger = (fbUsername: string) => {
    const username = fbUsername.replace(/^(https?:\/\/)?(www\.)?(facebook\.com|fb\.com|m\.me)\//i, '').replace(/\/$/, '');
    Linking.openURL(`https://m.me/${username}`).catch(() =>
      Linking.openURL(`https://www.facebook.com/${username}`)
    );
  };

  const filtered = suppliers
    .filter(s => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.phone ?? '').includes(search);
      if (!matchSearch) return false;
      if (filterMode === 'has_purchases') return (s.purchase_count ?? 0) > 0;
      return true;
    })
    .sort((a, b) => {
      if (sortMode === 'recent') {
        const ta = a.last_purchase_at ?? '';
        const tb = b.last_purchase_at ?? '';
        return tb.localeCompare(ta);
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <View style={styles.container}>
      {searchVisible && (
        <Searchbar
          placeholder="Search suppliers..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
          autoFocus
          onIconPress={() => { setSearch(''); setSearchVisible(false); }}
          icon="arrow-left"
        />
      )}

      {filterVisible && (
        <View style={styles.filterRow}>
          {(['all', 'has_purchases'] as const).map(f => {
            const active = filterMode === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilterMode(f)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipLabel, active && styles.filterChipLabelActive]}>
                  {f === 'all' ? 'All' : 'Has Purchases'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={s => String(s.id)}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={item.phone ?? item.email ?? item.address ?? ''}
            left={() => (
              item.photo_uri
                ? <Image source={{ uri: item.photo_uri }} style={styles.avatarImage} />
                : <Avatar.Text size={40} label={item.name.charAt(0).toUpperCase()} style={styles.avatar} labelStyle={{ fontSize: 18 }} />
            )}
            right={() => (
              <View style={styles.itemRight}>
                {item.shopee_url ? (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(
                      item.shopee_url!.startsWith('http') ? item.shopee_url! : `https://${item.shopee_url}`
                    )}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.shopeeIcon}
                  >
                    <MaterialCommunityIcons name="shopping" size={22} color="#EE4D2D" />
                  </TouchableOpacity>
                ) : null}
                {item.facebook ? (
                  <TouchableOpacity
                    onPress={() => openMessenger(item.facebook!)}
                    style={styles.messengerBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="facebook-messenger" size={22} color="#0084FF" />
                  </TouchableOpacity>
                ) : null}
                <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textSecondary} />
              </View>
            )}
            onPress={() => navigation.navigate('SupplierDetail', { supplierId: item.id })}
            style={styles.item}
          />
        )}
        ItemSeparatorComponent={() => null}
        ListEmptyComponent={
          <EmptyState icon="truck-delivery-outline" title="No suppliers yet" subtitle="Tap + New Supplier to add one" />
        }
        refreshing={false}
        onRefresh={load}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
      />

      <FAB icon="plus" label="New Supplier" style={styles.fab} color="#fff" onPress={openAdd} />

      <Portal>
        <Modal visible={modalVisible} onDismiss={closeModal} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: kbHeight }}>
          <Text style={styles.modalTitle}>New Supplier</Text>
          <TextInput label="Name *" value={name} onChangeText={setName} mode="outlined" style={styles.input} autoFocus />
          <TextInput label="Phone" value={phone} onChangeText={setPhone} mode="outlined" style={styles.input} keyboardType="phone-pad" />
          <TextInput label="Email (optional)" value={email} onChangeText={setEmail} mode="outlined" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
          <TextInput label="Address (optional)" value={address} onChangeText={setAddress} mode="outlined" style={styles.input} />
          <TextInput label="Facebook (username or URL)" value={facebook} onChangeText={setFacebook} mode="outlined" style={styles.input} autoCapitalize="none" />
          <TextInput label="Shopee Store URL (optional)" value={shopeeUrl} onChangeText={setShopeeUrl} mode="outlined" style={styles.input} autoCapitalize="none" placeholder="https://shopee.ph/yourstore" />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={closeModal} style={styles.btnHalf}>Cancel</Button>
            <Button mode="contained" onPress={handleSave} loading={saving} disabled={!name.trim() || saving} style={styles.btnHalf}>Add</Button>
          </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  search: { margin: 8, borderRadius: 12, elevation: 0, backgroundColor: Colors.background },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipLabel: { fontSize: 12, fontWeight: '600', color: Colors.text },
  filterChipLabelActive: { color: '#fff' },
  list: { paddingBottom: 90 },
  emptyContainer: { flex: 1 },
  item: { backgroundColor: Colors.surface, marginHorizontal: 12, marginVertical: 4, borderRadius: 8 },
  avatar: { backgroundColor: Colors.primary, marginLeft: 8, alignSelf: 'center' },
  avatarImage: { width: 40, height: 40, borderRadius: 20, marginLeft: 8, alignSelf: 'center', backgroundColor: Colors.border },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  messengerBtn: { padding: 2 },
  shopeeIcon: { padding: 2 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: Colors.primary },
  modal: { backgroundColor: Colors.surface, margin: 20, borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  input: { marginBottom: 8, backgroundColor: Colors.surface },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btnHalf: { flex: 1, borderRadius: 10 },
});
