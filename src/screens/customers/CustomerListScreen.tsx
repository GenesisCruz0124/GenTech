import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, Image, Keyboard, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { ActivityIndicator, Avatar, Banner, FAB, List, Portal, Modal, TextInput, Button, Text, Searchbar, Checkbox } from 'react-native-paper';
import { Customer } from '../../repositories/customerRepository';
import { formatCurrency } from '../../utils/formatters';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useCustomerStore } from '../../store/customerStore';
import { findDuplicateCustomers } from '../../repositories/customerRepository';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CustomerListScreen() {
  const navigation = useNavigation<Nav>();
  const { customers, isLoading, fetchCustomers, addCustomer } = useCustomerStore();
  const [search, setSearch] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const openContacts = async () => {
    setLoadingContacts(true);
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Allow access to contacts in Settings to use this feature.');
      setLoadingContacts(false);
      return;
    }
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    });
    const list = data
      .filter(c => c.name && c.phoneNumbers && c.phoneNumbers.length > 0)
      .map(c => ({
        id: c.id ?? c.name ?? '',
        name: c.name ?? '',
        phone: c.phoneNumbers![0].number?.replace(/\s/g, '') ?? '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setContactList(list);
    setSelectedContacts(new Set());
    setContactSearch('');
    setContactsVisible(true);
    setLoadingContacts(false);
  };

  const handleImport = async () => {
    setImporting(true);
    for (const c of contactList.filter(c => selectedContacts.has(c.id))) {
      await addCustomer({ name: c.name, phone: c.phone });
    }
    setImporting(false);
    setContactsVisible(false);
    fetchCustomers();
    Alert.alert('Imported', `${selectedContacts.size} contact${selectedContacts.size !== 1 ? 's' : ''} added.`);
  };

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const [filterMode, setFilterMode] = useState<'all' | 'unpaid' | 'active_repair'>('all');
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortMode, setSortMode] = useState<'alpha' | 'recent'>('alpha');
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
          <TouchableOpacity style={[hdrBtn, filterMode !== 'all' && hdrBtnActive]} onPress={() => setFilterVisible(v => !v)}>
            <MaterialCommunityIcons name="filter-variant" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[hdrBtn, sortMode === 'recent' && hdrBtnActive]} onPress={toggleSort}>
            <MaterialCommunityIcons name={sortMode === 'alpha' ? 'sort-alphabetical-ascending' : 'sort-clock-descending-outline'} size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={hdrBtn} onPress={openContacts} disabled={loadingContacts}>
            {loadingContacts
              ? <ActivityIndicator size={16} color="#fff" />
              : <MaterialCommunityIcons name="contacts-outline" size={20} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity style={hdrBtn} onPress={() => setSearchVisible(v => !v)}>
            <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, loadingContacts, filterMode, filterVisible, sortMode]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [facebook, setFacebook] = useState('');
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState<{ name: string; customers: Customer[] }[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);

  // Contacts import
  const [contactsVisible, setContactsVisible] = useState(false);
  const [contactList, setContactList] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  useFocusEffect(useCallback(() => {
    fetchCustomers();
    findDuplicateCustomers().then(d => setDuplicates(d));
  }, []));

  const filtered = customers
    .filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
      if (!matchSearch) return false;
      if (filterMode === 'unpaid') return (c.unpaid_amount ?? 0) > 0;
      if (filterMode === 'active_repair') return (c.active_repair_count ?? 0) > 0;
      return true;
    })
    .sort((a, b) => {
      if (sortMode === 'recent') {
        const ta = a.last_transaction_at ?? '';
        const tb = b.last_transaction_at ?? '';
        return tb.localeCompare(ta); // newest first
      }
      return a.name.localeCompare(b.name); // A→Z
    });

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await addCustomer({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, address: address.trim() || undefined, facebook: facebook.trim() || undefined });
    setSaving(false);
    setModalVisible(false);
    setName(''); setPhone(''); setEmail(''); setAddress(''); setFacebook('');
  };

  const closeModal = () => {
    setModalVisible(false);
    setName(''); setPhone(''); setEmail(''); setAddress(''); setFacebook('');
  };

  return (
    <View style={styles.container}>
      {duplicates.length > 0 && (
        <Banner
          visible
          icon="account-multiple-outline"
          actions={[
            { label: showDuplicates ? 'Hide' : 'View', onPress: () => setShowDuplicates(v => !v) },
          ]}
        >
          {`${duplicates.length} potential duplicate${duplicates.length > 1 ? 's' : ''} found`}
        </Banner>
      )}
      {showDuplicates && duplicates.length > 0 && (
        <View style={styles.duplicatesBox}>
          {duplicates.map((group, i) => (
            <View key={i} style={styles.duplicateGroup}>
              <Text style={styles.duplicateLabel}>{group.name}</Text>
              {group.customers.map(c => (
                <Text key={c.id} style={styles.duplicateItem}>
                  • {c.name} {c.phone ? `· ${c.phone}` : ''}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
      {searchVisible && <Searchbar placeholder="Search by name or phone..." value={search} onChangeText={setSearch} style={styles.search} autoFocus />}

      {filterVisible && (
        <View style={styles.filterRow}>
          {([
            { key: 'all',          label: 'All' },
            { key: 'unpaid',       label: 'Unpaid' },
            { key: 'active_repair', label: 'Active Repairs' },
          ] as const).map(f => {
            const active = filterMode === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilterMode(f.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipLabel, active && styles.filterChipLabelActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={c => String(c.id)}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={item.phone}
            left={() => (
              item.photo_uri
                ? <Image source={{ uri: item.photo_uri }} style={styles.avatarImage} />
                : <Avatar.Text size={40} label={item.name.charAt(0).toUpperCase()} style={styles.avatar} labelStyle={{ fontSize: 18 }} />
            )}
            right={() => (
              <View style={styles.itemRight}>
                {(item.unpaid_amount ?? 0) > 0 && (
                  <View style={styles.unpaidBadge}>
                    <Text style={styles.unpaidLabel}>Unpaid</Text>
                    <Text style={styles.unpaidAmount}>{formatCurrency(item.unpaid_amount!)}</Text>
                  </View>
                )}
                {item.facebook ? (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation?.();
                      const username = item.facebook!.replace(/^(https?:\/\/)?(www\.)?(facebook\.com|fb\.com|m\.me)\//i, '').replace(/\/$/, '');
                      Linking.openURL(`https://m.me/${username}`).catch(() =>
                        Linking.openURL(`https://www.facebook.com/${username}`)
                      );
                    }}
                    style={styles.messengerBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="facebook-messenger" size={22} color="#0084FF" />
                  </TouchableOpacity>
                ) : null}
                <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textSecondary} />
              </View>
            )}
            onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
            style={styles.item}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="account-group"
            title="No customers yet"
            subtitle="Tap + to add a customer, or they are created automatically when you log a repair"
          />
        }
        refreshing={isLoading}
        onRefresh={fetchCustomers}
        contentContainerStyle={filtered.length === 0 ? styles.empty : styles.list}
      />

      <FAB icon="plus" label="New Customer" style={styles.fab} color="#fff" onPress={() => setModalVisible(true)} />

      <Portal>
        <Modal visible={modalVisible} onDismiss={closeModal} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: kbHeight }}>
            <Text style={styles.modalTitle}>Add Customer</Text>
            <TextInput label="Name *" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
            <TextInput label="Phone" value={phone} onChangeText={setPhone} mode="outlined" style={styles.input} keyboardType="phone-pad" />
            <TextInput label="Email (optional)" value={email} onChangeText={setEmail} mode="outlined" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
            <TextInput label="Address (optional)" value={address} onChangeText={setAddress} mode="outlined" style={styles.input} />
            <TextInput label="Facebook (username or URL)" value={facebook} onChangeText={setFacebook} mode="outlined" style={styles.input} autoCapitalize="none" />
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={closeModal} style={styles.btnHalf}>Cancel</Button>
              <Button mode="contained" onPress={handleAdd} loading={saving} disabled={!name.trim() || saving} style={styles.btnHalf}>Add</Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Contacts import modal */}
      <Portal>
        <Modal visible={contactsVisible} onDismiss={() => setContactsVisible(false)} contentContainerStyle={styles.contactsModal}>
          <View style={styles.contactsHeader}>
            <Text style={styles.modalTitle}>Import from Contacts</Text>
            <Text style={styles.contactsCount}>{selectedContacts.size} selected</Text>
          </View>
          <Searchbar placeholder="Search contacts..." value={contactSearch} onChangeText={setContactSearch} style={styles.contactsSearch} />
          <FlatList
            data={contactList.filter(c =>
              c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
              c.phone.includes(contactSearch)
            )}
            keyExtractor={c => c.id}
            style={styles.contactsList}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.contactRow} onPress={() => toggleContact(item.id)} activeOpacity={0.7}>
                <Checkbox status={selectedContacts.has(item.id) ? 'checked' : 'unchecked'} onPress={() => toggleContact(item.id)} color={Colors.primary} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone}>{item.phone}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: Colors.textSecondary, padding: 20 }}>No contacts found</Text>}
          />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setContactsVisible(false)} style={styles.btnHalf}>Cancel</Button>
            <Button mode="contained" onPress={handleImport} loading={importing}
              disabled={selectedContacts.size === 0 || importing} style={styles.btnHalf}>
              Import {selectedContacts.size > 0 ? `(${selectedContacts.size})` : ''}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const hdrBtn: any = { padding: 5, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', marginRight: 12 };
const hdrBtnActive: any = { backgroundColor: 'rgba(255,255,255,0.4)' };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  search: { margin: 12, marginTop: 8, borderRadius: 8 },
  duplicatesBox: { backgroundColor: Colors.warning + '18', margin: 12, marginTop: 0, borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: Colors.warning },
  duplicateGroup: { marginBottom: 8 },
  duplicateLabel: { fontSize: 12, fontWeight: '700', color: Colors.warning, marginBottom: 4 },
  duplicateItem: { fontSize: 13, color: Colors.text, marginLeft: 8 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  filterChipActive: { backgroundColor: Colors.warning, borderColor: Colors.warning },
  filterChipLabel: { fontSize: 12, fontWeight: '600', color: Colors.text },
  filterChipLabelActive: { color: '#fff' },
  item: { backgroundColor: Colors.surface, marginHorizontal: 12, marginVertical: 4, borderRadius: 8 },
  avatar: { backgroundColor: Colors.primary, marginLeft: 8, alignSelf: 'center' },
  avatarImage: { width: 40, height: 40, borderRadius: 20, marginLeft: 8, alignSelf: 'center', backgroundColor: Colors.border },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  messengerBtn: { padding: 2 },
  unpaidBadge: { backgroundColor: Colors.warning + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.warning + '40', alignItems: 'flex-end' },
  unpaidLabel: { fontSize: 9, fontWeight: '700', color: Colors.warning, textTransform: 'uppercase', letterSpacing: 0.4 },
  unpaidAmount: { fontSize: 13, fontWeight: '800', color: Colors.warning },
  list: { paddingBottom: 80 },
  empty: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: Colors.primary },
  modal: { backgroundColor: Colors.surface, margin: 20, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  input: { marginBottom: 8, backgroundColor: Colors.surface },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnHalf: { flex: 1, borderRadius: 8 },
  contactsModal: { backgroundColor: Colors.surface, margin: 16, borderRadius: 14, padding: 16, maxHeight: '85%' },
  contactsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  contactsCount: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  contactsSearch: { borderRadius: 8, marginBottom: 8, elevation: 0 },
  contactsList: { maxHeight: 400 },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  contactName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  contactPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
});
