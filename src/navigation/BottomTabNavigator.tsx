import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TabParamList } from './types';
import { Colors } from '../constants/colors';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import CustomerListScreen from '../screens/customers/CustomerListScreen';
import RepairsListScreen from '../screens/repairs/RepairsListScreen';
import PartsListScreen from '../screens/parts/PartsListScreen';
import SupplierListScreen from '../screens/suppliers/SupplierListScreen';
import CoTechListScreen from '../screens/cotech/CoTechListScreen';
import MoreMenuScreen from '../screens/more/MoreMenuScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Dashboard:  'view-dashboard',
            Customers:  'account-group',
            Repairs:    'wrench',
            Parts:      'package-variant',
            Suppliers:  'truck-delivery-outline',
            CoTech:     'account-hard-hat-outline',
            More:       'cog-outline',
          };
          return (
            <MaterialCommunityIcons
              name={icons[route.name] as any}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard"  component={DashboardScreen}    options={{ title: 'GenTech Repairs Monitoring', tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Repairs"    component={RepairsListScreen}   options={{ title: 'Repairs' }} />
      <Tab.Screen name="Customers"  component={CustomerListScreen}  options={{ title: 'Customers' }} />
      <Tab.Screen name="Suppliers"  component={SupplierListScreen}  options={{ title: 'Suppliers' }} />
      <Tab.Screen name="Parts"      component={PartsListScreen}     options={{ title: 'Stocks', tabBarLabel: 'Stocks' }} />
      <Tab.Screen name="CoTech"     component={CoTechListScreen}    options={{ title: 'Co-Tech', tabBarLabel: 'Co-Tech' }} />
      <Tab.Screen name="More"       component={MoreMenuScreen}      options={{ title: 'Settings', tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}
