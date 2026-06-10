import React, { useEffect, useState } from 'react';
import { Alert, Clipboard, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { activateLicense, generateLicenseKey, TRIAL_LIMITS } from '../../services/licenseService';
import { useLicense, refreshLicense } from '../../hooks/useLicense';
import { getSetting } from '../../repositories/settingsRepository';
import { Colors } from '../../constants/colors';

const SECRET_PHONE = '09255601854';

const PRO_FEATURES = [
  { icon: 'wrench',                 label: 'Unlimited Repairs' },
  { icon: 'account-group',          label: 'Unlimited Customers' },
  { icon: 'truck-delivery-outline', label: 'Unlimited Suppliers' },
  { icon: 'account-hard-hat-outline', label: 'Unlimited Co-Techs' },
  { icon: 'database-export',        label: 'Backup & Restore' },
  { icon: 'receipt',                label: 'Invoice / PDF Export' },
  { icon: 'chart-bar',              label: 'Full Reports & Analytics' },
  { icon: 'database-cog-outline',   label: 'Export Seed Data' },
  { icon: 'shield-check',           label: 'Lifetime License — pay once' },
];

export default function LicenseScreen() {
  const license = useLicense();
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  // Check if the technician's phone matches the secret number
  useEffect(() => {
    getSetting('owner_phone').then(phone => {
      if (phone?.replace(/\D/g, '') === SECRET_PHONE.replace(/\D/g, '')) {
        setIsDevMode(true);
      }
    }).catch(() => {});
  }, []);

  const handleActivate = async () => {
    if (!key.trim()) return;
    setSaving(true);
    const result = await activateLicense(key.trim());
    setSaving(false);
    if (result.success) {
      refreshLicense();
      Alert.alert('✅ Activated!', 'Thank you! Your Pro license is now active. All features are unlocked.');
      setKey('');
    } else {
      Alert.alert('Invalid Key', result.error ?? 'Please check the key and try again.');
    }
  };

  if (license.isPro) {
    return (
      <View style={styles.proContainer}>
        <MaterialCommunityIcons name="crown" size={72} color="#F59E0B" />
        <Text style={styles.proTitle}>You're on Pro!</Text>
        <Text style={styles.proSub}>All features are unlocked. Thank you for your support!</Text>
        <DeviceIdCard deviceId={license.deviceId} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Status banner */}
      <View style={[styles.statusCard, license.isExpired ? styles.statusExpired : styles.statusTrial]}>
        <MaterialCommunityIcons
          name={license.isExpired ? 'lock' : 'clock-outline'}
          size={28} color="#fff"
        />
        <View style={{ flex: 1 }}>
          {license.isExpired ? (
            <>
              <Text style={styles.statusTitle}>Free Trial Ended</Text>
              <Text style={styles.statusSub}>Activate your Pro license to continue using all features.</Text>
            </>
          ) : (
            <>
              <Text style={styles.statusTitle}>
                {license.hoursLeft <= 1 ? 'Trial expires very soon!' : `${license.hoursLeft} hour${license.hoursLeft !== 1 ? 's' : ''} remaining`}
              </Text>
              <Text style={styles.statusSub}>
                Trial limits: {TRIAL_LIMITS.repairs} repairs · {TRIAL_LIMITS.customers} customers
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Pro features list */}
      <Text style={styles.sectionTitle}>What you get with Pro</Text>
      <View style={styles.featuresCard}>
        {PRO_FEATURES.map((f, i) => (
          <View key={f.label} style={[styles.featureRow, i < PRO_FEATURES.length - 1 && styles.featureBorder]}>
            <MaterialCommunityIcons name={f.icon as any} size={20} color={Colors.primary} />
            <Text style={styles.featureLabel}>{f.label}</Text>
            <MaterialCommunityIcons name="check-circle" size={16} color={Colors.success} />
          </View>
        ))}
      </View>

      {/* Device ID — user must share this with developer */}
      <Text style={styles.sectionTitle}>Your Device ID</Text>
      <DeviceIdCard deviceId={license.deviceId} />

      {/* Activation */}
      <Text style={styles.sectionTitle}>Enter License Key</Text>
      <View style={styles.activateCard}>
        <Text style={styles.activateHint}>
          Purchase a license key from your developer and enter it below.
        </Text>
        <TextInput
          label="License Key (GT-XXXX-XXXX-XXXX)"
          value={key}
          onChangeText={setKey}
          mode="outlined"
          style={styles.input}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Button
          mode="contained"
          icon="crown"
          onPress={handleActivate}
          loading={saving}
          disabled={!key.trim() || saving}
          style={styles.activateBtn}
          contentStyle={{ paddingVertical: 6 }}
          buttonColor="#F59E0B"
        >
          Activate Pro License
        </Button>
      </View>

      {/* 🔒 Secret dev panel — visible only to the registered technician */}
      {isDevMode && <KeyGeneratorPanel />}

    </ScrollView>
  );
}

function KeyGeneratorPanel() {
  const [deviceId, setDeviceId] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');

  const generate = () => {
    const id = deviceId.trim().toUpperCase();
    if (!id) return;
    const k = generateLicenseKey(id);
    setGeneratedKey(k);
  };

  const copy = () => {
    if (!generatedKey) return;
    Clipboard.setString(generatedKey);
    Alert.alert('Copied!', `Key copied:\n${generatedKey}`);
  };

  return (
    <View style={devStyles.panel}>
      <View style={devStyles.header}>
        <MaterialCommunityIcons name="shield-key-outline" size={18} color="#7C3AED" />
        <Text style={devStyles.title}>License Key Generator</Text>
      </View>
      <TextInput
        label="Customer Device ID"
        value={deviceId}
        onChangeText={setDeviceId}
        mode="outlined"
        style={devStyles.input}
        autoCapitalize="characters"
        placeholder="e.g. A3F2B7C1D9E4"
      />
      <Button mode="contained" onPress={generate} disabled={!deviceId.trim()}
        style={devStyles.btn} buttonColor="#7C3AED" icon="key-variant">
        Generate Key
      </Button>
      {generatedKey ? (
        <TouchableOpacity style={devStyles.result} onPress={copy}>
          <Text style={devStyles.keyText}>{generatedKey}</Text>
          <View style={devStyles.copyRow}>
            <MaterialCommunityIcons name="content-copy" size={13} color="#7C3AED" />
            <Text style={devStyles.copyHint}>Tap to copy</Text>
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const devStyles = StyleSheet.create({
  panel: { backgroundColor: '#F5F3FF', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#7C3AED40', gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, fontWeight: '800', color: '#7C3AED' },
  input: { backgroundColor: '#fff' },
  btn: { borderRadius: 10 },
  result: { backgroundColor: '#EDE9FE', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#7C3AED40' },
  keyText: { fontSize: 18, fontWeight: '800', color: '#4C1D95', letterSpacing: 1.5, textAlign: 'center' },
  copyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 },
  copyHint: { fontSize: 11, color: '#7C3AED', fontWeight: '600' },
});

function DeviceIdCard({ deviceId }: { deviceId: string }) {
  const copy = () => {
    Clipboard.setString(deviceId);
    Alert.alert('Copied!', 'Device ID copied. Send it to the developer to get your license key.');
  };
  return (
    <TouchableOpacity style={deviceStyles.card} onPress={copy} activeOpacity={0.8}>
      <View style={deviceStyles.row}>
        <MaterialCommunityIcons name="cellphone-lock" size={22} color="#F59E0B" />
        <View style={{ flex: 1 }}>
          <Text style={deviceStyles.label}>Device ID (tap to copy)</Text>
          <Text style={deviceStyles.id}>{deviceId || '...'}</Text>
        </View>
        <MaterialCommunityIcons name="content-copy" size={18} color="#F59E0B" />
      </View>
      <Text style={deviceStyles.hint}>
        Share this with the developer to receive a key bound to your device.{'\n'}
        The same key will NOT work on another phone. 🔒
      </Text>
    </TouchableOpacity>
  );
}

const deviceStyles = StyleSheet.create({
  card: { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#F59E0B' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  label: { fontSize: 10, fontWeight: '700', color: '#92400E', textTransform: 'uppercase', letterSpacing: 0.6 },
  id: { fontSize: 18, fontWeight: '800', color: '#78350F', letterSpacing: 2, marginTop: 2 },
  hint: { fontSize: 12, color: '#92400E', lineHeight: 18 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  content: { padding: 14, paddingBottom: 48, gap: 12 },
  proContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  proTitle: { fontSize: 26, fontWeight: '800', color: Colors.text },
  proSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  statusCard: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusTrial: { backgroundColor: '#F59E0B' },
  statusExpired: { backgroundColor: Colors.error },
  statusTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  statusSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, paddingLeft: 2 },
  featuresCard: { backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden', elevation: 2 },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  featureBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  featureLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.text },
  activateCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, elevation: 2, gap: 10 },
  activateHint: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  input: { backgroundColor: Colors.surface },
  activateBtn: { borderRadius: 12 },
});
