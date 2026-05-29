import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors } from '../../constants/colors';

interface StatCardProps {
  label: string;
  count: number;
  color: string;
  onPress?: () => void;
}

export default function StatCard({ label, count, color, onPress }: StatCardProps) {
  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.count, { color }]}>{count}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    margin: 4,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  count: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
