import React, { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getAllSettings, setSetting } from '../../repositories/settingsRepository';
import { Colors } from '../../constants/colors';

const FIELDS = [
  { section: 'Shop Information', items: [
    { key: 'shop_name',    label: 'Shop Name' },
    { key: 'shop_address', label: 'Address', multiline: true },
  ]},
  { section: 'Personal Information', items: [
    { key: 'owner_name',     label: 'Full Name' },
    { key: 'owner_email',    label: 'Email Address', keyboard: 'email-address' as const, lower: true },
    { key: 'owner_phone',    label: 'Phone Number', keyboard: 'phone-pad' as const },
    { key: 'signed_in_date', label: 'Signed in Date', placeholder: 'e.g. January 1, 2025' },
    { key: 'renewal_date',   label: 'Date Renewal',   placeholder: 'e.g. January 1, 2026' },
  ]},
];

// All keys defined in the form
const ALL_KEYS = FIELDS.flatMap(s => s.items.map(i => i.key));

export default function ShopInfoScreen() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useFocusEffect(useCallback(() => {
    getAllSettings().then(loaded => {
      // Merge loaded values — keep any in-state values already typed
      setValues(prev => ({ ...loaded, ...prev }));
    }).catch(() => {});
  }, []));

  const set = (key: string, val: string) =>
    setValues(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save every defined field key (even if empty string)
      for (const key of ALL_KEYS) {
        await setSetting(key, values[key] ?? '');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      Alert.alert('Error', `Could not save settings: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {FIELDS.map(({ section, items }) => (
          <View key={section}>
            <Text style={styles.section}>{section}</Text>
            {items.map(field => (
              <TextInput
                key={field.key}
                label={field.label}
                value={values[field.key] ?? ''}
                onChangeText={val => set(field.key, val)}
                mode="outlined"
                style={styles.input}
                keyboardType={field.keyboard ?? 'default'}
                autoCapitalize={field.lower ? 'none' : 'words'}
                multiline={field.multiline}
                numberOfLines={field.multiline ? 3 : 1}
                placeholder={field.placeholder}
              />
            ))}
            <Divider style={styles.divider} />
          </View>
        ))}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.button}
          contentStyle={styles.buttonContent}
          icon={saved ? 'check' : undefined}
        >
          {saved ? 'Saved!' : 'Save'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 16, paddingBottom: 32 },
  section: { fontSize: 13, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  input: { marginBottom: 10, backgroundColor: Colors.surface },
  divider: { marginBottom: 16 },
  button: { borderRadius: 8 },
  buttonContent: { paddingVertical: 6 },
});
