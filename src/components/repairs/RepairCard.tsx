import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RepairWithCustomer } from '../../repositories/repairRepository';
import { Colors } from '../../constants/colors';
import { STATUS_COLORS, STATUS_LABELS, STATUS_NEXT, RepairStatus } from '../../constants/statusOptions';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface RepairCardProps {
  repair: RepairWithCustomer;
  onPress: () => void;
  onAdvanceStatus?: (id: number, nextStatus: RepairStatus) => void;
}

const STATUS_ICONS: Partial<Record<RepairStatus, string>> = {
  pending: 'clock-outline',
  in_progress: 'wrench',
  ready: 'check-circle-outline',
  delivered: 'package-check',
  not_repaired: 'close-circle-outline',
};

export default function RepairCard({ repair, onPress, onAdvanceStatus }: RepairCardProps) {
  const statusColor = STATUS_COLORS[repair.status];
  const nextStatus = STATUS_NEXT[repair.status];
  const isPaid = repair.is_paid === 1;
  const isDelivered = repair.status === 'delivered';

  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: statusColor }]} onPress={onPress} activeOpacity={0.85}>

      {/* ── Top: RPN + cost */}
      <View style={styles.topRow}>
        <Text style={styles.repairNo}>RPN-{String(repair.id).padStart(4, '0')}</Text>
        <Text style={[styles.cost, { color: statusColor }]}>{formatCurrency(repair.estimated_cost)}</Text>
      </View>

      {/* ── Device + customer */}
      <Text style={styles.device} numberOfLines={1}>{repair.device_model}</Text>
      <Text style={styles.customer} numberOfLines={1}>{repair.customer_name}</Text>

      {/* ── Issue */}
      {repair.issue_desc ? (
        <Text style={styles.issue} numberOfLines={1}>{repair.issue_desc}</Text>
      ) : null}

      {/* ── Meta row: time, location */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="clock-outline" size={11} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{formatDateTime(repair.created_at)}</Text>
        </View>
        {repair.customer_address ? (
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="map-marker-outline" size={11} color={Colors.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>{repair.customer_address}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Bottom: status, warranty, paid */}
      <View style={styles.bottomRow}>
        {/* Status pill */}
        <View style={[styles.statusPill, { backgroundColor: statusColor + '18', borderColor: statusColor + '40' }]}>
          <MaterialCommunityIcons name={(STATUS_ICONS[repair.status] ?? 'circle') as any} size={12} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[repair.status]}</Text>
        </View>

        <View style={styles.badgeGroup}>
          {/* Warranty badge */}
          <View style={[styles.badge, repair.has_warranty ? styles.badgeWarrantyYes : styles.badgeWarrantyNo]}>
            <MaterialCommunityIcons
              name={repair.has_warranty ? 'shield-check' : 'shield-off'}
              size={11}
              color={repair.has_warranty ? Colors.success : Colors.textSecondary}
            />
            <Text style={[styles.badgeText, repair.has_warranty ? { color: Colors.success } : {}]}>
              {repair.has_warranty ? 'Warranty' : 'No Warranty'}
            </Text>
          </View>

          {/* Paid badge — only when delivered */}
          {isDelivered && (
            <View style={[styles.badge, isPaid ? styles.badgePaidYes : styles.badgePaidNo]}>
              <MaterialCommunityIcons
                name={isPaid ? 'cash-check' : 'cash-remove'}
                size={11}
                color={isPaid ? Colors.success : Colors.warning}
              />
              <Text style={[styles.badgeText, { color: isPaid ? Colors.success : Colors.warning }]}>
                {isPaid ? 'Paid' : 'Unpaid'}
              </Text>
            </View>
          )}

          {/* Advance button */}
          {nextStatus && onAdvanceStatus && nextStatus !== 'delivered' && (
            <TouchableOpacity
              style={[styles.advanceBtn, { borderColor: STATUS_COLORS[nextStatus] + '60' }]}
              onPress={(e) => { e.stopPropagation?.(); onAdvanceStatus(repair.id, nextStatus); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.advanceBtnText, { color: STATUS_COLORS[nextStatus] }]}>
                → {STATUS_LABELS[nextStatus]}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 5,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  repairNo: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 1 },
  cost: { fontSize: 15, fontWeight: '800' },
  device: { fontSize: 15, fontWeight: '700', color: Colors.text },
  customer: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  issue: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, fontStyle: 'italic' },

  // Meta row
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 10, color: Colors.textSecondary },

  // Bottom row
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, flexWrap: 'wrap', gap: 6 },
  badgeGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },

  // Status pill
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  // Generic badge
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
  badgeWarrantyYes: { backgroundColor: Colors.success + '12', borderColor: Colors.success + '40' },
  badgeWarrantyNo: { backgroundColor: '#F2F4F7', borderColor: Colors.border },
  badgePaidYes: { backgroundColor: Colors.success + '12', borderColor: Colors.success + '40' },
  badgePaidNo: { backgroundColor: Colors.warning + '15', borderColor: Colors.warning + '40' },

  // Advance button
  advanceBtn: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
    backgroundColor: Colors.background,
  },
  advanceBtnText: { fontSize: 11, fontWeight: '700' },
});
