import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Divider, IconButton, List, Modal, Portal, Searchbar, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
  const navigation = useNavigation<any>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity style={hdrBtn} onPress={() => setSearchVisible(v => !v)}>
          <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);
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

  const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      {searchVisible && <Searchbar placeholder="Search categories..." value={search} onChangeText={setSearch} style={styles.search} autoFocus />}
      <FlatList
        data={filtered}
        keyExtractor={c => String(c.id)}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            left={props => <List.Icon {...props} icon={getCategoryIcon(item.name)} color={Colors.primary} />}
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

const hdrBtn: any = { padding: 5, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', marginRight: 12 };

function getCategoryIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('display') || n.includes('screen') || n.includes('lcd') || n.includes('oled')) return 'cellphone-screenshot';
  if (n.includes('battery')) return 'battery-charging-outline';
  if (n.includes('camera') || n.includes('cam')) return 'camera-outline';
  if (n.includes('charging') || n.includes('charger') || n.includes('usb') || n.includes('port')) return 'power-plug-outline';
  if (n.includes('speaker') || n.includes('audio') || n.includes('ear')) return 'speaker-wireless';
  if (n.includes('button') || n.includes('power btn') || n.includes('volume')) return 'gesture-tap-button';
  if (n.includes('back') || n.includes('housing') || n.includes('cover') || n.includes('casing')) return 'cellphone';
  if (n.includes('microphone') || n.includes('mic')) return 'microphone-outline';
  if (n.includes('sim') || n.includes('tray')) return 'sim-outline';
  if (n.includes('wifi') || n.includes('bluetooth') || n.includes('signal') || n.includes('network')) return 'wifi';
  if (n.includes('motherboard') || n.includes('board') || n.includes('pcb')) return 'integrated-circuit-chip';
  if (n.includes('fingerprint') || n.includes('biometric')) return 'fingerprint';
  if (n.includes('face') || n.includes('face id')) return 'face-recognition';
  if (n.includes('vibrat')) return 'vibrate';
  if (n.includes('proximity') || n.includes('sensor')) return 'motion-sensor';
  if (n.includes('headphone') || n.includes('jack') || n.includes('earphone')) return 'headphones';
  if (n.includes('flashlight') || n.includes('flash') || n.includes('torch')) return 'flashlight-outline';
  if (n.includes('gps') || n.includes('location')) return 'map-marker-outline';
  if (n.includes('software') || n.includes('os') || n.includes('system')) return 'cog-outline';
  if (n.includes('water') || n.includes('liquid')) return 'water-outline';
  if (n.includes('data') || n.includes('recovery')) return 'database-outline';
  return 'tag-outline';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  search: { margin: 12, borderRadius: 10 },
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
