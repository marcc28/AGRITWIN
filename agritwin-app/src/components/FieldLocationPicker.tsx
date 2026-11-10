import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import MapCanvas from './field-location/MapCanvas';
import type { MapPoint } from './field-location/types';
import { Colors } from '../constants/theme';

type Props = {
  initialPoint: MapPoint | null;
  onConfirm: (point: MapPoint) => void;
  onCancel: () => void;
};

export function FieldLocationPicker({
  initialPoint,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const [point, setPoint] = useState(initialPoint);

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={pickerStyles.screen}>
        <View style={pickerStyles.header}>
          <Text accessibilityRole="header" style={pickerStyles.title}>
            {t('settings.createField.map.title')}
          </Text>
          <Text style={pickerStyles.hint}>
            {t('settings.createField.map.hint')}
          </Text>
        </View>
        <MapCanvas point={point} onSelect={setPoint} />
        <View style={pickerStyles.footer}>
          <Text style={pickerStyles.hint}>
            {point
              ? t('settings.createField.coords', {
                  lat: point.lat.toFixed(6),
                  lon: point.lon.toFixed(6),
                })
              : t('settings.createField.map.noPoint')}
          </Text>
          <View style={pickerStyles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={pickerStyles.cancel}
            >
              <Text style={pickerStyles.cancelText}>
                {t('settings.createField.map.cancel')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!point}
              accessibilityState={{ disabled: !point }}
              onPress={() => point && onConfirm(point)}
              style={[pickerStyles.confirm, !point && pickerStyles.disabled]}
            >
              <Text style={pickerStyles.confirmText}>
                {t('settings.createField.map.confirm')}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export const pickerStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    padding: 20,
    gap: 8,
    zIndex: 1,
    backgroundColor: Colors.light.background,
  },
  title: { color: Colors.light.text, fontSize: 22, fontWeight: '700' },
  hint: { color: Colors.light.textSecondary, fontSize: 14 },
  footer: {
    padding: 20,
    gap: 16,
    zIndex: 1,
    backgroundColor: Colors.light.background,
  },
  actions: { flexDirection: 'row', gap: 12 },
  cancel: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 14,
  },
  cancelText: { color: Colors.light.text, fontWeight: '600' },
  confirm: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
  },
  confirmText: { color: Colors.light.surface, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  selected: { backgroundColor: Colors.light.surfaceSecondary },
  error: { color: Colors.light.dangerText, fontSize: 13 },
});
