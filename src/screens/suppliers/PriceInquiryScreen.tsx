import React, { useCallback, useState } from 'react';
import { Alert, Clipboard, FlatList, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Button, Divider, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getAllSuppliers, Supplier } from '../../repositories/supplierRepository';
import { Colors } from '../../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

function openMessenger(fb: string) {
  const username = fb.replace(/^(https?:\/\/)?(www\.)?(facebook\.com|fb\.com|m\.me)\//i, '').replace(/\/$/, '');
  Linking.openURL(`https://m.me/${username}`).catch(() =>
    Linking.openURL(`https://www.facebook.com/${username}`)
  );
}

function openWhatsApp(phone: string, message: string) {
  const clean = phone.replace(/\D/g, '');
  const intl = clean.startsWith('63') ? clean : clean.startsWith('0') ? '63' + clean.slice(1) : '63' + clean;
  Linking.openURL(`https://wa.me/${intl}?text=${encodeURIComponent(message)}`).catch(() =>
    Alert.alert('WhatsApp not available', 'Could not open WhatsApp.')
  );
}

export default function PriceInquiryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [item, setItem] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sentTo, setSentTo] = useState<Set<number>>(new Set());

  useFocusEffect(useCallback(() => {
    getAllSuppliers().then(all => {
      setSuppliers(all.filter(s => s.facebook || s.phone));
    });
  }, []));

  const message = item.trim()
    ? `Hi po, tanong lang — magkano ang ${item.trim()}? 🙏`
    : '';

  const copyMessage = () => {
    if (!message) return;
    Clipboard.setString(message);
    Alert.alert('Copied!', 'Message copied to clipboard.\nPaste it in Messenger.');
  };

  const handleSend = (supplier: Supplier, via: 'messenger' | 'whatsapp') => {
    if (!message) {
      Alert.alert('Empty inquiry', 'Please type what you are looking for first.');
      return;
    }
    Clipboard.setString(message);
    if (via === 'messenger' && supplier.facebook) {
      openMessenger(supplier.facebook);
    } else if (via === 'whatsapp' && supplier.phone) {
      openWhatsApp(supplier.phone, message);
    }
    setSentTo(prev => new Set([...prev, supplier.id]));
  };

  const hasFb = suppliers.filter(s => s.facebook).length;
  const hasWa = suppliers.filter(s => s.phone).length;

  return (
    <View style={styles.container}>

      {/* Compose */}
      <View style={styles.composeCard}>
        <Text style={styles.composeLabel}>What are you looking for?</Text>
        <TextInput
          mode="outlined"
          placeholder="e.g. iPhone 11 LCD, Samsung A54 Battery..."
          value={item}
          onChangeText={setItem}
          style={styles.input}
          autoFocus
        />
        {item.trim() ? (
          <TouchableOpacity
            style={styles.shopeeBtn}
            onPress={() => Linking.openURL(
              `https://shopee.ph/search?keyword=${encodeURIComponent(item.trim())}`
            )}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="shopping" size={18} color="#fff" />
            <Text style={styles.shopeeBtnText}>Search "{item.trim()}" on Shopee PH</Text>
            <MaterialCommunityIcons name="open-in-new" size={14} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        ) : null}

        {message ? (
          <TouchableOpacity style={styles.previewBox} onPress={copyMessage} activeOpacity={0.8}>
            <Text style={styles.previewText}>"{message}"</Text>
            <View style={styles.copyRow}>
              <MaterialCommunityIcons name="content-copy" size={14} color={Colors.primary} />
              <Text style={styles.copyHint}>Tap to copy · paste in Messenger</Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Stats */}
      {suppliers.length > 0 && (
        <View style={styles.statsRow}>
          <MaterialCommunityIcons name="facebook-messenger" size={14} color="#0084FF" />
          <Text style={styles.statText}>{hasFb} Messenger</Text>
          <Text style={styles.statSep}>·</Text>
          <MaterialCommunityIcons name="whatsapp" size={14} color="#25D366" />
          <Text style={styles.statText}>{hasWa} WhatsApp</Text>
        </View>
      )}

      {/* Supplier list */}
      <FlatList
        data={suppliers}
        keyExtractor={s => String(s.id)}
        ItemSeparatorComponent={() => <Divider />}
        contentContainerStyle={suppliers.length === 0 ? styles.emptyWrap : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-off-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>No suppliers with Messenger or WhatsApp.</Text>
            <Text style={styles.emptyHint}>Add Facebook or Phone to your suppliers first.</Text>
          </View>
        }
        renderItem={({ item: supplier }) => {
          const done = sentTo.has(supplier.id);
          return (
            <View style={[styles.supplierRow, done && styles.supplierRowDone]}>
              <Avatar.Text
                size={38}
                label={supplier.name.charAt(0).toUpperCase()}
                style={[styles.avatar, done && { backgroundColor: Colors.success }]}
                labelStyle={{ fontSize: 16, fontWeight: '800', color: '#fff' }}
              />
              <View style={styles.supplierInfo}>
                <Text style={styles.supplierName}>{supplier.name}</Text>
                {supplier.phone ? <Text style={styles.supplierMeta}>{supplier.phone}</Text> : null}
                {done && <Text style={styles.sentLabel}>✓ Inquiry sent</Text>}
              </View>
              <View style={styles.btnGroup}>
                {supplier.facebook ? (
                  <TouchableOpacity
                    style={[styles.iconBtn, styles.iconBtnFb]}
                    onPress={() => handleSend(supplier, 'messenger')}
                  >
                    <MaterialCommunityIcons name="facebook-messenger" size={20} color="#fff" />
                  </TouchableOpacity>
                ) : null}
                {supplier.phone ? (
                  <TouchableOpacity
                    style={[styles.iconBtn, styles.iconBtnWa]}
                    onPress={() => handleSend(supplier, 'whatsapp')}
                  >
                    <MaterialCommunityIcons name="whatsapp" size={20} color="#fff" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        }}
      />

      {/* Footer */}
      {suppliers.length > 0 && message ? (
        <View style={styles.footer}>
          <Button
            mode="outlined"
            icon="content-copy"
            onPress={copyMessage}
            style={styles.footerBtn}
            compact
          >
            Copy
          </Button>
          <Button
            mode="contained"
            icon="send-outline"
            onPress={() => {
              copyMessage();
              Alert.alert(
                'Message Copied!',
                `Open each supplier's Messenger or WhatsApp and paste:\n\n"${message}"`,
                [{ text: 'OK' }]
              );
            }}
            style={[styles.footerBtn, { flex: 2 }]}
          >
            Send to All ({suppliers.length})
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  composeCard: { backgroundColor: Colors.surface, margin: 12, borderRadius: 14, padding: 16, elevation: 2 },
  composeLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  input: { backgroundColor: Colors.surface },
  shopeeBtn: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EE4D2D', borderRadius: 10, padding: 12 },
  shopeeBtnText: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 13 },
  previewBox: { marginTop: 10, backgroundColor: Colors.primary + '10', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.primary + '30' },
  previewText: { fontSize: 14, color: Colors.text, lineHeight: 20, fontStyle: 'italic' },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  copyHint: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingBottom: 6 },
  statText: { fontSize: 12, color: Colors.textSecondary },
  statSep: { color: Colors.border, marginHorizontal: 4 },
  list: { paddingBottom: 90 },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  emptyHint: { fontSize: 13, color: Colors.border, textAlign: 'center' },
  supplierRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.surface, gap: 12 },
  supplierRowDone: { backgroundColor: Colors.success + '08' },
  avatar: { backgroundColor: Colors.primary },
  supplierInfo: { flex: 1 },
  supplierName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  supplierMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  sentLabel: { fontSize: 11, color: Colors.success, fontWeight: '700', marginTop: 2 },
  btnGroup: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  iconBtnFb: { backgroundColor: '#0084FF' },
  iconBtnWa: { backgroundColor: '#25D366' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 8, padding: 12, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, elevation: 8 },
  footerBtn: { flex: 1, borderRadius: 10 },
});
