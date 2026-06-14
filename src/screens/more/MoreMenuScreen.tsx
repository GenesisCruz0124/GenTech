import React, { useState } from 'react';
import { Alert, Clipboard, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, List, Divider, Modal, Portal, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { useAnimatedTabTitle } from '../../hooks/useAnimatedTabTitle';
import { useLicense } from '../../hooks/useLicense';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../constants/colors';
import { resetCustomers, resetRepairs, resetDevices, resetStocks, resetSuppliers, resetCoTechs, resetAll } from '../../repositories/resetRepository';
import { getDB } from '../../db/database';
import ConfirmDialog from '../../components/common/ConfirmDialog';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function MoreMenuScreen() {
  const navigation = useNavigation<Nav>();
  useAnimatedTabTitle(navigation, 'Settings');
  const license = useLicense();
  const [confirmType, setConfirmType] = useState<'customers' | 'repairs' | 'devices' | 'stocks' | 'suppliers' | 'cotechs' | 'all' | null>(null);
  const [resetMenuVisible, setResetMenuVisible] = useState(false);
  const [seedSql, setSeedSql] = useState('');
  const [seedVisible, setSeedVisible] = useState(false);

  const handleExportSeed = async () => {
    try {
      const db = await getDB();
      const brands = await db.getAllAsync<{ name: string }>('SELECT name FROM device_brands ORDER BY name ASC');
      const categories = await db.getAllAsync<{ name: string }>('SELECT name FROM categories ORDER BY name ASC');
      const issues = await db.getAllAsync<{ name: string }>('SELECT name FROM issues ORDER BY name ASC');
      const models = await db.getAllAsync<{ name: string; brand_name: string | null; year_released: number | null }>(
        `SELECT dm.name, b.name as brand_name, dm.year_released
         FROM device_models dm LEFT JOIN device_brands b ON b.id = dm.brand_id ORDER BY b.name ASC, dm.name ASC`
      );

      const esc = (s: string) => s.replace(/'/g, "''");

      const lines: string[] = [];
      lines.push('-- BRANDS');
      brands.forEach(r => lines.push(`INSERT OR IGNORE INTO device_brands (name) VALUES ('${esc(r.name)}');`));
      lines.push('');
      lines.push('-- CATEGORIES');
      categories.forEach(r => lines.push(`INSERT OR IGNORE INTO categories (name) VALUES ('${esc(r.name)}');`));
      lines.push('');
      lines.push('-- ISSUES');
      issues.forEach(r => lines.push(`INSERT OR IGNORE INTO issues (name) VALUES ('${esc(r.name)}');`));
      lines.push('');
      lines.push('-- DEVICE MODELS');
      models.forEach(r => {
        if (r.brand_name) {
          lines.push(`INSERT OR IGNORE INTO device_models (name, brand_id, year_released) SELECT '${esc(r.name)}', id, ${r.year_released ?? 'NULL'} FROM device_brands WHERE name = '${esc(r.brand_name)}' LIMIT 1;`);
        } else {
          lines.push(`INSERT OR IGNORE INTO device_models (name, year_released) VALUES ('${esc(r.name)}', ${r.year_released ?? 'NULL'});`);
        }
      });

      const sql = lines.join('\n');
      setSeedSql(sql);
      setSeedVisible(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not export seed data.');
    }
  };

  const RESET_OPTIONS: { key: typeof confirmType; label: string; icon: string; desc: string; danger: boolean }[] = [
    { key: 'customers',  label: 'Reset Customers',  icon: 'account-group-outline',      desc: 'Delete all customers & linked records',    danger: false },
    { key: 'repairs',    label: 'Reset Repairs',    icon: 'wrench-outline',              desc: 'Delete all repair records',                danger: false },
    { key: 'stocks',     label: 'Reset Stocks',     icon: 'package-variant',             desc: 'Delete all parts & stock history',          danger: false },
    { key: 'devices',    label: 'Reset Devices',    icon: 'cellphone-off',               desc: 'Delete all device sale/purchase records',   danger: false },
    { key: 'suppliers',  label: 'Reset Suppliers',  icon: 'truck-delivery-outline',      desc: 'Delete all supplier records',               danger: false },
    { key: 'cotechs',    label: 'Reset Co-Techs',   icon: 'account-hard-hat-outline',    desc: 'Delete all co-technician records',          danger: false },
    { key: 'all',        label: 'Reset All Data',   icon: 'delete-sweep-outline',        desc: 'Delete everything, keep initial values',    danger: true },
  ];

  const CONFIRM_CONFIG = {
    customers: {
      title: 'Reset Customers',
      message: 'This will permanently delete ALL customers, repairs, payments, invoices, and device records. This cannot be undone.',
      action: resetCustomers,
    },
    repairs: {
      title: 'Reset Repairs',
      message: 'This will permanently delete ALL repair records including notes, payments, and photos. This cannot be undone.',
      action: resetRepairs,
    },
    devices: {
      title: 'Reset Devices',
      message: 'This will permanently delete ALL device sale and purchase records. This cannot be undone.',
      action: resetDevices,
    },
    stocks: {
      title: 'Reset Stocks',
      message: 'This will permanently delete ALL parts, stock history, and purchase records. This cannot be undone.',
      action: resetStocks,
    },
    suppliers: {
      title: 'Reset Suppliers',
      message: 'This will permanently delete ALL supplier records. This cannot be undone.',
      action: resetSuppliers,
    },
    cotechs: {
      title: 'Reset Co-Techs',
      message: 'This will permanently delete ALL co-technician records. This cannot be undone.',
      action: resetCoTechs,
    },
    all: {
      title: 'Reset All Data',
      message: 'This will permanently delete ALL repairs, customers, devices, parts, invoices, payments, and shop information.\n\nInitial values (brands, categories, issues) will be kept. This cannot be undone.',
      action: resetAll,
    },
  };

  const handleConfirm = async () => {
    if (!confirmType) return;
    await CONFIRM_CONFIG[confirmType].action();
    setConfirmType(null);
    Alert.alert('Done', 'Data has been cleared.');
  };

  return (
    <ScrollView style={styles.container}>

      {/* Upgrade to Pro item (hidden if already Pro) */}
      {!license.isPro && (
        <List.Section>
          <List.Item
            title={license.isExpired ? 'Trial Expired — Upgrade to Pro' : `Upgrade to Pro · ${license.hoursLeft}h trial left`}
            description="Unlock unlimited repairs, backup, invoices & more"
            titleStyle={{ color: '#F59E0B', fontWeight: '800' }}
            left={props => <List.Icon {...props} icon="crown" color="#F59E0B" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('License')}
            style={[styles.item, { borderWidth: 1.5, borderColor: '#F59E0B' }]}
          />
        </List.Section>
      )}

      <List.Section>
        <List.Subheader style={styles.subheader}>Settings</List.Subheader>
        <List.Item
          title="Technician Information"
          description="Full name, phone, shop name, and location"
          left={props => <List.Icon {...props} icon="account-wrench-outline" color={Colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('ShopInfo')}
          style={styles.item}
        />
        <List.Item
          title="Backup Data"
          description="Export your database for safekeeping"
          left={props => <List.Icon {...props} icon="database-export" color={Colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Backup')}
          style={styles.item}
        />
        {license.isPro && <List.Item
          title="Export Seed Data"
          description="Save current brands, models, categories & issues as initial data"
          left={props => <List.Icon {...props} icon="database-cog-outline" color={Colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleExportSeed}
          style={styles.item}
        />}
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader style={styles.subheader}>Manage</List.Subheader>
        <List.Item
          title="Brands"
          description="Add, edit or delete device brands"
          left={props => <List.Icon {...props} icon="cellphone" color={Colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('DeviceBrandList')}
          style={styles.item}
        />
        <List.Item
          title="Models"
          description="Add, edit or delete device models"
          left={props => <List.Icon {...props} icon="cellphone-cog" color={Colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('DeviceModelList')}
          style={styles.item}
        />
        <List.Item
          title="Problems & Issues"
          description="Add, edit or delete repair issue types"
          left={props => <List.Icon {...props} icon="wrench-outline" color={Colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('IssueList')}
          style={styles.item}
        />
        <List.Item
          title="Categories"
          description="Add, edit or delete part categories"
          left={props => <List.Icon {...props} icon="tag-multiple-outline" color={Colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('CategoryList')}
          style={styles.item}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Item
          title="Reset Data"
          description="Clear specific data or everything"
          titleStyle={styles.dangerText}
          left={props => <List.Icon {...props} icon="delete-sweep-outline" color={Colors.error} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setResetMenuVisible(true)}
          style={[styles.item, { borderWidth: 1, borderColor: Colors.error + '40' }]}
        />
      </List.Section>

      {/* Reset selection modal */}
      <Portal>
        <Modal visible={resetMenuVisible} onDismiss={() => setResetMenuVisible(false)} contentContainerStyle={styles.resetModal}>
          <Text style={styles.resetModalTitle}>Reset Data</Text>
          <Text style={styles.resetModalSub}>Choose what to clear. This cannot be undone.</Text>
          <View style={styles.resetOptions}>
            {RESET_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.resetOption, opt.danger && styles.resetOptionDanger]}
                onPress={() => { setResetMenuVisible(false); setConfirmType(opt.key); }}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons
                  name={opt.icon as any}
                  size={22}
                  color={opt.danger ? Colors.error : Colors.text}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resetOptionLabel, opt.danger && { color: Colors.error, fontWeight: '800' }]}>{opt.label}</Text>
                  <Text style={styles.resetOptionDesc}>{opt.desc}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={opt.danger ? Colors.error : Colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </Modal>
      </Portal>

      {confirmType && (
        <ConfirmDialog
          visible
          title={CONFIRM_CONFIG[confirmType].title}
          message={CONFIRM_CONFIG[confirmType].message}
          confirmLabel="Delete"
          destructive
          onConfirm={handleConfirm}
          onDismiss={() => setConfirmType(null)}
        />
      )}

      {/* Seed SQL modal */}
      <Portal>
        <Modal visible={seedVisible} onDismiss={() => setSeedVisible(false)} contentContainerStyle={styles.seedModal}>
          <Text style={styles.seedTitle}>Seed Data SQL</Text>
          <Text style={styles.seedDesc}>Copy this SQL and send it to your developer to add as initial migration data.</Text>
          <ScrollView style={styles.seedScroll} showsVerticalScrollIndicator>
            <Text style={styles.seedCode} selectable>{seedSql}</Text>
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Button mode="outlined" onPress={() => setSeedVisible(false)} style={{ flex: 1 }}>Close</Button>
            <Button mode="contained" icon="content-copy" onPress={() => {
              Clipboard.setString(seedSql);
              Alert.alert('Copied', 'SQL copied to clipboard.');
            }} style={{ flex: 1 }}>Copy All</Button>
          </View>
        </Modal>
      </Portal>

      {/* App version footer */}
      <View style={styles.versionFooter}>
        <Text style={styles.versionText}>
          Repair Tracker
        </Text>
        <Text style={styles.versionNumber}>
          Version {Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:genesiscruz.dev@gmail.com')}>
          <Text style={styles.developerText}>Developer: genesiscruz.dev@gmail.com</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  item: {
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  dangerHeader: { color: Colors.error, fontWeight: '700' },
  dangerText: { color: Colors.error, fontWeight: '700' },
  // Reset modal
  resetModal: { backgroundColor: Colors.surface, margin: 20, borderRadius: 16, padding: 20 },
  resetModalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  resetModalSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  resetOptions: { gap: 4 },
  resetOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: Colors.background },
  resetOptionDanger: { backgroundColor: Colors.error + '08', borderWidth: 1, borderColor: Colors.error + '30' },
  resetOptionLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  resetOptionDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  seedModal: { backgroundColor: Colors.surface, margin: 16, borderRadius: 14, padding: 20, maxHeight: '85%' },
  seedTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  seedDesc: { fontSize: 12, color: Colors.textSecondary, marginBottom: 10, lineHeight: 18 },
  seedScroll: { backgroundColor: '#1e1e1e', borderRadius: 8, maxHeight: 320, padding: 10 },
  seedCode: { fontSize: 11, color: '#d4d4d4', fontFamily: 'monospace', lineHeight: 18 },
  versionFooter: { alignItems: 'center', paddingVertical: 28 },
  versionText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  versionNumber: { fontSize: 12, color: Colors.border, marginTop: 4, letterSpacing: 0.5 },
  developerText: { fontSize: 11, color: Colors.textSecondary, marginTop: 8 },
  subheader: { fontSize: 11, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.8 },
});
