import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { List, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../constants/colors';
import { resetCustomers, resetRepairs, resetDevices, resetStocks } from '../../repositories/resetRepository';
import ConfirmDialog from '../../components/common/ConfirmDialog';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function MoreMenuScreen() {
  const navigation = useNavigation<Nav>();
  const [confirmType, setConfirmType] = useState<'customers' | 'repairs' | 'devices' | 'stocks' | null>(null);

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
  };

  const handleConfirm = async () => {
    if (!confirmType) return;
    await CONFIRM_CONFIG[confirmType].action();
    setConfirmType(null);
    Alert.alert('Done', 'Data has been cleared.');
  };

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        <List.Subheader>Settings</List.Subheader>
        <List.Item
          title="Shop Information"
          description="Shop name, address, and personal details"
          left={props => <List.Icon {...props} icon="store-outline" color={Colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('ShopInfo')}
          style={styles.item}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Business</List.Subheader>
        <List.Item
          title="Customer List"
          description="View all customers and their history"
          left={props => <List.Icon {...props} icon="account-group" color={Colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('CustomerList' as any)}
          style={styles.item}
        />
        <List.Item
          title="Staff"
          description="Manage staff members"
          left={props => <List.Icon {...props} icon="account-hard-hat" color={Colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('StaffList')}
          style={styles.item}
        />
        <List.Item
          title="Staff Performance"
          description="View repair stats per staff member"
          left={props => <List.Icon {...props} icon="chart-bar" color={Colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('StaffPerformance', {})}
          style={styles.item}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Parts</List.Subheader>
        <List.Item
          title="Part Categories"
          description="Add, edit or delete part categories"
          left={props => <List.Icon {...props} icon="tag-multiple-outline" color={Colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('CategoryList')}
          style={styles.item}
        />
        <List.Item
          title="Device Brands"
          description="Add, edit or delete device brands"
          left={props => <List.Icon {...props} icon="cellphone" color={Colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('DeviceBrandList')}
          style={styles.item}
        />
        <List.Item
          title="Issue List"
          description="Add, edit or delete repair issue types"
          left={props => <List.Icon {...props} icon="wrench-outline" color={Colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('IssueList')}
          style={styles.item}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Invoices</List.Subheader>
        <List.Item
          title="Invoice History"
          description="View and reshare past invoices"
          left={props => <List.Icon {...props} icon="receipt" color={Colors.primary} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('InvoiceHistory')}
          style={styles.item}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader style={styles.dangerHeader}>Reset Data</List.Subheader>
        <List.Item
          title="Reset Customers"
          description="Delete all customers, repairs, and devices"
          titleStyle={styles.dangerText}
          left={props => <List.Icon {...props} icon="account-remove-outline" color={Colors.error} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setConfirmType('customers')}
          style={styles.item}
        />
        <List.Item
          title="Reset Repairs"
          description="Delete all repair records"
          titleStyle={styles.dangerText}
          left={props => <List.Icon {...props} icon="close-circle-outline" color={Colors.error} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setConfirmType('repairs')}
          style={styles.item}
        />
        <List.Item
          title="Reset Devices"
          description="Delete all device sales and purchases"
          titleStyle={styles.dangerText}
          left={props => <List.Icon {...props} icon="cellphone-off" color={Colors.error} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setConfirmType('devices')}
          style={styles.item}
        />
        <List.Item
          title="Reset Stocks"
          description="Delete all parts, stock, and purchase history"
          titleStyle={styles.dangerText}
          left={props => <List.Icon {...props} icon="package-variant-remove" color={Colors.error} />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setConfirmType('stocks')}
          style={styles.item}
        />
      </List.Section>

      {confirmType && (
        <ConfirmDialog
          visible
          title={CONFIRM_CONFIG[confirmType].title}
          message={CONFIRM_CONFIG[confirmType].message}
          confirmLabel="Delete All"
          destructive
          onConfirm={handleConfirm}
          onDismiss={() => setConfirmType(null)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  item: { backgroundColor: Colors.surface, marginHorizontal: 12, marginVertical: 2, borderRadius: 8 },
  dangerHeader: { color: Colors.error },
  dangerText: { color: Colors.error },
});
