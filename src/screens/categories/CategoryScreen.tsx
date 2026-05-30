import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { Button, Divider, IconButton, List, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import {
  Category,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../repositories/categoryRepository';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';

export default function CategoryScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setCategories(await getAllCategories());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => {
    setEditTarget(null);
    setNameInput('');
    setModalVisible(true);
  };

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setNameInput(cat.name);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    if (editTarget) {
      await updateCategory(editTarget.id, nameInput);
    } else {
      await createCategory(nameInput);
    }
    setSaving(false);
    setModalVisible(false);
    load();
  };

  const handleDelete = (cat: Category) => {
    Alert.alert(
      'Delete Category',
      `Delete "${cat.name}"? Parts using this category will be unlinked.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCategory(cat.id); load(); } },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={c => String(c.id)}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            left={props => <List.Icon {...props} icon="tag-outline" color={Colors.primary} />}
            right={() => (
              <View style={styles.actions}>
                <IconButton icon="pencil-outline" iconColor={Colors.primary} onPress={() => openEdit(item)} />
                <IconButton icon="delete-outline" iconColor={Colors.error} onPress={() => handleDelete(item)} />
              </View>
            )}
            style={styles.item}
          />
        )}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={<EmptyState icon="tag-multiple-outline" title="No categories yet" subtitle="Tap Add to create one" />}
        contentContainerStyle={categories.length === 0 ? styles.empty : undefined}
      />

      <View style={styles.addRow}>
        <Button mode="contained" icon="plus" onPress={openAdd} style={styles.addBtn}>
          Add Category
        </Button>
      </View>

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>{editTarget ? 'Edit Category' : 'New Category'}</Text>
          <TextInput
            label="Category Name *"
            value={nameInput}
            onChangeText={setNameInput}
            mode="outlined"
            style={styles.input}
            autoFocus
          />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setModalVisible(false)} style={styles.btnHalf}>Cancel</Button>
            <Button mode="contained" onPress={handleSave} loading={saving} disabled={!nameInput.trim() || saving} style={styles.btnHalf}>
              {editTarget ? 'Save' : 'Add'}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  item: { backgroundColor: Colors.surface },
  actions: { flexDirection: 'row', alignItems: 'center' },
  empty: { flex: 1 },
  addRow: { padding: 16 },
  addBtn: { borderRadius: 8 },
  modal: { backgroundColor: Colors.surface, margin: 24, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  input: { marginBottom: 12, backgroundColor: Colors.surface },
  modalActions: { flexDirection: 'row', gap: 8 },
  btnHalf: { flex: 1, borderRadius: 8 },
});
