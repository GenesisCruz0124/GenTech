import React, { useState } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'ShopeeSearch'>;

const QUICK_SEARCHES = [
  { label: 'iPhone LCD',    query: 'iphone lcd screen' },
  { label: 'Samsung LCD',   query: 'samsung lcd screen' },
  { label: 'Battery',       query: 'phone battery replacement' },
  { label: 'Charging Port', query: 'phone charging port repair' },
  { label: 'Back Glass',    query: 'phone back glass' },
  { label: 'Camera Lens',   query: 'phone camera lens' },
];

export default function ShopeeSearchScreen({ route }: Props) {
  const { query: initialQuery = '', storeUrl } = route.params ?? {};
  const [query, setQuery] = useState(initialQuery);

  const open = (url: string) => Linking.openURL(url);
  const searchUrl = (q: string) => `https://shopee.ph/search?keyword=${encodeURIComponent(q.trim())}`;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="shopping" size={16} color="#EE4D2D" />
            <Text style={styles.badgeText}>Shopee PH</Text>
          </View>
          <TextInput mode="outlined" value={query} onChangeText={setQuery}
            placeholder="e.g. iPhone 11 LCD..." style={styles.input} dense
            onSubmitEditing={() => query.trim() && open(storeUrl ? (storeUrl.startsWith('http') ? storeUrl : `https://${storeUrl}`) : searchUrl(query))}
            returnKeyType="search" autoFocus={!storeUrl} />
        </View>
        <Button mode="contained" icon="open-in-new" buttonColor="#EE4D2D"
          contentStyle={{ paddingVertical: 4 }} style={styles.btn}
          onPress={() => open(storeUrl ? (storeUrl.startsWith('http') ? storeUrl : `https://${storeUrl}`) : searchUrl(query))}
          disabled={!query.trim() && !storeUrl}>
          {storeUrl ? 'Open Supplier Store' : 'Search on Shopee PH'}
        </Button>
        <Text style={styles.hint}>Opens in your browser</Text>
      </View>

      {!storeUrl && (
        <>
          <Text style={styles.sectionLabel}>Quick Searches</Text>
          <View style={styles.grid}>
            {QUICK_SEARCHES.map(s => (
              <TouchableOpacity key={s.query} style={styles.chip}
                onPress={() => { setQuery(s.query); open(searchUrl(s.query)); }}>
                <MaterialCommunityIcons name="shopping-outline" size={13} color="#EE4D2D" />
                <Text style={styles.chipText}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7', padding: 14, gap: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, elevation: 2, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF0ED', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#EE4D2D' },
  input: { flex: 1, backgroundColor: Colors.surface },
  btn: { borderRadius: 10 },
  hint: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#EE4D2D40', elevation: 1 },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.text },
});
