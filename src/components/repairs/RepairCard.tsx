import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RepairWithCustomer } from '../../repositories/repairRepository';
import StatusBadge from './StatusBadge';
import { Colors } from '../../constants/colors';
import { formatDate, formatCurrency } from '../../utils/formatters';

interface RepairCardProps {
  repair: RepairWithCustomer;
  onPress: () => void;
}

export default function RepairCard({ repair, onPress }: RepairCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.device}>{repair.device_model}</Text>
          <Text style={styles.customer}>{repair.customer_name} · {repair.customer_phone}</Text>
          <Text style={styles.issue} numberOfLines={1}>{repair.issue_desc}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.cost}>{formatCurrency(repair.final_cost ?? repair.estimated_cost)}</Text>
          <Text style={styles.date}>{formatDate(repair.created_at)}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textSecondary} />
        </View>
      </View>
      <View style={styles.footer}>
        <StatusBadge status={repair.status} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  device: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  customer: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  issue: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  cost: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  date: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    marginTop: 8,
  },
});
