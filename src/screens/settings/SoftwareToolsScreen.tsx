import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { FAB, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  SoftwareTool,
  listSoftwareTools,
  addSoftwareTool,
  updateSoftwareTool,
  deleteSoftwareTool,
} from '../../repositories/softwareToolsRepository';
import { Colors } from '../../constants/colors';

export default function SoftwareToolsScreen() {
  const [tools, setTools] = useState<SoftwareTool[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await listSoftwareTools();
    setTools(data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => {
    setEditId(null);
    setNameInput('');
    setModalVisible(true);
  };

  const openEdit = (tool: SoftwareTool) => {
    setEditId(tool.id);
    setNameInput(tool.name);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      if (editId) {
        await updateSoftwareTool(editId, trimmed);
      } else {
        await addSoftwareTool(trimmed);
      }
      setModalVisible(false);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save tool.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (tool: SoftwareTool) => {
    Alert.alert(
      'Delete Tool',
      `Delete "${tool.name}"? It will be removed from all repairs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteSoftwareTool(tool.id);
            await load();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tools}
        keyExtractor={t => String(t.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="laptop" size={40} color={Colors.border} />
            <Text style={styles.emptyText}>No software tools yet.{'\n'}Tap + to add one.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <MaterialCommunityIcons name="laptop" size={18} color={Colors.primary} style={{ marginTop: 1 }} />
            <Text style={styles.rowName}>{item.name}</Text>
            <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
              <MaterialCommunityIcons name="pencil-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <FAB icon="plus" style={styles.fab} onPress={openAdd} color="#fff" />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>{editId ? 'Edit Tool' : 'Add Software Tool'}</Text>
          <TextInput
            label="Tool name (e.g. Sigma Plus, NCK Pro)"
            value={nameInput}
            onChangeText={setNameInput}
            mode="outlined"
            autoFocus
            style={styles.input}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={{ color: Colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, (!nameInput.trim() || saving) && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={!nameInput.trim() || saving}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  list: { padding: 14, paddingBottom: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    elevation: 1,
  },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  iconBtn: { padding: 4 },
  separator: { height: 8 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', fontSize: 14, lineHeight: 22 },
  fab: { position: 'absolute', bottom: 24, right: 20, backgroundColor: Colors.primary },
  modal: {
    backgroundColor: Colors.surface, margin: 20, borderRadius: 16, padding: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 14 },
  input: { marginBottom: 16, backgroundColor: Colors.surface },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
});
