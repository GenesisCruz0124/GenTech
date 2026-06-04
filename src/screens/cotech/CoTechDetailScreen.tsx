import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Keyboard, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Divider, IconButton, Portal, Modal, TextInput, Button, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { RootStackParamList } from '../../navigation/types';
import { CoTech, getCoTechById, updateCoTech, deleteCoTech } from '../../repositories/coTechRepository';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'CoTechDetail'>;

export default function CoTechDetailScreen({ route, navigation }: Props) {
  const { coTechId } = route.params;
  const [coTech, setCoTech] = useState<CoTech | null>(null);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editFacebook, setEditFacebook] = useState('');
  const [saving, setSaving] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const load = useCallback(async () => {
    setCoTech(await getCoTechById(coTechId));
  }, [coTechId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Photo ─────────────────────────────────────────────────────
  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const tempUri = result.assets[0].uri;
    const destDir = (FileSystem.documentDirectory ?? '') + 'cotech_photos/';
    const dirInfo = await FileSystem.getInfoAsync(destDir);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
    const dest = destDir + `cotech_${coTechId}_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: tempUri, to: dest });
    if (coTech?.photo_uri?.startsWith(FileSystem.documentDirectory ?? '')) {
      try { await FileSystem.deleteAsync(coTech.photo_uri, { idempotent: true }); } catch {}
    }
    await updateCoTech(coTechId, { ...coTech!, photo_uri: dest });
    load();
  };

  const handlePickPhoto = () => {
    if (coTech?.photo_uri) {
      Alert.alert('Profile Photo', 'What would you like to do?', [
        { text: 'Change Photo', onPress: pickPhoto },
        {
          text: 'Remove Photo', style: 'destructive', onPress: async () => {
            if (coTech.photo_uri?.startsWith(FileSystem.documentDirectory ?? '')) {
              try { await FileSystem.deleteAsync(coTech.photo_uri, { idempotent: true }); } catch {}
            }
            await updateCoTech(coTechId, { ...coTech, photo_uri: null });
            load();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      pickPhoto();
    }
  };

  // ── Header ────────────────────────────────────────────────────
  useEffect(() => {
    if (coTech) {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ flexDirection: 'row' }}>
            {coTech.facebook ? (
              <IconButton icon="facebook-messenger" iconColor="#fff"
                onPress={() => {
                  const u = coTech.facebook!.replace(/^(https?:\/\/)?(www\.)?(facebook\.com|fb\.com|m\.me)\//i, '').replace(/\/$/, '');
                  Linking.openURL(`https://m.me/${u}`).catch(() => Linking.openURL(`https://www.facebook.com/${u}`));
                }} />
            ) : null}
            <IconButton icon="pencil-outline" iconColor="#fff" onPress={openEdit} />
            <IconButton icon="delete-outline" iconColor="#fff" onPress={() => setDeleteVisible(true)} />
          </View>
        ),
      });
    }
  }, [coTech]);

  if (!coTech) return null;

  const openEdit = () => {
    setEditName(coTech.name);
    setEditPhone(coTech.phone ?? '');
    setEditEmail(coTech.email ?? '');
    setEditAddress(coTech.address ?? '');
    setEditFacebook(coTech.facebook ?? '');
    setEditVisible(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateCoTech(coTechId, {
      name: editName.trim(),
      phone: editPhone.trim() || undefined,
      email: editEmail.trim() || undefined,
      address: editAddress.trim() || undefined,
      facebook: editFacebook.trim() || undefined,
    });
    setSaving(false);
    setEditVisible(false);
    load();
  };

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
                {coTech.photo_uri ? (
                  <Image source={{ uri: coTech.photo_uri }} style={styles.avatarImage} />
                ) : (
                  <Avatar.Text size={64} label={coTech.name.charAt(0).toUpperCase()}
                    style={styles.avatar}
                    labelStyle={{ fontSize: 26, fontWeight: '800', color: '#fff' }} />
                )}
                <View style={styles.avatarEditBadge}>
                  <MaterialCommunityIcons name="camera" size={12} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={styles.headerInfo}>
                <Text style={styles.name}>{coTech.name}</Text>
                {coTech.phone ? <Text style={styles.meta}>{coTech.phone}</Text> : null}
                {coTech.email ? <Text style={styles.meta}>{coTech.email}</Text> : null}
                {coTech.address ? <Text style={styles.meta}>{coTech.address}</Text> : null}
                {coTech.facebook ? <Text style={styles.meta}>Facebook: {coTech.facebook}</Text> : null}
              </View>
            </View>

            <Divider style={styles.divider} />
          </>
        }
      />

      <Portal>
        <Modal visible={editVisible} onDismiss={() => setEditVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: kbHeight }}>
            <Text style={styles.modalTitle}>Edit Co-Tech</Text>
            <TextInput label="Name *" value={editName} onChangeText={setEditName} mode="outlined" style={styles.input} />
            <TextInput label="Phone" value={editPhone} onChangeText={setEditPhone} mode="outlined" style={styles.input} keyboardType="phone-pad" />
            <TextInput label="Email (optional)" value={editEmail} onChangeText={setEditEmail} mode="outlined" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
            <TextInput label="Address (optional)" value={editAddress} onChangeText={setEditAddress} mode="outlined" style={styles.input} />
            <TextInput label="Facebook (username or URL)" value={editFacebook} onChangeText={setEditFacebook} mode="outlined" style={styles.input} autoCapitalize="none" />
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setEditVisible(false)} style={styles.btnHalf}>Cancel</Button>
              <Button mode="contained" onPress={handleSave} loading={saving} disabled={!editName.trim() || saving} style={styles.btnHalf}>Save</Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete Co-Tech"
        message={`Delete "${coTech.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { await deleteCoTech(coTechId); navigation.goBack(); }}
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
  divider: { marginBottom: 12 },
  modal: { backgroundColor: Colors.surface, margin: 20, borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  input: { marginBottom: 8, backgroundColor: Colors.surface },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btnHalf: { flex: 1, borderRadius: 10 },
});
