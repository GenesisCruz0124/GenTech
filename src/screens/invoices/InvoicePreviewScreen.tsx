import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, Divider } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { getRepairById } from '../../repositories/repairRepository';
import { getRepairParts } from '../../repositories/partsRepository';
import { getDeviceSaleById } from '../../repositories/deviceSaleRepository';
import { createInvoice, updateInvoicePdfUri, markInvoiceShared, getInvoiceById } from '../../repositories/invoiceRepository';
import { buildInvoiceHtml } from '../../utils/invoiceHtmlTemplate';
import { generateInvoicePDF } from '../../services/pdfService';
import { shareInvoicePDF } from '../../services/shareService';
import { Colors } from '../../constants/colors';
import { formatCurrency, formatDate } from '../../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'InvoicePreview'>;

export default function InvoicePreviewScreen({ route }: Props) {
  const { invoiceId: refId, type } = route.params;
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [savedInvoiceId, setSavedInvoiceId] = useState<number | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    if (type === 'repair') {
      const repair = await getRepairById(refId);
      const parts = await getRepairParts(refId);
      if (repair) {
        const partsTotal = parts.reduce((s, p) => s + p.unit_price * p.quantity, 0);
        const laborCost = (repair.final_cost ?? repair.estimated_cost) - partsTotal;
        setInvoiceData({
          customer_name: repair.customer_name,
          customer_phone: repair.customer_phone,
          customer_id: repair.customer_id,
          device_model: repair.device_model,
          issue_desc: repair.issue_desc,
          parts,
          labor_cost: laborCost > 0 ? laborCost : undefined,
          total_amount: repair.final_cost ?? repair.estimated_cost,
          notes: repair.notes,
          type: 'repair',
        });
      }
    } else {
      const sale = await getDeviceSaleById(refId);
      if (sale) {
        setInvoiceData({
          customer_name: sale.customer_name,
          customer_phone: sale.customer_phone,
          customer_id: sale.customer_id,
          device_model: `${sale.device_name} ${sale.device_model}`,
          parts: [{ name: `${sale.device_name} ${sale.device_model}${sale.imei ? ` (IMEI: ${sale.imei})` : ''}`, quantity: 1, unit_price: sale.sale_price }],
          total_amount: sale.sale_price,
          notes: sale.notes,
          type: 'device_sale',
        });
      }
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!invoiceData) return;
    setGenerating(true);
    try {
      const { id, invoice_no } = await createInvoice({
        type,
        ref_id: refId,
        customer_id: invoiceData.customer_id,
        total_amount: invoiceData.total_amount,
      });
      const html = buildInvoiceHtml({ ...invoiceData, invoice_no, created_at: new Date().toISOString() });
      const uri = await generateInvoicePDF(html, invoice_no);
      await updateInvoicePdfUri(id, uri);
      setSavedInvoiceId(id);
      setPdfUri(uri);
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!pdfUri) return;
    setSharing(true);
    try {
      await shareInvoicePDF(pdfUri);
      if (savedInvoiceId) await markInvoiceShared(savedInvoiceId);
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!invoiceData) {
    return <View style={styles.center}><Text>Record not found.</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.preview}>
        <Text style={styles.shopName}>GenTech Repair Shop</Text>
        <Text style={styles.shopSub}>Professional Device Repair &amp; Sales</Text>
        <Divider style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Customer</Text>
          <Text style={styles.value}>{invoiceData.customer_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{invoiceData.customer_phone}</Text>
        </View>
        {invoiceData.device_model && (
          <View style={styles.row}>
            <Text style={styles.label}>Device</Text>
            <Text style={styles.value}>{invoiceData.device_model}</Text>
          </View>
        )}
        {invoiceData.issue_desc && (
          <View style={styles.row}>
            <Text style={styles.label}>Issue</Text>
            <Text style={styles.value}>{invoiceData.issue_desc}</Text>
          </View>
        )}

        <Divider style={styles.divider} />

        {(invoiceData.parts ?? []).map((p: any, i: number) => (
          <View key={i} style={styles.partRow}>
            <Text style={styles.partName}>{p.name} × {p.quantity}</Text>
            <Text style={styles.partPrice}>{formatCurrency(p.unit_price * p.quantity)}</Text>
          </View>
        ))}
        {invoiceData.labor_cost && (
          <View style={styles.partRow}>
            <Text style={styles.partName}>Labor</Text>
            <Text style={styles.partPrice}>{formatCurrency(invoiceData.labor_cost)}</Text>
          </View>
        )}

        <Divider style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{formatCurrency(invoiceData.total_amount)}</Text>
        </View>
      </View>

      {!pdfUri ? (
        <Button mode="contained" icon="file-pdf-box" onPress={handleGenerate} loading={generating} disabled={generating} style={styles.btn} contentStyle={styles.btnContent}>
          Generate PDF Invoice
        </Button>
      ) : (
        <Button mode="contained" icon="whatsapp" onPress={handleShare} loading={sharing} disabled={sharing} style={[styles.btn, { backgroundColor: '#25D366' }]} contentStyle={styles.btnContent}>
          Share via WhatsApp
        </Button>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  preview: { backgroundColor: Colors.surface, borderRadius: 10, padding: 20, marginBottom: 16, elevation: 2 },
  shopName: { fontSize: 20, fontWeight: 'bold', color: Colors.primary, textAlign: 'center' },
  shopSub: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
  divider: { marginVertical: 12 },
  row: { flexDirection: 'row', marginBottom: 6 },
  label: { width: 80, fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  value: { flex: 1, fontSize: 13, color: Colors.text },
  partRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  partName: { fontSize: 14, color: Colors.text },
  partPrice: { fontSize: 14, color: Colors.textSecondary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
  btn: { borderRadius: 8 },
  btnContent: { paddingVertical: 6 },
});
