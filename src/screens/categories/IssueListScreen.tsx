import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Divider, IconButton, List, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

const hdrBtn: any = { padding: 5, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', marginRight: 12 };

function getIssueIcon(name: string): string {
  const n = name.toLowerCase();
  // Hardware replacements
  if (n.includes('screen') || n.includes('lcd') || n.includes('display') || n.includes('oled')) return 'cellphone-screenshot';
  if (n.includes('battery') || n.includes('drain')) return 'battery-charging-outline';
  if (n.includes('camera')) return 'camera-outline';
  if (n.includes('charging') || n.includes('charger') || n.includes('usb port')) return 'power-plug-outline';
  if (n.includes('speaker') || n.includes('ear speaker') || n.includes('audio')) return 'speaker-wireless';
  if (n.includes('microphone') || n.includes('mic')) return 'microphone-outline';
  if (n.includes('volume button') || n.includes('power button') || n.includes('home button') || n.includes('button replace')) return 'gesture-tap-button';
  if (n.includes('back cover') || n.includes('housing') || n.includes('casing')) return 'cellphone';
  if (n.includes('sim card') || n.includes('sim tray')) return 'sim-outline';
  if (n.includes('headphone') || n.includes('jack')) return 'headphones';
  if (n.includes('vibrat')) return 'vibrate';
  if (n.includes('flashlight') || n.includes('torch')) return 'flashlight-outline';
  if (n.includes('proximity') || n.includes('sensor')) return 'motion-sensor';
  if (n.includes('fingerprint') || n.includes('face id')) return 'fingerprint';
  if (n.includes('motherboard')) return 'integrated-circuit-chip';
  if (n.includes('water damage')) return 'water-outline';
  if (n.includes('usb') || n.includes('port repair')) return 'usb-port';
  if (n.includes('rear camera glass')) return 'camera-rear-outline';
  // Software issues
  if (n.includes('boot loop') || n.includes('stuck on logo')) return 'restart';
  if (n.includes('not turning on') || n.includes('black screen')) return 'power-off';
  if (n.includes('auto restart') || n.includes('random reboot')) return 'restart-alert';
  if (n.includes('slow') || n.includes('lag') || n.includes('performance')) return 'speedometer-slow';
  if (n.includes('app crash') || n.includes('not opening')) return 'application-cog-outline';
  if (n.includes('ghost touch') || n.includes('phantom touch') || n.includes('touch screen')) return 'gesture-tap';
  if (n.includes('screen flicker')) return 'television-shimmer';
  if (n.includes('no sound') || n.includes('audio problem')) return 'volume-off';
  if (n.includes('mobile data') || n.includes('network') || n.includes('signal')) return 'signal-cellular-outline';
  if (n.includes('hotspot')) return 'wifi-plus';
  if (n.includes('gps') || n.includes('location')) return 'map-marker-outline';
  if (n.includes('frp') || n.includes('google account lock')) return 'google';
  if (n.includes('pattern') || n.includes('pin lock') || n.includes('lock removal')) return 'lock-open-outline';
  if (n.includes('icloud') || n.includes('activation lock')) return 'apple';
  if (n.includes('imei') || n.includes('baseband')) return 'cellphone-lock';
  if (n.includes('virus') || n.includes('malware')) return 'shield-bug-outline';
  if (n.includes('os update') || n.includes('downgrade') || n.includes('flash')) return 'cellphone-arrow-down';
  if (n.includes('factory reset') || n.includes('hard reset')) return 'restore';
  if (n.includes('data transfer') || n.includes('migration')) return 'transfer';
  if (n.includes('backup') || n.includes('restore data')) return 'backup-restore';
  if (n.includes('storage') || n.includes('cleanup') || n.includes('cache')) return 'harddisk';
  if (n.includes('account recovery')) return 'account-key-outline';
  if (n.includes('network settings')) return 'network-settings';
  if (n.includes('wifi') || n.includes('bluetooth')) return 'wifi';
  if (n.includes('overheating') || n.includes('overheat')) return 'thermometer-alert';
  if (n.includes('data recovery')) return 'database-refresh-outline';
  if (n.includes('not repaired') || n.includes('cannot repair')) return 'close-circle-outline';
  if (n.includes('other')) return 'dots-horizontal-circle-outline';
  // Fallback
  return 'wrench-outline';
}
import { Issue, getAllIssues, createIssue, updateIssue, deleteIssue } from '../../repositories/issueRepository';
import { Searchbar } from 'react-native-paper';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';

export default function IssueListScreen() {
  const navigation = useNavigation<any>();
  const [issues, setIssues] = useState<Issue[]>([]);
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
  const [editTarget, setEditTarget] = useState<Issue | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setIssues(await getAllIssues());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => { setEditTarget(null); setNameInput(''); setModalVisible(true); };
  const openEdit = (i: Issue) => { setEditTarget(i); setNameInput(i.name); setModalVisible(true); };

  const handleSave = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    if (editTarget) {
      await updateIssue(editTarget.id, nameInput);
    } else {
      await createIssue(nameInput);
    }
    setSaving(false);
    setModalVisible(false);
    load();
  };

  const handleDelete = (issue: Issue) => {
    Alert.alert('Delete Issue', `Delete "${issue.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteIssue(issue.id); load(); } },
    ]);
  };

  const filtered = issues.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      {searchVisible && <Searchbar placeholder="Search issues..." value={search} onChangeText={setSearch} style={styles.search} autoFocus />}
      <FlatList
        data={filtered}
        keyExtractor={i => String(i.id)}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            left={props => <List.Icon {...props} icon={getIssueIcon(item.name)} color={Colors.primary} />}
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
        ListEmptyComponent={<EmptyState icon="wrench-outline" title="No issues yet" subtitle="Tap Add to create one" />}
        contentContainerStyle={issues.length === 0 ? styles.empty : undefined}
      />

      <View style={styles.addRow}>
        <Button mode="contained" icon="plus" onPress={openAdd} style={styles.addBtn}>
          Add Issue
        </Button>
      </View>

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>{editTarget ? 'Edit Issue' : 'New Issue'}</Text>
          <TextInput
            label="Issue Name *"
            value={nameInput}
            onChangeText={setNameInput}
            mode="outlined"
            style={styles.input}
            autoFocus
            placeholder="e.g. Screen Replace"
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
