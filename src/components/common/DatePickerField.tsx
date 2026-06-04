import React, { useState } from 'react';
import { Platform, TouchableOpacity, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface DatePickerFieldProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: Date;
  maxDate?: Date;
}

function toDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function toStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function DatePickerField({ label, value, onChange, minDate, maxDate }: DatePickerFieldProps) {
  const [show, setShow] = useState(false);

  const date = value ? toDate(value) : (minDate ?? new Date());

  const display = value
    ? date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Select date';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={() => setShow(true)}>
        <Text style={[styles.value, !value && styles.placeholder]}>{display}</Text>
        <MaterialCommunityIcons name="calendar" size={20} color={Colors.primary} />
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setShow(false);
            if (selected) onChange(toStr(selected));
          }}
          minimumDate={minDate}
          maximumDate={maxDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  label: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  value: { fontSize: 16, color: Colors.text },
  placeholder: { color: Colors.textSecondary },
});
