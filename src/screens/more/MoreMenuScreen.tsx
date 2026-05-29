import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { List, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from '../../navigation/types';
import { TabParamList } from '../../navigation/types';
import { Colors } from '../../constants/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function MoreMenuScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView style={styles.container}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  item: { backgroundColor: Colors.surface, marginHorizontal: 12, marginVertical: 2, borderRadius: 8 },
});
