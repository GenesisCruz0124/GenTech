import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export async function shareInvoicePDF(pdfUri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    Alert.alert('Sharing not available', 'Your device does not support file sharing.');
    return;
  }
  await Sharing.shareAsync(pdfUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share Invoice',
    UTI: 'com.adobe.pdf',
  });
}
