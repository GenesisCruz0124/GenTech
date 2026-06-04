import React, { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getAllSettings, setSetting } from '../../repositories/settingsRepository';
import { Colors } from '../../constants/colors';

const SECTIONS = [
  {
    title: 'Technician Information',
    icon: 'account-wrench-outline',
    fields: [
      { key: 'owner_name',   label: 'Full Name',     icon: 'account-outline',  keyboard: 'default' as const },
      { key: 'owner_phone',  label: 'Phone Number',  icon: 'phone-outline',    keyboard: 'phone-pad' as const },
      { key: 'shop_name',    label: 'Shop Name',     icon: 'store-outline',    keyboard: 'default' as const },
      { key: 'shop_address', label: 'Location',      icon: 'map-marker-outline', multiline: true },
    ],
  },
];

const ALL_KEYS = SECTIONS.flatMap(s => s.fields.map(f => f.key));

export default function ShopInfoScreen() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useFocusEffect(useCallback(() => {
    getAllSettings().then(loaded => {
      setValues(prev => ({ ...loaded, ...prev }));
    }).catch(() => {});
  }, []));

  const set = (key: string, val: string) =>
    setValues(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const key of ALL_KEYS) {
        await setSetting(key, values[key] ?? '');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      Alert.alert('Error', `Could not save: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {SECTIONS.map(section => (
          <View key={section.title} style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name={section.icon as any} size={17} color={Colors.primary} />
              <Text style={styles.cardTitle}>{section.title}</Text>
            </View>

            {section.fields.map((field, idx) => (
              <View key={field.key} style={[styles.fieldRow, idx < section.fields.length - 1 && styles.fieldBorder]}>
                <View style={styles.fieldIcon}>
                  <MaterialCommunityIcons name={field.icon as any} size={18} color={Colors.textSecondary} />
                </View>
                <TextInput
                  label={field.label}
                  value={values[field.key] ?? ''}
                  onChangeText={val => set(field.key, val)}
                  mode="flat"
                  style={styles.fieldInput}
                  underlineColor="transparent"
                  activeUnderlineColor={Colors.primary}
                  keyboardType={field.keyboard ?? 'default'}
                  autoCapitalize={(field as any).lower ? 'none' : 'words'}
                  multiline={field.multiline}
                  numberOfLines={field.multiline ? 3 : 1}
                />
              </View>
            ))}
          </View>
        ))}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          icon={saved ? 'check' : 'content-save-outline'}
          style={styles.saveBtn}
          contentStyle={styles.saveBtnContent}
        >
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 14, paddingBottom: 40, gap: 12 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primary + '08',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.6 },

  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12 },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  fieldIcon: { width: 36, alignItems: 'center', paddingTop: 16 },
  fieldInput: { flex: 1, backgroundColor: 'transparent', fontSize: 15 },

  saveBtn: { borderRadius: 12 },
  saveBtnContent: { paddingVertical: 6 },
});
