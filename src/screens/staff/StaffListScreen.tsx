import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { Avatar, FAB, IconButton, List, Portal, Modal, TextInput, Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useStaffStore } from '../../store/staffStore';
import { Staff } from '../../repositories/staffRepository';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';

export default function StaffListScreen() {
  const { staff, isLoading, fetchStaff, addStaff, editStaff, removeStaff } = useStaffStore();

  // Add modal
  const [addVisible, setAddVisible] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editVisible, setEditVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useFocusEffect(useCallback(() => { fetchStaff(); }, []));

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await addStaff({ name: name.trim(), role: role.trim() || undefined, phone: phone.trim() || undefined });
    setSaving(false);
    setAddVisible(false);
    setName(''); setRole(''); setPhone('');
  };

  const openEdit = (s: Staff) => {
    setEditTarget(s);
    setEditName(s.name);
    setEditRole(s.role ?? '');
    setEditPhone(s.phone ?? '');
    setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !editName.trim()) return;
    setSaving(true);
    await editStaff(editTarget.id, {
      name: editName.trim(),
      role: editRole.trim() || undefined,
      phone: editPhone.trim() || undefined,
    });
    setSaving(false);
    setEditVisible(false);
    setEditTarget(null);
  };

  const handleRemove = (id: number, staffName: string) => {
    Alert.alert('Remove Staff', `Remove ${staffName} from active staff?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeStaff(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={staff}
        keyExtractor={s => String(s.id)}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={[item.role, item.phone].filter(Boolean).join(' · ') || 'No role set'}
            left={() => (
              <Avatar.Text size={40} label={item.name.charAt(0)} style={styles.avatar} labelStyle={{ fontSize: 18 }} />
            )}
            right={() => (
              <View style={styles.actions}>
                <IconButton icon="pencil-outline" iconColor={Colors.primary} onPress={() => openEdit(item)} />
                <IconButton icon="account-remove" iconColor={Colors.error} onPress={() => handleRemove(item.id, item.name)} />
              </View>
            )}
            style={styles.item}
          />
        )}
        ListEmptyComponent={<EmptyState icon="account-hard-hat" title="No staff yet" subtitle="Tap + to add a staff member" />}
        refreshing={isLoading}
        onRefresh={fetchStaff}
        contentContainerStyle={staff.length === 0 ? styles.empty : styles.list}
      />

      <FAB icon="plus" style={styles.fab} color="#fff" onPress={() => setAddVisible(true)} />

      {/* Add Modal */}
      <Portal>
        <Modal visible={addVisible} onDismiss={() => setAddVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Add Staff Member</Text>
          <TextInput label="Name *" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
          <TextInput label="Role (optional)" value={role} onChangeText={setRole} mode="outlined" style={styles.input} placeholder="e.g. Technician" />
          <TextInput label="Phone (optional)" value={phone} onChangeText={setPhone} mode="outlined" style={styles.input} keyboardType="phone-pad" />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setAddVisible(false)} style={styles.btnHalf}>Cancel</Button>
            <Button mode="contained" onPress={handleAdd} loading={saving} disabled={!name.trim() || saving} style={styles.btnHalf}>Add</Button>
          </View>
        </Modal>
      </Portal>

      {/* Edit Modal */}
      <Portal>
        <Modal visible={editVisible} onDismiss={() => setEditVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Edit Staff Member</Text>
          <TextInput label="Name *" value={editName} onChangeText={setEditName} mode="outlined" style={styles.input} />
          <TextInput label="Role (optional)" value={editRole} onChangeText={setEditRole} mode="outlined" style={styles.input} placeholder="e.g. Technician" />
          <TextInput label="Phone (optional)" value={editPhone} onChangeText={setEditPhone} mode="outlined" style={styles.input} keyboardType="phone-pad" />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setEditVisible(false)} style={styles.btnHalf}>Cancel</Button>
            <Button mode="contained" onPress={handleSaveEdit} loading={saving} disabled={!editName.trim() || saving} style={styles.btnHalf}>Save</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  item: { backgroundColor: Colors.surface, marginHorizontal: 12, marginVertical: 4, borderRadius: 8 },
  avatar: { backgroundColor: Colors.secondary, marginLeft: 8, alignSelf: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  list: { paddingBottom: 80 },
  empty: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: Colors.primary },
  modal: { backgroundColor: Colors.surface, margin: 24, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  input: { marginBottom: 8, backgroundColor: Colors.surface },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btnHalf: { flex: 1, borderRadius: 8 },
});
