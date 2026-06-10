import React, { useCallback, useState } from 'react';
import { Alert, BackHandler, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Checkbox, Divider, IconButton, List, Modal, Portal, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import JSZip from 'jszip';
import {
  backupDatabase,
  backupSelected,
  listBackups,
  shareBackup,
  deleteBackup,
} from '../../services/backupService';
import { useLicense } from '../../hooks/useLicense';
import { resetDB, getDB } from '../../db/database';
import { Colors } from '../../constants/colors';

// ── Restore category definitions ──────────────────────────────
type RestoreKey = 'customers' | 'repairs' | 'stocks' | 'suppliers' | 'cotechs' | 'catalog' | 'settings' | 'photos';

const RESTORE_CATEGORIES: { key: RestoreKey; label: string; icon: string; tables: string[]; photoDirs?: string[] }[] = [
  { key: 'customers',  label: 'Customers',               icon: 'account-group-outline',   tables: ['customers'],                                                              photoDirs: ['customer_photos'] },
  { key: 'repairs',    label: 'Repairs & Payments',       icon: 'wrench-outline',           tables: ['repairs','repair_notes','repair_payments','repair_parts','repair_images','invoices'], photoDirs: ['repair_images','payment_proofs'] },
  { key: 'stocks',     label: 'Stocks & Parts',           icon: 'package-variant',          tables: ['parts','parts_purchases'] },
  { key: 'suppliers',  label: 'Suppliers',                icon: 'truck-delivery-outline',   tables: ['suppliers'],                                                              photoDirs: ['supplier_photos'] },
  { key: 'cotechs',    label: 'Co-Techs',                 icon: 'account-hard-hat-outline', tables: ['co_techs'],                                                               photoDirs: ['cotech_photos'] },
  { key: 'catalog',    label: 'Brands, Models & Issues',  icon: 'tag-multiple-outline',     tables: ['device_brands','device_models','categories','issues'] },
  { key: 'settings',   label: 'Settings & Shop Info',     icon: 'cog-outline',              tables: ['settings'] },
];

// ── Selective restore from backup DB ──────────────────────────
async function restoreSelective(
  dbContent: string,
  zip: JSZip,
  selected: Set<RestoreKey>
): Promise<void> {
  // Write backup DB to temp SQLite location
  const tempName = 'gentech_backup_temp.db';
  const tempPath = (FileSystem.documentDirectory ?? '') + 'SQLite/' + tempName;
  await FileSystem.writeAsStringAsync(tempPath, dbContent, { encoding: FileSystem.EncodingType.Base64 });

  const backupDb = await SQLite.openDatabaseAsync(tempName);
  const currentDb = await getDB();

  await currentDb.execAsync('PRAGMA foreign_keys = OFF');
  try {
    for (const cat of RESTORE_CATEGORIES) {
      if (!selected.has(cat.key)) continue;
      for (const table of cat.tables) {
        try {
          const rows = await backupDb.getAllAsync<Record<string, any>>(`SELECT * FROM ${table}`);
          await currentDb.runAsync(`DELETE FROM ${table}`);
          for (const row of rows) {
            const keys = Object.keys(row);
            if (!keys.length) continue;
            const ph = keys.map(() => '?').join(', ');
            await currentDb.runAsync(
              `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${ph})`,
              Object.values(row) as any[]
            );
          }
        } catch {}
      }
    }

    // Restore photos for selected categories
    const selectedDirs = new Set<string>();
    for (const cat of RESTORE_CATEGORIES) {
      if (selected.has(cat.key) && cat.photoDirs) {
        cat.photoDirs.forEach(d => selectedDirs.add(d));
      }
    }
    const imageFiles = Object.keys(zip.files).filter(f => f.startsWith('images/') && !zip.files[f].dir);
    for (const filePath of imageFiles) {
      const parts = filePath.split('/');
      if (parts.length < 3) continue;
      const dirName = parts[1];
      if (!selectedDirs.has(dirName)) continue;
      const fileName = parts[2];
      const destDir = (FileSystem.documentDirectory ?? '') + dirName + '/';
      const info = await FileSystem.getInfoAsync(destDir);
      if (!info.exists) await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
      const content = await zip.files[filePath].async('base64');
      await FileSystem.writeAsStringAsync(destDir + fileName, content, { encoding: FileSystem.EncodingType.Base64 });
    }
  } finally {
    await currentDb.execAsync('PRAGMA foreign_keys = ON');
    try { await (backupDb as any).closeAsync(); } catch {}
    await FileSystem.deleteAsync(tempPath, { idempotent: true });
  }
}

export default function BackupScreen() {
  const [backups, setBackups] = useState<{ name: string; uri: string; size: number; date: string }[]>([]);
  const [backing, setBacking] = useState(false);
  const [backupStep, setBackupStep] = useState('');
  const [restoring, setRestoring] = useState(false);

  // Selective backup modal
  const [selectiveModalVisible, setSelectiveModalVisible] = useState(false);
  const [backupSelected2, setBackupSelected2] = useState<Set<RestoreKey>>(new Set(RESTORE_CATEGORIES.map(c => c.key)));
  const toggleBackupCategory = (key: RestoreKey) => {
    setBackupSelected2(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const handleSelectiveBackup = async () => {
    setSelectiveModalVisible(false);
    setBacking(true);
    setBackupStep('Starting selective backup…');
    await backupSelected(backupSelected2, msg => setBackupStep(msg));
    setBackupStep('');
    setBacking(false);
    load();
  };

  // Restore selection modal
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [pendingAsset, setPendingAsset] = useState<{ uri: string; name: string; isZip: boolean } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'all' | 'selective'>('all');
  const [selected, setSelected] = useState<Set<RestoreKey>>(new Set(RESTORE_CATEGORIES.map(c => c.key)));

  const load = useCallback(async () => {
    setBackups(await listBackups());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleBackup = async () => {
    setBacking(true);
    setBackupStep('Starting backup…');
    await backupDatabase((msg) => setBackupStep(msg));
    setBackupStep('');
    setBacking(false);
    load();
  };

  const handleDelete = (uri: string, name: string) => {
    Alert.alert('Delete Backup', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteBackup(uri); load(); } },
    ]);
  };

  // Step 1: pick file and show selection modal
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const isZip = asset.name.endsWith('.zip');
      const isDb = asset.name.endsWith('.db');
      if (!isZip && !isDb) {
        Alert.alert('Invalid File', 'Please select a .zip backup file.');
        return;
      }
      setPendingAsset({ uri: asset.uri, name: asset.name, isZip });
      setRestoreMode('all');
      setSelected(new Set(RESTORE_CATEGORIES.map(c => c.key)));
      setRestoreModalVisible(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not open file.');
    }
  };

  // Step 2: execute restore after selection
  const handleRestore = async () => {
    if (!pendingAsset) return;
    setRestoreModalVisible(false);
    setRestoring(true);
    try {
      if (restoreMode === 'all') {
        // Full replace (original behavior)
        await resetDB();
        const sqliteDir = (FileSystem.documentDirectory ?? '') + 'SQLite/';
        const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
        if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });

        if (pendingAsset.isZip) {
          const zipContent = await FileSystem.readAsStringAsync(pendingAsset.uri, { encoding: FileSystem.EncodingType.Base64 });
          const zip = await JSZip.loadAsync(zipContent, { base64: true });

          // Detect selective (JSON) backup format
          const jsonFile = zip.file('backup_data.json');
          if (jsonFile) {
            const jsonText = await jsonFile.async('string');
            const manifest = JSON.parse(jsonText);
            const currentDb = await getDB();
            // Use runAsync for PRAGMA — execAsync can fail in WAL mode
            await currentDb.runAsync('PRAGMA foreign_keys = OFF');
            try {
              for (const [table, rows] of Object.entries(manifest.tables as Record<string, any[]>)) {
                try {
                  await currentDb.runAsync(`DELETE FROM ${table}`);
                  for (const row of rows) {
                    const keys = Object.keys(row);
                    if (!keys.length) continue;
                    const ph = keys.map(() => '?').join(', ');
                    // Sanitize values: convert undefined → null
                    const values = Object.values(row).map(v => v === undefined ? null : v);
                    await currentDb.runAsync(
                      `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${ph})`,
                      values as any[]
                    );
                  }
                } catch (tableErr: any) {
                  console.warn(`Restore table ${table}:`, tableErr?.message);
                }
              }
            } finally {
              await currentDb.runAsync('PRAGMA foreign_keys = ON');
            }
            const imageFiles2 = Object.keys(zip.files).filter(f => f.startsWith('images/') && !zip.files[f].dir);
            for (const fp of imageFiles2) {
              const pts = fp.split('/');
              if (pts.length < 3) continue;
              const destDir = (FileSystem.documentDirectory ?? '') + pts[1] + '/';
              const info = await FileSystem.getInfoAsync(destDir);
              if (!info.exists) await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
              const content = await zip.files[fp].async('base64');
              await FileSystem.writeAsStringAsync(destDir + pts[2], content, { encoding: FileSystem.EncodingType.Base64 });
            }
            Alert.alert('Restore Complete ✓', `Selective data (${manifest.categories?.join(', ')}) restored successfully.`, [{ text: 'OK' }]);
            setRestoring(false);
            setPendingAsset(null);
            return;
          }

          const dbFile = zip.file('gentech.db');
          if (dbFile) {
            const dbContent = await dbFile.async('base64');
            const DB_SOURCE = (FileSystem.documentDirectory ?? '') + 'SQLite/gentech.db';
            for (const p of [DB_SOURCE, DB_SOURCE + '-wal', DB_SOURCE + '-shm']) {
              await FileSystem.deleteAsync(p, { idempotent: true });
            }
            await FileSystem.writeAsStringAsync(DB_SOURCE, dbContent, { encoding: FileSystem.EncodingType.Base64 });
          }
          const imageFiles = Object.keys(zip.files).filter(f => f.startsWith('images/') && !zip.files[f].dir);
          for (const filePath of imageFiles) {
            const parts = filePath.split('/');
            if (parts.length < 3) continue;
            const destDir = (FileSystem.documentDirectory ?? '') + parts[1] + '/';
            const info = await FileSystem.getInfoAsync(destDir);
            if (!info.exists) await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
            const content = await zip.files[filePath].async('base64');
            await FileSystem.writeAsStringAsync(destDir + parts[2], content, { encoding: FileSystem.EncodingType.Base64 });
          }
        } else {
          const DB_SOURCE = (FileSystem.documentDirectory ?? '') + 'SQLite/gentech.db';
          for (const p of [DB_SOURCE, DB_SOURCE + '-wal', DB_SOURCE + '-shm']) {
            await FileSystem.deleteAsync(p, { idempotent: true });
          }
          await FileSystem.copyAsync({ from: pendingAsset.uri, to: DB_SOURCE });
        }
        await getDB();
      } else {
        // Selective restore
        if (!pendingAsset.isZip) {
          Alert.alert('Not Supported', 'Selective restore requires a .zip backup.');
          setRestoring(false);
          return;
        }
        const zipContent = await FileSystem.readAsStringAsync(pendingAsset.uri, { encoding: FileSystem.EncodingType.Base64 });
        const zip = await JSZip.loadAsync(zipContent, { base64: true });
        const dbFile = zip.file('gentech.db');
        if (!dbFile) throw new Error('No database found in backup file.');
        const dbContent = await dbFile.async('base64');
        await restoreSelective(dbContent, zip, selected);
      }

      Alert.alert(
        'Restore Complete ✓',
        restoreMode === 'all'
          ? 'All data restored.\n\nPlease close and reopen the app.'
          : 'Selected data restored successfully.',
        restoreMode === 'all'
          ? [
              { text: 'Close App Now', style: 'destructive', onPress: () => BackHandler.exitApp() },
              { text: 'Later', style: 'cancel' },
            ]
          : [{ text: 'OK' }]
      );
    } catch (e: any) {
      Alert.alert('Restore Failed', e?.message ?? String(e));
    } finally {
      setRestoring(false);
      setPendingAsset(null);
    }
  };

  const toggleCategory = (key: RestoreKey) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  function formatDate(raw: string): string {
    try {
      const y = raw.slice(0, 4), m = raw.slice(4, 6), d = raw.slice(6, 8);
      const hh = raw.slice(9, 11), mm = raw.slice(11, 13);
      return `${m}/${d}/${y} ${hh}:${mm}`;
    } catch { return raw; }
  }

  const license = useLicense();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.desc}>
          Creates a .zip backup of your database and all photos. Save it to Google Drive or email for safekeeping.
        </Text>
        <Button mode="contained" icon="database-export" onPress={handleBackup}
          loading={backing} disabled={backing || restoring}
          style={styles.backupBtn} contentStyle={styles.backupBtnContent}>
          Create Full Backup
        </Button>
        <Button mode="outlined" icon="database-cog-outline" onPress={() => {
          setBackupSelected2(new Set(RESTORE_CATEGORIES.map(c => c.key)));
          setSelectiveModalVisible(true);
        }}
          loading={backing} disabled={backing || restoring}
          style={[styles.backupBtn, { marginTop: 8, borderColor: Colors.primary }]}
          textColor={Colors.primary} contentStyle={styles.backupBtnContent}>
          Create Selective Backup
        </Button>
        <Button mode="outlined" icon="database-import" onPress={handlePickFile}
          loading={restoring} disabled={backing || restoring}
          style={[styles.backupBtn, { marginTop: 8, borderColor: Colors.warning }]}
          textColor={Colors.warning} contentStyle={styles.backupBtnContent}>
          Restore from File
        </Button>
        <Text style={styles.restoreHint}>Pick a .zip backup file from your device or Google Drive</Text>
      </View>

      <Divider />
      <Text style={styles.sectionTitle}>Saved Backups</Text>
      <FlatList
        data={backups}
        keyExtractor={b => b.uri}
        ListEmptyComponent={<Text style={styles.empty}>No backups yet. Tap "Create Backup Now" above.</Text>}
        renderItem={({ item }) => (
          <List.Item
            title={`Backup — ${formatDate(item.date)}`}
            description={`${item.size} KB`}
            left={props => <List.Icon {...props} icon="database" color={Colors.primary} />}
            right={() => (
              <View style={styles.actions}>
                <IconButton
                  icon="database-import"
                  iconColor={Colors.success}
                  onPress={() => {
                    setPendingAsset({ uri: item.uri, name: item.name, isZip: item.uri.endsWith('.zip') });
                    setRestoreMode('all');
                    setSelected(new Set(RESTORE_CATEGORIES.map(c => c.key)));
                    setRestoreModalVisible(true);
                  }}
                />
                <IconButton icon="share-variant" iconColor={Colors.primary} onPress={() => shareBackup(item.uri)} />
                <IconButton icon="delete-outline" iconColor={Colors.error} onPress={() => handleDelete(item.uri, item.name)} />
              </View>
            )}
            style={styles.item}
          />
        )}
        ItemSeparatorComponent={() => <Divider />}
        contentContainerStyle={backups.length === 0 ? styles.emptyContainer : undefined}
      />

      {/* ── Selective backup modal ── */}
      <Portal>
        <Modal visible={selectiveModalVisible} onDismiss={() => setSelectiveModalVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Create Selective Backup</Text>
            <Text style={styles.modeDesc}>Choose what to include. The filename will reflect your selection.</Text>
            <View style={styles.categoryList}>
              {RESTORE_CATEGORIES.map(cat => (
                <TouchableOpacity key={cat.key} style={styles.categoryRow} onPress={() => toggleBackupCategory(cat.key as RestoreKey)} activeOpacity={0.7}>
                  <MaterialCommunityIcons name={cat.icon as any} size={20} color={Colors.primary} style={{ marginRight: 10 }} />
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                  <Checkbox status={backupSelected2.has(cat.key as RestoreKey) ? 'checked' : 'unchecked'} onPress={() => toggleBackupCategory(cat.key as RestoreKey)} color={Colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setSelectiveModalVisible(false)} style={styles.btnHalf}>Cancel</Button>
              <Button mode="contained" onPress={handleSelectiveBackup}
                disabled={backupSelected2.size === 0}
                style={styles.btnHalf} icon="database-export">
                Create
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* ── Backup loading overlay ── */}
      {backing && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <MaterialCommunityIcons name="database-export" size={36} color={Colors.primary} />
            <Text style={styles.loadingTitle}>Creating Backup</Text>
            <Text style={styles.loadingStep}>{backupStep}</Text>
            <View style={styles.loadingDots}>
              {[0, 1, 2].map(i => (
                <View key={i} style={[styles.loadingDot, { opacity: 0.3 + i * 0.3 }]} />
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ── Restore selection modal ── */}
      <Portal>
        <Modal visible={restoreModalVisible} onDismiss={() => setRestoreModalVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Restore from Backup</Text>
            <Text style={styles.modalFile} numberOfLines={1}>{pendingAsset?.name}</Text>

            {/* Mode selector */}
            <View style={styles.modeRow}>
              <TouchableOpacity style={[styles.modeBtn, restoreMode === 'all' && styles.modeBtnActive]} onPress={() => setRestoreMode('all')} activeOpacity={0.8}>
                <MaterialCommunityIcons name="database-import" size={18} color={restoreMode === 'all' ? '#fff' : Colors.text} />
                <Text style={[styles.modeBtnLabel, restoreMode === 'all' && { color: '#fff' }]}>Restore All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modeBtn, restoreMode === 'selective' && styles.modeBtnActive]} onPress={() => setRestoreMode('selective')} activeOpacity={0.8}>
                <MaterialCommunityIcons name="format-list-checks" size={18} color={restoreMode === 'selective' ? '#fff' : Colors.text} />
                <Text style={[styles.modeBtnLabel, restoreMode === 'selective' && { color: '#fff' }]}>Select Data</Text>
              </TouchableOpacity>
            </View>

            {restoreMode === 'all' ? (
              <Text style={styles.modeDesc}>
                Replaces ALL current data with the backup. Requires app restart.
              </Text>
            ) : (
              <>
                <Text style={styles.modeDesc}>Choose which data to restore. Existing data in selected categories will be replaced.</Text>
                <View style={styles.categoryList}>
                  {RESTORE_CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat.key} style={styles.categoryRow} onPress={() => toggleCategory(cat.key)} activeOpacity={0.7}>
                      <MaterialCommunityIcons name={cat.icon as any} size={20} color={Colors.primary} style={{ marginRight: 10 }} />
                      <Text style={styles.categoryLabel}>{cat.label}</Text>
                      <Checkbox status={selected.has(cat.key) ? 'checked' : 'unchecked'} onPress={() => toggleCategory(cat.key)} color={Colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setRestoreModalVisible(false)} style={styles.btnHalf}>Cancel</Button>
              <Button mode="contained" onPress={handleRestore}
                disabled={restoreMode === 'selective' && selected.size === 0}
                style={[styles.btnHalf, { backgroundColor: Colors.warning }]}>
                Restore
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 16 },
  desc: { fontSize: 14, color: Colors.textSecondary, marginBottom: 14, lineHeight: 20 },
  backupBtn: { borderRadius: 8 },
  backupBtnContent: { paddingVertical: 6 },
  restoreHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 6, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.primary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, textTransform: 'uppercase' },
  item: { backgroundColor: Colors.surface },
  actions: { flexDirection: 'row', alignItems: 'center' },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 32, fontSize: 14 },
  emptyContainer: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: 260,
    gap: 12,
    elevation: 10,
  },
  loadingTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  loadingStep: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', minHeight: 18 },
  loadingDots: { flexDirection: 'row', gap: 8, marginTop: 4 },
  loadingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  // Modal
  modal: { backgroundColor: Colors.surface, margin: 16, borderRadius: 16, padding: 20, maxHeight: '88%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  modalFile: { fontSize: 12, color: Colors.textSecondary, marginBottom: 16 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  modeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeBtnLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  modeDesc: { fontSize: 12, color: Colors.textSecondary, marginBottom: 14, lineHeight: 18 },
  categoryList: { gap: 2, marginBottom: 8 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, backgroundColor: Colors.background },
  categoryLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.text },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnHalf: { flex: 1, borderRadius: 10 },
});
