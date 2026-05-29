import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TabParamList } from './types';
import { Colors } from '../constants/colors';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import RepairsListScreen from '../screens/repairs/RepairsListScreen';
import PartsListScreen from '../screens/parts/PartsListScreen';
import DevicesScreen from '../screens/devices/DevicesScreen';
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
            Dashboard: 'view-dashboard',
            Repairs: 'wrench',
            Parts: 'package-variant',
            Devices: 'cellphone',
            More: 'dots-horizontal-circle',
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
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'GenTech Repairs Monitoring', tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Repairs" component={RepairsListScreen} options={{ title: 'Repairs' }} />
      <Tab.Screen name="Parts" component={PartsListScreen} options={{ title: 'Parts Stock' }} />
      <Tab.Screen name="Devices" component={DevicesScreen} options={{ title: 'Devices' }} />
      <Tab.Screen name="More" component={MoreMenuScreen} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
}
