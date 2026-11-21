import { createElement, useState, type ChangeEvent } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@expo/ui/datetimepicker';

import { Colors } from '../constants/theme';

type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minimumDate?: string;
  maximumDate?: string;
  disabled?: boolean;
};

function fromIsoDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nativeDateLabel(value: string, placeholder: string): string {
  const date = fromIsoDate(value);
  return date
    ? new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date)
    : placeholder;
}

export function DateField({
  value,
  onChange,
  placeholder,
  minimumDate,
  maximumDate,
  disabled = false,
}: DateFieldProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draftDate, setDraftDate] = useState<Date | null>(null);

  if (Platform.OS === 'web') {
    return createElement('input', {
      type: 'date',
      value,
      min: minimumDate || undefined,
      max: maximumDate || undefined,
      disabled,
      'aria-label': placeholder,
      onChange: (event: ChangeEvent<HTMLInputElement>) =>
        onChange(event.currentTarget.value),
      style: {
        width: '100%',
        height: 48,
        boxSizing: 'border-box',
        border: `1px solid ${Colors.light.border}`,
        borderRadius: 14,
        padding: '0 14px',
        backgroundColor: Colors.light.background,
        color: Colors.light.text,
        fontFamily: 'inherit',
        fontSize: 14,
        opacity: disabled ? 0.55 : 1,
      },
    });
  }

  const minimum = fromIsoDate(minimumDate ?? '');
  const maximum = fromIsoDate(maximumDate ?? '');
  const selectedDate = fromIsoDate(value);
  const pickerValue = draftDate ?? selectedDate ?? new Date();

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          value ? nativeDateLabel(value, placeholder) : placeholder
        }
        onPress={() => {
          setDraftDate(selectedDate ?? new Date());
          setPickerVisible(true);
        }}
        disabled={disabled}
        style={[styles.field, disabled && styles.disabled]}
      >
        <Text style={[styles.fieldText, !value && styles.placeholder]}>
          {nativeDateLabel(value, placeholder)}
        </Text>
        <Ionicons
          name="calendar-outline"
          size={19}
          color={Colors.light.primary}
        />
      </Pressable>

      {pickerVisible && Platform.OS === 'ios' && (
        <View style={styles.iosPickerPanel}>
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="spinner"
            minimumDate={minimum ?? undefined}
            maximumDate={maximum ?? undefined}
            accentColor={Colors.light.primary}
            onValueChange={(_event, date) => {
              if (date) setDraftDate(date);
            }}
          />
          <View style={styles.iosActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPickerVisible(false)}
              style={styles.iosAction}
            >
              <Text style={styles.cancelText}>Cancel·lar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (draftDate) onChange(toIsoDate(draftDate));
                setPickerVisible(false);
              }}
              style={styles.iosAction}
            >
              <Text style={styles.doneText}>Fet</Text>
            </Pressable>
          </View>
        </View>
      )}

      {pickerVisible && Platform.OS === 'android' && (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="default"
          presentation="dialog"
          minimumDate={minimum ?? undefined}
          maximumDate={maximum ?? undefined}
          accentColor={Colors.light.primary}
          positiveButton={{ label: 'Fet' }}
          negativeButton={{ label: 'Cancel·lar' }}
          onValueChange={(_event, date) => {
            if (date) onChange(toIsoDate(date));
            setPickerVisible(false);
          }}
          onDismiss={() => setPickerVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldText: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 14,
  },
  placeholder: {
    color: Colors.light.textMuted,
  },
  disabled: {
    opacity: 0.55,
  },
  iosPickerPanel: {
    marginTop: 8,
    padding: 8,
    borderRadius: 16,
    backgroundColor: Colors.light.background,
  },
  iosActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  iosAction: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cancelText: {
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  doneText: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
});
