import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Avatar, FAB, List, Portal, Modal, TextInput, Button, Text, Searchbar } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useCustomerStore } from '../../store/customerStore';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CustomerListScreen() {
  const navigation = useNavigation<Nav>();
  const { customers, isLoading, fetchCustomers, addCustomer } = useCustomerStore();
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { fetchCustomers(); }, []));

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    await addCustomer({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, address: address.trim() || undefined });
    setSaving(false);
    setModalVisible(false);
    setName(''); setPhone(''); setEmail(''); setAddress('');
  };

  const closeModal = () => {
    setModalVisible(false);
    setName(''); setPhone(''); setEmail(''); setAddress('');
  };

  return (
    <View style={styles.container}>
      <Searchbar placeholder="Search by name or phone..." value={search} onChangeText={setSearch} style={styles.search} />
      <FlatList
        data={filtered}
        keyExtractor={c => String(c.id)}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={item.phone + (item.email ? ` · ${item.email}` : '')}
            left={() => (
              <Avatar.Text size={40} label={item.name.charAt(0).toUpperCase()} style={styles.avatar} labelStyle={{ fontSize: 18 }} />
            )}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
            style={styles.item}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="account-group"
            title="No customers yet"
            subtitle="Tap + to add a customer, or they are created automatically when you log a repair or device sale"
          />
        }
        refreshing={isLoading}
        onRefresh={fetchCustomers}
        contentContainerStyle={filtered.length === 0 ? styles.empty : styles.list}
      />

      <FAB icon="plus" style={styles.fab} color="#fff" onPress={() => setModalVisible(true)} />

      <Portal>
        <Modal visible={modalVisible} onDismiss={closeModal} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Add Customer</Text>
          <TextInput label="Name *" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
          <TextInput label="Phone *" value={phone} onChangeText={setPhone} mode="outlined" style={styles.input} keyboardType="phone-pad" />
          <TextInput label="Email (optional)" value={email} onChangeText={setEmail} mode="outlined" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
          <TextInput label="Address (optional)" value={address} onChangeText={setAddress} mode="outlined" style={styles.input} />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={closeModal} style={styles.btnHalf}>Cancel</Button>
            <Button mode="contained" onPress={handleAdd} loading={saving} disabled={!name.trim() || !phone.trim() || saving} style={styles.btnHalf}>Add</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  search: { margin: 12, borderRadius: 8 },
  item: { backgroundColor: Colors.surface, marginHorizontal: 12, marginVertical: 4, borderRadius: 8 },
  avatar: { backgroundColor: Colors.primary, marginLeft: 8, alignSelf: 'center' },
  list: { paddingBottom: 80 },
  empty: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: Colors.primary },
  modal: { backgroundColor: Colors.surface, margin: 20, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  input: { marginBottom: 8, backgroundColor: Colors.surface },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnHalf: { flex: 1, borderRadius: 8 },
});
