import React, { useCallback, useState } from 'react';
import { Alert, Clipboard, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Divider, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getAllParts, Part } from '../../repositories/partsRepository';
import { getSetting } from '../../repositories/settingsRepository';
import { Colors } from '../../constants/colors';
import { formatCurrency } from '../../utils/formatters';

interface QuoteItem {
  part: Part;
  qty: number;
  price: number;
}

export default function QuotationScreen() {
  const [parts, setParts] = useState<Part[]>([]);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [labor, setLabor] = useState('');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [shopName, setShopName] = useState('GenTech Repair');
  const [shopPhone, setShopPhone] = useState('');

  useFocusEffect(useCallback(() => {
    getAllParts().then(setParts);
    getSetting('shop_name').then(n => { if (n) setShopName(n); }).catch(() => {});
    getSetting('owner_phone').then(p => { if (p) setShopPhone(p); }).catch(() => {});
  }, []));

  const filtered = parts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const addItem = (part: Part) => {
    setItems(prev => {
      const exists = prev.find(i => i.part.id === part.id);
      if (exists) return prev.map(i => i.part.id === part.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { part, qty: 1, price: part.selling_price || part.cost_price }];
    });
    setShowSearch(false);
    setSearch('');
  };

  const removeItem = (partId: number) => setItems(prev => prev.filter(i => i.part.id !== partId));
  const updateQty = (partId: number, qty: number) => {
    if (qty <= 0) { removeItem(partId); return; }
    setItems(prev => prev.map(i => i.part.id === partId ? { ...i, qty } : i));
  };
  const updatePrice = (partId: number, price: string) =>
    setItems(prev => prev.map(i => i.part.id === partId ? { ...i, price: parseFloat(price) || 0 } : i));

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const laborAmt = parseFloat(labor) || 0;
  const discountAmt = parseFloat(discount) || 0;
  const total = subtotal + laborAmt - discountAmt;

  const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  const buildQuoteText = () => {
    const lines: string[] = [];
    lines.push(`📋 *PRICE QUOTATION*`);
    lines.push(`🏪 ${shopName}${shopPhone ? ` | ${shopPhone}` : ''}`);
    lines.push(`📅 ${today}`);
    if (customerName.trim()) lines.push(`👤 Customer: ${customerName.trim()}`);
    lines.push('');
    lines.push('─────────────────────────');
    lines.push('*Parts / Services:*');
    items.forEach(i => {
      lines.push(`• ${i.part.name} x${i.qty} — ${formatCurrency(i.qty * i.price)}`);
    });
    if (laborAmt > 0) lines.push(`• Labor — ${formatCurrency(laborAmt)}`);
    lines.push('─────────────────────────');
    if (discountAmt > 0) {
      lines.push(`Subtotal: ${formatCurrency(subtotal + laborAmt)}`);
      lines.push(`Discount: -${formatCurrency(discountAmt)}`);
    }
    lines.push(`*TOTAL: ${formatCurrency(total)}*`);
    if (notes.trim()) { lines.push(''); lines.push(`📝 ${notes.trim()}`); }
    lines.push('');
    lines.push('_This is an estimate. Final price may vary._');
    return lines.join('\n');
  };

  const handleCopy = () => {
    if (items.length === 0) { Alert.alert('Empty', 'Add at least one item first.'); return; }
    const text = buildQuoteText();
    Clipboard.setString(text);
    Alert.alert('Copied! 📋', 'Quotation copied. Paste it in WhatsApp or any app.');
  };

  const handleReset = () => {
    Alert.alert('New Quote', 'Clear everything and start a new quotation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { setItems([]); setCustomerName(''); setLabor(''); setDiscount(''); setNotes(''); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Customer */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Customer (optional)</Text>
          <TextInput mode="outlined" label="Customer name" value={customerName}
            onChangeText={setCustomerName} style={styles.input} dense />
        </View>

        {/* Items */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>Items</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowSearch(v => !v)}>
              <MaterialCommunityIcons name={showSearch ? 'close' : 'plus'} size={18} color="#fff" />
              <Text style={styles.addBtnText}>{showSearch ? 'Close' : 'Add Part'}</Text>
            </TouchableOpacity>
          </View>

          {showSearch && (
            <View style={styles.searchWrap}>
              <TextInput mode="outlined" label="Search parts..." value={search}
                onChangeText={setSearch} style={styles.input} dense autoFocus />
              {filtered.slice(0, 8).map(p => (
                <TouchableOpacity key={p.id} style={styles.searchItem} onPress={() => addItem(p)}>
                  <Text style={styles.searchName}>{p.name}</Text>
                  <Text style={styles.searchPrice}>{formatCurrency(p.selling_price || p.cost_price)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {items.length === 0 ? (
            <Text style={styles.emptyItems}>No items yet. Tap + Add Part.</Text>
          ) : (
            items.map(item => (
              <View key={item.part.id} style={styles.itemRow}>
                <View style={styles.itemName}>
                  <Text style={styles.itemNameText} numberOfLines={1}>{item.part.name}</Text>
                </View>
                <View style={styles.itemControls}>
                  <TouchableOpacity onPress={() => updateQty(item.part.id, item.qty - 1)} style={styles.qtyBtn}>
                    <MaterialCommunityIcons name="minus" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.qty}>{item.qty}</Text>
                  <TouchableOpacity onPress={() => updateQty(item.part.id, item.qty + 1)} style={styles.qtyBtn}>
                    <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                  <TextInput mode="flat" value={String(item.price)} keyboardType="decimal-pad"
                    onChangeText={v => updatePrice(item.part.id, v)}
                    style={styles.priceInput} dense underlineColor="transparent"
                    activeUnderlineColor={Colors.primary} />
                  <TouchableOpacity onPress={() => removeItem(item.part.id)}>
                    <MaterialCommunityIcons name="close" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.itemTotal}>{formatCurrency(item.qty * item.price)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Costs */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Additional Costs</Text>
          <View style={styles.costRow}>
            <TextInput mode="outlined" label="Labor (₱)" value={labor} onChangeText={setLabor}
              keyboardType="decimal-pad" style={[styles.input, { flex: 1 }]} dense />
            <TextInput mode="outlined" label="Discount (₱)" value={discount} onChangeText={setDiscount}
              keyboardType="decimal-pad" style={[styles.input, { flex: 1 }]} dense />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Notes (optional)</Text>
          <TextInput mode="outlined" label="e.g. Warranty 30 days, DP required..."
            value={notes} onChangeText={setNotes} style={styles.input} multiline numberOfLines={2} />
        </View>

        {/* Total */}
        {items.length > 0 && (
          <View style={styles.totalCard}>
            {(laborAmt > 0 || discountAmt > 0) && (
              <>
                <View style={styles.totalRow}><Text style={styles.totalLabel}>Parts</Text><Text style={styles.totalVal}>{formatCurrency(subtotal)}</Text></View>
                {laborAmt > 0 && <View style={styles.totalRow}><Text style={styles.totalLabel}>Labor</Text><Text style={styles.totalVal}>{formatCurrency(laborAmt)}</Text></View>}
                {discountAmt > 0 && <View style={styles.totalRow}><Text style={styles.totalLabel}>Discount</Text><Text style={[styles.totalVal, { color: Colors.success }]}>-{formatCurrency(discountAmt)}</Text></View>}
                <Divider style={{ marginVertical: 8 }} />
              </>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.grandLabel}>TOTAL</Text>
              <Text style={styles.grandVal}>{formatCurrency(total)}</Text>
            </View>
          </View>
        )}

        {/* Preview */}
        {items.length > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>📋 Quote Preview</Text>
            <Text style={styles.previewText}>{buildQuoteText()}</Text>
          </View>
        )}

      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button mode="outlined" icon="refresh" onPress={handleReset} style={styles.footerBtn} compact>New</Button>
        <Button mode="contained" icon="content-copy" onPress={handleCopy}
          style={[styles.footerBtn, { flex: 2 }]} disabled={items.length === 0}>
          Copy Quote
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  content: { padding: 12, paddingBottom: 90, gap: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, elevation: 2 },
  cardLabel: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  searchWrap: { marginBottom: 8 },
  searchItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchName: { fontSize: 13, color: Colors.text, flex: 1 },
  searchPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  emptyItems: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 12, fontStyle: 'italic' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  itemName: { flex: 1 },
  itemNameText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  itemControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 14, fontWeight: '700', color: Colors.text, minWidth: 20, textAlign: 'center' },
  priceInput: { width: 72, backgroundColor: Colors.background, fontSize: 13, height: 32 },
  itemTotal: { fontSize: 13, fontWeight: '700', color: Colors.primary, minWidth: 64, textAlign: 'right' },
  costRow: { flexDirection: 'row', gap: 10 },
  input: { backgroundColor: Colors.surface, marginBottom: 4 },
  totalCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, elevation: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: 13, color: Colors.textSecondary },
  totalVal: { fontSize: 13, fontWeight: '600', color: Colors.text },
  grandLabel: { fontSize: 16, fontWeight: '800', color: Colors.text },
  grandVal: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  previewCard: { backgroundColor: '#1E1E2E', borderRadius: 14, padding: 14 },
  previewTitle: { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  previewText: { fontSize: 12, color: '#D4D4D4', lineHeight: 20, fontFamily: 'monospace' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 12, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, elevation: 8 },
  footerBtn: { flex: 1, borderRadius: 10 },
});
