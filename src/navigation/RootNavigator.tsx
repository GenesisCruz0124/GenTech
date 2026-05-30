import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { Colors } from '../constants/colors';

import BottomTabNavigator from './BottomTabNavigator';
import NewRepairScreen from '../screens/repairs/NewRepairScreen';
import RepairDetailScreen from '../screens/repairs/RepairDetailScreen';
import PartFormScreen from '../screens/parts/PartFormScreen';
import DeviceSaleFormScreen from '../screens/devices/DeviceSaleFormScreen';
import DevicePurchaseFormScreen from '../screens/devices/DevicePurchaseFormScreen';
import CustomerListScreen from '../screens/customers/CustomerListScreen';
import CustomerDetailScreen from '../screens/customers/CustomerDetailScreen';
import InvoicePreviewScreen from '../screens/invoices/InvoicePreviewScreen';
import InvoiceHistoryScreen from '../screens/invoices/InvoiceHistoryScreen';
import CategoryScreen from '../screens/categories/CategoryScreen';
import DeviceBrandScreen from '../screens/categories/DeviceBrandScreen';
import IssueListScreen from '../screens/categories/IssueListScreen';
import ShopInfoScreen from '../screens/more/ShopInfoScreen';
import StaffListScreen from '../screens/staff/StaffListScreen';
import StaffPerformanceScreen from '../screens/staff/StaffPerformanceScreen';

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
        <Stack.Screen name="NewRepair" component={NewRepairScreen} options={{ title: 'New Repair' }} />
        <Stack.Screen name="RepairDetail" component={RepairDetailScreen} options={{ title: 'Repair Details' }} />
        <Stack.Screen name="PartForm" component={PartFormScreen} options={({ route }) => ({ title: route.params?.partId ? 'Edit Part' : 'Add Part' })} />
        <Stack.Screen name="DeviceSaleForm" component={DeviceSaleFormScreen} options={{ title: 'Record Device Sale' }} />
        <Stack.Screen name="DevicePurchaseForm" component={DevicePurchaseFormScreen} options={{ title: 'Record Device Purchase' }} />
        <Stack.Screen name="CustomerList" component={CustomerListScreen} options={{ title: 'Customers' }} />
        <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Customer' }} />
        <Stack.Screen name="InvoicePreview" component={InvoicePreviewScreen} options={{ title: 'Invoice' }} />
        <Stack.Screen name="InvoiceHistory" component={InvoiceHistoryScreen} options={{ title: 'Invoice History' }} />
        <Stack.Screen name="CategoryList" component={CategoryScreen} options={{ title: 'Categories' }} />
        <Stack.Screen name="DeviceBrandList" component={DeviceBrandScreen} options={{ title: 'Device Brands' }} />
        <Stack.Screen name="IssueList" component={IssueListScreen} options={{ title: 'Issue List' }} />
        <Stack.Screen name="ShopInfo" component={ShopInfoScreen} options={{ title: 'Shop Information' }} />
        <Stack.Screen name="StaffList" component={StaffListScreen} options={{ title: 'Staff' }} />
        <Stack.Screen name="StaffPerformance" component={StaffPerformanceScreen} options={{ title: 'Staff Performance' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
