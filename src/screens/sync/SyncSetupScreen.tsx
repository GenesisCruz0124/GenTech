import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { getDeviceId } from '../../services/licenseService';
import { backupSelected } from '../../services/backupService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  createShop,
  joinShop,
  getLinkedShop,
  unlinkShop,
  SyncShopInfo,
} from '../../services/syncPairingService';
import {
  syncNow,
  isLocalDataEmpty,
  wipeAndPullAll,
  pushFullBaseline,
} from '../../services/syncService';
import { getQueueLength } from '../../services/syncQueueService';
import { isSupabaseConfigured } from '../../services/supabaseClient';

const BACKUP_ALL_KEYS = new Set(['customers', 'repairs', 'stocks', 'suppliers', 'cotechs', 'catalog', 'settings']);

export default function SyncSetupScreen() {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [shop, setShop] = useState<SyncShopInfo | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [queueLength, setQueueLength] = useState(0);
  const [joinCode, setJoinCode] = useState('');
  const [warnVisible, setWarnVisible] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const refresh = useCallback(async () => {
    const [linked, id, qLen] = await Promise.all([getLinkedShop(), getDeviceId(), getQueueLength()]);
    setShop(linked);
    setDeviceId(id);
    setQueueLength(qLen);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const runJoin = async (code: string) => {
    setLoading(true);
    setStatusMsg('Joining shop…');
    try {
      await joinShop(code);
      setStatusMsg('Pulling shop data…');
      const pulled = await wipeAndPullAll();
      setLastResult(`Joined. Pulled ${pulled} record${pulled === 1 ? '' : 's'}.`);
      setJoinCode('');
      await refresh();
    } catch (e: any) {
      Alert.alert('Join Failed', e?.message ?? String(e));
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const handleJoinPress = async () => {
    const code = joinCode.trim();
    if (code.length < 4) {
      Alert.alert('Enter Code', 'Enter the 6-character Shop Sync Code from the other device.');
      return;
    }
    const empty = await isLocalDataEmpty();
    if (empty) {
      runJoin(code);
    } else {
      setWarnVisible(true);
    }
  };

  const handleBackupThenJoin = async () => {
    setWarnVisible(false);
    setLoading(true);
    setStatusMsg('Backing up local data…');
    try {
      await backupSelected(BACKUP_ALL_KEYS, msg => setStatusMsg(msg));
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
    await runJoin(joinCode.trim());
  };

  const handleCreate = async () => {
    setLoading(true);
    setStatusMsg('Creating shop…');
    try {
      const created = await createShop();
      setStatusMsg('Uploading existing data…');
      await pushFullBaseline();
      setShop(created);
      setLastResult('Shop created. Share the Shop Sync Code with your other device.');
      await refresh();
    } catch (e: any) {
      Alert.alert('Create Failed', e?.message ?? String(e));
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const handleSyncNow = async () => {
    setLoading(true);
    setStatusMsg('Syncing…');
    try {
      const result = await syncNow();
      setLastResult(`Pushed ${result.pushed}, pulled ${result.pulled}.`);
      await refresh();
    } catch (e: any) {
      Alert.alert('Sync Failed', e?.message ?? String(e));
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Sync',
      'This device will stop syncing with the shop. Data already on this device stays put. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            await unlinkShop();
            setLastResult('');
            await refresh();
          },
        },
      ]
    );
  };

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="cloud-off-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.centerText}>Cloud sync is not configured for this app build.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.overlayText}>{statusMsg}</Text>
        </View>
      )}

      {shop ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.label}>Shop Sync Code</Text>
            <Text style={styles.codeText}>{shop.shopCode}</Text>
            <Text style={styles.label}>This Device</Text>
            <Text style={styles.value}>{deviceId}</Text>
            <Text style={styles.label}>Pending changes to push</Text>
            <Text style={styles.value}>{queueLength}</Text>
            {!!lastResult && <Text style={styles.resultText}>{lastResult}</Text>}
          </Card.Content>
          <Card.Actions>
            <Button mode="contained" onPress={handleSyncNow} icon="cloud-sync-outline">Sync Now</Button>
            <Button onPress={handleLeave} textColor={Colors.error}>Leave Sync</Button>
          </Card.Actions>
        </Card>
      ) : (
        <>
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Create a New Shop</Text>
              <Text style={styles.cardDesc}>
                Start sync from this device. You'll get a Shop Sync Code to enter on your other device(s).
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" onPress={handleCreate} icon="plus-circle-outline">Create Shop</Button>
            </Card.Actions>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Join an Existing Shop</Text>
              <Text style={styles.cardDesc}>
                Enter the Shop Sync Code shown on the device that created the shop.
              </Text>
              <TextInput
                mode="outlined"
                label="Shop Sync Code"
                value={joinCode}
                onChangeText={t => setJoinCode(t.toUpperCase())}
                autoCapitalize="characters"
                maxLength={6}
                style={styles.input}
              />
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" onPress={handleJoinPress} icon="link-variant">Join Shop</Button>
            </Card.Actions>
          </Card>
        </>
      )}

      <ConfirmDialog
        visible={warnVisible}
        title="Back Up Local Data First"
        message="This device already has data. Joining will replace it with the shop's data from the cloud. We'll back up your current data to a file first — keep it safe, since it won't be merged automatically."
        confirmLabel="Backup & Join"
        destructive
        onConfirm={handleBackupThenJoin}
        onDismiss={() => setWarnVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { marginTop: 12, color: Colors.textSecondary, textAlign: 'center' },
  card: { marginBottom: 16, backgroundColor: Colors.surface },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  cardDesc: { color: Colors.textSecondary, marginBottom: 8 },
  input: { marginTop: 8 },
  label: { color: Colors.textSecondary, fontSize: 12, marginTop: 8 },
  value: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  codeText: { color: Colors.primary, fontSize: 28, fontWeight: 'bold', letterSpacing: 4 },
  resultText: { color: Colors.success, marginTop: 12 },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  overlayText: { color: '#fff', marginTop: 12, fontSize: 14 },
});
