import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Button, Divider, IconButton, List, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  DeviceBrand,
  getAllDeviceBrands,
  createDeviceBrand,
  updateDeviceBrand,
  deleteDeviceBrand,
} from '../../repositories/deviceBrandRepository';
import { Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';

const hdrBtn: any = { padding: 5, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', marginRight: 12 };

const BRAND_COLORS: Record<string, string> = {
  apple: '#1C1C1E', samsung: '#1428A0', xiaomi: '#FF6900', oppo: '#1F8C5B',
  vivo: '#415FFF', realme: '#FFD700', huawei: '#CF0A2C', honor: '#C8102E',
  oneplus: '#EB0029', 'one plus': '#EB0029', motorola: '#5C2D91', nokia: '#124191',
  sony: '#003087', google: '#4285F4', nothing: '#1C1C1E', tecno: '#FF3333',
  infinix: '#00B1CC', itel: '#0071C2', lg: '#C40028', asus: '#2E9B0B',
  lenovo: '#E2231A', htc: '#69BE28', blackberry: '#000000', meizu: '#F3652B',
  wiko: '#E41E2B', alcatel: '#005EB8', zte: '#D4A800', tcl: '#D8000C',
};

function BrandLogo({ name }: { name: string }) {
  const color = BRAND_COLORS[name.toLowerCase()] ?? Colors.primary;
  return (
    <Avatar.Text
      size={38}
      label={name.charAt(0).toUpperCase()}
      style={{ backgroundColor: color, marginLeft: 8, alignSelf: 'center' }}
      labelStyle={{ fontSize: 16, fontWeight: '800', color: '#fff' }}
    />
  );
}

export default function DeviceBrandScreen() {
  const navigation = useNavigation<any>();
  const [brands, setBrands] = useState<DeviceBrand[]>([]);
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
  const [editTarget, setEditTarget] = useState<DeviceBrand | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setBrands(await getAllDeviceBrands());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => { setEditTarget(null); setNameInput(''); setModalVisible(true); };
  const openEdit = (b: DeviceBrand) => { setEditTarget(b); setNameInput(b.name); setModalVisible(true); };

  const handleSave = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    if (editTarget) {
      await updateDeviceBrand(editTarget.id, nameInput);
    } else {
      await createDeviceBrand(nameInput);
    }
    setSaving(false);
    setModalVisible(false);
    load();
  };

  const handleDelete = (b: DeviceBrand) => {
    Alert.alert('Delete Brand', `Delete "${b.name}"? Parts using this brand will be unlinked.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDeviceBrand(b.id); load(); } },
    ]);
  };

  const filtered = brands.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      {searchVisible && <Searchbar placeholder="Search brands..." value={search} onChangeText={setSearch} style={styles.search} autoFocus />}
      <FlatList
        data={filtered}
        keyExtractor={b => String(b.id)}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={() => {
              const count = item.model_count ?? 0;
              if (count === 0) return <Text style={styles.modelDesc}>No models linked</Text>;
              const names = (item.model_names ?? '').split(', ');
              const preview = names.slice(0, 3).join(', ');
              const extra = names.length > 3 ? ` +${names.length - 3} more` : '';
              return (
                <Text style={styles.modelDesc} numberOfLines={1}>
                  {count} model{count !== 1 ? 's' : ''}  ·  {preview}{extra}
                </Text>
              );
            }}
            left={() => <BrandLogo name={item.name} />}
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
        ListEmptyComponent={<EmptyState icon="cellphone" title="No brands yet" subtitle="Tap Add to create one" />}
        contentContainerStyle={brands.length === 0 ? styles.empty : undefined}
      />

      <View style={styles.addRow}>
        <Button mode="contained" icon="plus" onPress={openAdd} style={styles.addBtn}>
          Add Brand
        </Button>
      </View>

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>{editTarget ? 'Edit Brand' : 'New Device Brand'}</Text>
          <TextInput
            label="Brand Name *"
            value={nameInput}
            onChangeText={setNameInput}
            mode="outlined"
            style={styles.input}
            autoFocus
            placeholder="e.g. Apple, Samsung, Vivo"
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
  search: { margin: 12, borderRadius: 10 },
  empty: { flex: 1 },
  item: { backgroundColor: Colors.surface },
  actions: { flexDirection: 'row', alignItems: 'center' },
  modelDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  empty: { flex: 1 },
  addRow: { padding: 16 },
  addBtn: { borderRadius: 8 },
  modal: { backgroundColor: Colors.surface, margin: 24, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  input: { marginBottom: 12, backgroundColor: Colors.surface },
  modalActions: { flexDirection: 'row', gap: 8 },
  btnHalf: { flex: 1, borderRadius: 8 },
});
