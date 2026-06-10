import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, BackHandler } from 'react-native';
import { resetDB, getDB } from '../db/database';
import JSZip from 'jszip';

const DB_SOURCE = FileSystem.documentDirectory + 'SQLite/gentech.db';
const BACKUP_DIR = FileSystem.documentDirectory + 'backups/';

// Directories containing images to include in backup
const IMAGE_DIRS = [
  'repair_images',
  'payment_proofs',
  'customer_photos',
  'supplier_photos',
  'cotech_photos',
  'app_images',
  'lens_temp',
];

function getTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}_${hh}${mm}`;
}

async function getAllFilesInDir(dir: string): Promise<{ path: string; name: string }[]> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) return [];
  const files = await FileSystem.readDirectoryAsync(dir);
  return files.map(name => ({ path: dir + name, name }));
}

export async function backupDatabase(onStep?: (msg: string) => void): Promise<void> {
  const step = (msg: string) => onStep?.(msg);
  try {
    const dbInfo = await FileSystem.getInfoAsync(DB_SOURCE);
    if (!dbInfo.exists) {
      Alert.alert('Backup Failed', 'Database file not found. Open the app first to create data.');
      return;
    }

    step('Flushing database…');
    try {
      const db = await getDB();
      await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch {}
    await resetDB();

    const dirInfo = await FileSystem.getInfoAsync(BACKUP_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
    }

    const zip = new JSZip();

    step('Backing up database…');
    const dbContent = await FileSystem.readAsStringAsync(DB_SOURCE, { encoding: FileSystem.EncodingType.Base64 });
    zip.file('gentech.db', dbContent, { base64: true });
    await getDB();

    // Add images from each directory
    for (const dirName of IMAGE_DIRS) {
      const dirPath = FileSystem.documentDirectory + dirName + '/';
      const files = await getAllFilesInDir(dirPath);
      if (files.length > 0) step(`Backing up ${dirName} (${files.length} file${files.length !== 1 ? 's' : ''})…`);
      for (const file of files) {
        try {
          const content = await FileSystem.readAsStringAsync(file.path, { encoding: FileSystem.EncodingType.Base64 });
          zip.file(`images/${dirName}/${file.name}`, content, { base64: true });
        } catch {}
      }
    }

    step('Compressing…');
    const zipContent = await zip.generateAsync({ type: 'base64' });
    step('Saving backup file…');
    const backupPath = BACKUP_DIR + `repair_tracker_backup_${getTimestamp()}.zip`;
    await FileSystem.writeAsStringAsync(backupPath, zipContent, { encoding: FileSystem.EncodingType.Base64 });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(backupPath, {
        mimeType: 'application/zip',
        dialogTitle: 'Save Repair Tracker Backup',
        UTI: 'public.zip-archive',
      });
    } else {
      Alert.alert('Backup Saved', `Backup saved to:\n${backupPath}`);
    }
  } catch (e: any) {
    Alert.alert('Backup Error', e?.message ?? String(e));
  }
}

// ── Category → tables + photo dirs mapping ───────────────────
const CATEGORY_MAP: Record<string, { tables: string[]; photoDirs?: string[] }> = {
  customers:  { tables: ['customers'],                                                                       photoDirs: ['customer_photos'] },
  repairs:    { tables: ['repairs','repair_notes','repair_payments','repair_parts','repair_images','invoices'], photoDirs: ['repair_images','payment_proofs'] },
  stocks:     { tables: ['parts','parts_purchases'] },
  suppliers:  { tables: ['suppliers'],                                                                        photoDirs: ['supplier_photos'] },
  cotechs:    { tables: ['co_techs'],                                                                         photoDirs: ['cotech_photos'] },
  catalog:    { tables: ['device_brands','device_models','categories','issues'] },
  settings:   { tables: ['settings'] },
};

function buildBackupFilename(selectedKeys: string[]): string {
  const ts = getTimestamp();
  if (selectedKeys.length === 0) return `backup_empty_${ts}.zip`;
  if (selectedKeys.length >= Object.keys(CATEGORY_MAP).length) return `backup_full_${ts}.zip`;
  const labels: Record<string, string> = {
    customers: 'customers', repairs: 'repairs', stocks: 'stocks',
    suppliers: 'suppliers', cotechs: 'cotechs', catalog: 'catalog', settings: 'settings',
  };
  const parts = selectedKeys.slice(0, 3).map(k => labels[k] ?? k);
  const suffix = selectedKeys.length > 3 ? '_etc' : '';
  return `backup_${parts.join('_')}${suffix}_${ts}.zip`;
}

export async function backupSelected(
  selectedKeys: Set<string>,
  onStep?: (msg: string) => void
): Promise<void> {
  const step = (msg: string) => onStep?.(msg);
  try {
    const dirInfo = await FileSystem.getInfoAsync(BACKUP_DIR);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });

    const db = await getDB();
    const zip = new JSZip();
    const selectedArr = [...selectedKeys];

    step('Reading database…');
    const tableData: Record<string, any[]> = {};
    for (const key of selectedArr) {
      const def = CATEGORY_MAP[key];
      if (!def) continue;
      for (const table of def.tables) {
        try {
          tableData[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
        } catch { tableData[table] = []; }
      }
    }

    const manifest = {
      version: '2.0',
      type: 'selective',
      categories: selectedArr,
      created_at: new Date().toISOString(),
      tables: tableData,
    };
    zip.file('backup_data.json', JSON.stringify(manifest));

    // Include photos for selected categories
    const photoDirs = new Set<string>();
    for (const key of selectedArr) {
      CATEGORY_MAP[key]?.photoDirs?.forEach(d => photoDirs.add(d));
    }
    for (const dirName of photoDirs) {
      const dirPath = (FileSystem.documentDirectory ?? '') + dirName + '/';
      const files = await getAllFilesInDir(dirPath);
      if (files.length > 0) step(`Backing up ${dirName} (${files.length} file${files.length !== 1 ? 's' : ''})…`);
      for (const file of files) {
        try {
          const content = await FileSystem.readAsStringAsync(file.path, { encoding: FileSystem.EncodingType.Base64 });
          zip.file(`images/${dirName}/${file.name}`, content, { base64: true });
        } catch {}
      }
    }

    step('Compressing…');
    const zipContent = await zip.generateAsync({ type: 'base64' });
    step('Saving backup file…');
    const filename = buildBackupFilename(selectedArr);
    const backupPath = BACKUP_DIR + filename;
    await FileSystem.writeAsStringAsync(backupPath, zipContent, { encoding: FileSystem.EncodingType.Base64 });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(backupPath, {
        mimeType: 'application/zip',
        dialogTitle: 'Save Selective Backup',
        UTI: 'public.zip-archive',
      });
    } else {
      Alert.alert('Backup Saved', `Saved as:\n${filename}`);
    }
  } catch (e: any) {
    Alert.alert('Backup Error', e?.message ?? String(e));
  }
}

export async function listBackups(): Promise<{ name: string; uri: string; size: number; date: string }[]> {
  const dirInfo = await FileSystem.getInfoAsync(BACKUP_DIR);
  if (!dirInfo.exists) return [];

  const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);
  const backups = await Promise.all(
    files
      .filter(f => f.endsWith('.zip') || f.endsWith('.db'))
      .map(async name => {
        const uri = BACKUP_DIR + name;
        const info = await FileSystem.getInfoAsync(uri);
        const sizeKB = Math.round(((info as any).size ?? 0) / 1024);
        const date = name
          .replace('repair_tracker_backup_', '')
          .replace('gentech_backup_', '')
          .replace('.zip', '')
          .replace('.db', '');
        return { name, uri, size: sizeKB, date };
      })
  );
  return backups.sort((a, b) => b.date.localeCompare(a.date));
}

export async function shareBackup(uri: string): Promise<void> {
  const mimeType = uri.endsWith('.zip') ? 'application/zip' : 'application/octet-stream';
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Share Repair Tracker Backup' });
}

export async function deleteBackup(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

export async function restoreDatabase(): Promise<boolean> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return false;
    const asset = result.assets[0];

    const isZip = asset.name.endsWith('.zip');
    const isDb = asset.name.endsWith('.db');

    if (!isZip && !isDb) {
      Alert.alert('Invalid File', 'Please select a valid backup file (.zip or .db)');
      return false;
    }

    return new Promise(resolve => {
      Alert.alert(
        'Restore Backup',
        `Restore from "${asset.name}"?\n\nThis will REPLACE all current data including images. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              try {
                await resetDB();

                const sqliteDir = FileSystem.documentDirectory + 'SQLite/';
                const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
                if (!dirInfo.exists) {
                  await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
                }

                if (isZip) {
                  // Extract ZIP
                  const zipContent = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
                  const zip = await JSZip.loadAsync(zipContent, { base64: true });

                  // Restore database
                  const dbFile = zip.file('gentech.db');
                  if (dbFile) {
                    const dbContent = await dbFile.async('base64');
                    for (const path of [DB_SOURCE, DB_SOURCE + '-wal', DB_SOURCE + '-shm']) {
                      await FileSystem.deleteAsync(path, { idempotent: true });
                    }
                    await FileSystem.writeAsStringAsync(DB_SOURCE, dbContent, { encoding: FileSystem.EncodingType.Base64 });
                  }

                  // Restore images
                  const imageFiles = Object.keys(zip.files).filter(f => f.startsWith('images/') && !zip.files[f].dir);
                  for (const filePath of imageFiles) {
                    const parts = filePath.split('/'); // ['images', 'dirName', 'fileName']
                    if (parts.length < 3) continue;
                    const dirName = parts[1];
                    const fileName = parts[2];
                    const destDir = FileSystem.documentDirectory + dirName + '/';
                    const destDirInfo = await FileSystem.getInfoAsync(destDir);
                    if (!destDirInfo.exists) {
                      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
                    }
                    const content = await zip.files[filePath].async('base64');
                    await FileSystem.writeAsStringAsync(destDir + fileName, content, { encoding: FileSystem.EncodingType.Base64 });
                  }
                } else {
                  // Legacy .db restore
                  for (const path of [DB_SOURCE, DB_SOURCE + '-wal', DB_SOURCE + '-shm']) {
                    await FileSystem.deleteAsync(path, { idempotent: true });
                  }
                  await FileSystem.copyAsync({ from: asset.uri, to: DB_SOURCE });
                }

                const restoredDb = await getDB();

                // Normalize photo_uri paths across all tables in case documentDirectory differs
                const currentDocDir = FileSystem.documentDirectory ?? '';
                if (currentDocDir) {
                  const photoTables: { table: string; dirName: string }[] = [
                    { table: 'customers',  dirName: 'customer_photos' },
                    { table: 'suppliers',  dirName: 'supplier_photos' },
                    { table: 'co_techs',   dirName: 'cotech_photos' },
                  ];
                  for (const { table, dirName } of photoTables) {
                    try {
                      const rows = await restoredDb.getAllAsync<{ id: number; photo_uri: string }>(
                        `SELECT id, photo_uri FROM ${table} WHERE photo_uri IS NOT NULL AND photo_uri != ''`
                      );
                      for (const row of rows) {
                        const match = row.photo_uri.match(new RegExp(`/(${dirName}/[^/]+)$`));
                        if (match) {
                          const normalized = currentDocDir + match[1];
                          if (normalized !== row.photo_uri) {
                            await restoredDb.runAsync(
                              `UPDATE ${table} SET photo_uri = ? WHERE id = ?`,
                              [normalized, row.id]
                            );
                          }
                        }
                      }
                    } catch {}
                  }
                }

                Alert.alert(
                  'Restore Complete ✓',
                  'Your data and images have been restored.\n\nPlease close and reopen the app.',
                  [
                    { text: 'Close App Now', style: 'destructive', onPress: () => BackHandler.exitApp() },
                    { text: 'Later', style: 'cancel' },
                  ]
                );
                resolve(true);
              } catch (e: any) {
                Alert.alert('Restore Failed', e?.message ?? String(e));
                resolve(false);
              }
            },
          },
        ]
      );
    });
  } catch (e: any) {
    Alert.alert('Restore Error', e?.message ?? String(e));
    return false;
  }
}
