import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useLicense } from '../../hooks/useLicense';
import { Colors } from '../../constants/colors';

interface ProGateProps {
  feature: string;           // e.g. "Backup & Restore"
  children: React.ReactNode;
}

/** Wraps content that requires Pro. Shows a lock screen if trial expired. */
export default function ProGate({ feature, children }: ProGateProps) {
  const { isPro, isTrialActive, loading } = useLicense();
  if (loading || isPro || isTrialActive) return <>{children}</>;
  return <LockedFeature feature={feature} />;
}

/** Inline lock overlay — use when you need to block a button/action */
export function ProLock({ feature, children }: ProGateProps) {
  const { isPro, isTrialActive, loading } = useLicense();
  if (loading || isPro || isTrialActive) return <>{children}</>;
  return <LockedBadge feature={feature} />;
}

// ── Full-screen locked view ───────────────────────────────────────────────────
function LockedFeature({ feature }: { feature: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="lock-outline" size={72} color={Colors.border} />
      <Text style={styles.title}>Pro Feature</Text>
      <Text style={styles.subtitle}>{feature} is only available in the Pro version.</Text>
      <Text style={styles.subtitle2}>Your free trial has ended.</Text>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('License')}>
        <MaterialCommunityIcons name="crown" size={18} color="#fff" />
        <Text style={styles.btnText}>Upgrade to Pro</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Small badge next to a locked button ──────────────────────────────────────
function LockedBadge({ feature }: { feature: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <TouchableOpacity style={styles.badge} onPress={() => navigation.navigate('License')}>
      <MaterialCommunityIcons name="lock" size={14} color="#fff" />
      <Text style={styles.badgeText}>Pro</Text>
    </TouchableOpacity>
  );
}

// ── Trial expiry banner (use on any screen header) ───────────────────────────
export function TrialBanner() {
  const { isPro, isTrialActive, isExpired, hoursLeft } = useLicense();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  if (isPro || (!isExpired && !isTrialActive)) return null;

  if (isExpired) {
    return (
      <TouchableOpacity style={[styles.banner, styles.bannerExpired]} onPress={() => navigation.navigate('License')}>
        <MaterialCommunityIcons name="crown" size={15} color="#fff" />
        <Text style={styles.bannerText}>Trial expired — Upgrade to Pro to continue</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.banner, styles.bannerTrial]} onPress={() => navigation.navigate('License')}>
      <MaterialCommunityIcons name="clock-outline" size={15} color="#fff" />
      <Text style={styles.bannerText}>
        {hoursLeft <= 1 ? 'Trial expires soon' : `Trial: ${hoursLeft}h remaining`} · Tap to upgrade
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  subtitle2: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F59E0B', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9 },
  bannerTrial: { backgroundColor: '#F59E0B' },
  bannerExpired: { backgroundColor: Colors.error },
  bannerText: { color: '#fff', fontSize: 12, fontWeight: '700', flex: 1 },
});
