import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { Colors } from '../constants/colors';

import BottomTabNavigator from './BottomTabNavigator';
import NewRepairScreen from '../screens/repairs/NewRepairScreen';
import RepairDetailScreen from '../screens/repairs/RepairDetailScreen';
import PartFormScreen from '../screens/parts/PartFormScreen';
import RestockScreen from '../screens/parts/RestockScreen';
import BulkRestockScreen from '../screens/parts/BulkRestockScreen';
import CustomerListScreen from '../screens/customers/CustomerListScreen';
import CustomerDetailScreen from '../screens/customers/CustomerDetailScreen';
import InvoicePreviewScreen from '../screens/invoices/InvoicePreviewScreen';
import InvoiceHistoryScreen from '../screens/invoices/InvoiceHistoryScreen';
import CategoryScreen from '../screens/categories/CategoryScreen';
import DeviceBrandScreen from '../screens/categories/DeviceBrandScreen';
import DeviceModelScreen from '../screens/categories/DeviceModelScreen';
import IssueListScreen from '../screens/categories/IssueListScreen';
import ShopInfoScreen from '../screens/more/ShopInfoScreen';
import BackupScreen from '../screens/more/BackupScreen';
import StaffListScreen from '../screens/staff/StaffListScreen';
import StaffPerformanceScreen from '../screens/staff/StaffPerformanceScreen';
import SupplierDetailScreen from '../screens/suppliers/SupplierDetailScreen';
import CoTechDetailScreen from '../screens/cotech/CoTechDetailScreen';
import LicenseScreen from '../screens/more/LicenseScreen';
import PriceInquiryScreen from '../screens/suppliers/PriceInquiryScreen';
import ShopeeSearchScreen from '../screens/suppliers/ShopeeSearchScreen';
import QuotationScreen from '../screens/parts/QuotationScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={BottomTabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="NewRepair" component={NewRepairScreen} options={{ title: 'New Repair', presentation: 'modal' }} />
        <Stack.Screen name="RepairDetail" component={RepairDetailScreen} options={{ title: 'Repair Details' }} />
        <Stack.Screen name="PartForm" component={PartFormScreen} options={({ route }) => ({ title: route.params?.partId ? 'Edit Stock' : 'Add Stock' })} />
        <Stack.Screen name="Restock" component={RestockScreen} options={({ route }) => ({ title: `Restock — ${route.params.partName}` })} />
        <Stack.Screen name="BulkRestock" component={BulkRestockScreen} options={({ route }) => ({ title: `Bulk Restock (${route.params.partIds.length})` })} />
        <Stack.Screen name="CustomerList" component={CustomerListScreen} options={{ title: 'Customers' }} />
        <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Customer Details' }} />
        <Stack.Screen name="InvoicePreview" component={InvoicePreviewScreen} options={{ title: 'Invoice' }} />
        <Stack.Screen name="InvoiceHistory" component={InvoiceHistoryScreen} options={{ title: 'Invoice History' }} />
        <Stack.Screen name="CategoryList" component={CategoryScreen} options={{ title: 'Categories' }} />
        <Stack.Screen name="DeviceBrandList" component={DeviceBrandScreen} options={{ title: 'Brands' }} />
        <Stack.Screen name="DeviceModelList" component={DeviceModelScreen} options={{ title: 'Models' }} />
        <Stack.Screen name="IssueList" component={IssueListScreen} options={{ title: 'Problems & Issues' }} />
        <Stack.Screen name="ShopInfo" component={ShopInfoScreen} options={{ title: 'Technician Information' }} />
        <Stack.Screen name="Backup" component={BackupScreen} options={{ title: 'Backup & Restore' }} />
        <Stack.Screen name="StaffList" component={StaffListScreen} options={{ title: 'Staff' }} />
        <Stack.Screen name="StaffPerformance" component={StaffPerformanceScreen} options={{ title: 'Staff Performance' }} />
        <Stack.Screen name="SupplierDetail" component={SupplierDetailScreen} options={{ title: 'Supplier Details' }} />
        <Stack.Screen name="CoTechDetail" component={CoTechDetailScreen} options={{ title: 'Co-Tech Details' }} />
        <Stack.Screen name="License" component={LicenseScreen} options={{ title: 'Upgrade to Pro' }} />
        <Stack.Screen name="PriceInquiry" component={PriceInquiryScreen} options={{ title: 'Price Inquiry' }} />
        <Stack.Screen name="Quotation" component={QuotationScreen} options={{ title: 'Price Quotation' }} />
        <Stack.Screen name="ShopeeSearch" component={ShopeeSearchScreen} options={({ route }) => ({ title: (route.params as any)?.title ?? 'Shopee Search', headerStyle: { backgroundColor: '#EE4D2D' }, headerTintColor: '#fff' })} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
