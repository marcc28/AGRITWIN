import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ExistingDevicesList } from './ExistingDevicesList';
import { Colors } from '../constants/theme';
import type { FieldDevice } from '../services/api';
import { deviceStyles as styles } from '../styles/device-form.styles';

type Props = Readonly<{
  /** Devices linked to the field. Leave it out while the field is created. */
  devices?: FieldDevice[];
  /** Text under the title. */
  hint?: string;
  /** Text of the button that starts the "Add device" flow. */
  addLabel: string;
  disabled: boolean;
  /** Inside a card of its own: no line on top. */
  plain?: boolean;
  /** Without it there is no button (e.g. Bluetooth is not on the web). */
  onAdd?: () => void;
  onRemove?: (deviceId: string) => void;
}>;

/**
 * The devices of a field: the ones already linked (with a button to remove
 * them) and a button to link another one with the "Add device" flow.
 */
export function FieldDevicesSection({
  devices,
  hint,
  addLabel,
  disabled,
  plain = false,
  onAdd,
  onRemove,
}: Props) {
  const { t } = useTranslation();

  return (
    <View
      testID="field-devices-section"
      style={[styles.section, plain && styles.sectionPlain]}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('addDevice.section.title')}</Text>
        {devices && devices.length > 0 ? (
          <View testID="field-devices-count" style={styles.countBadge}>
            <Text style={styles.countText}>{devices.length}</Text>
          </View>
        ) : null}
      </View>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}

      {devices && devices.length > 0 ? (
        <ExistingDevicesList
          devices={devices}
          disabled={disabled}
          onRemove={(deviceId) => onRemove?.(deviceId)}
        />
      ) : null}
      {devices && devices.length === 0 ? (
        <View testID="field-devices-section-empty" style={styles.emptyBox}>
          <Ionicons
            name="hardware-chip-outline"
            size={28}
            color={Colors.light.textMuted}
          />
          <Text style={styles.emptyText}>{t('addDevice.section.none')}</Text>
        </View>
      ) : null}

      {onAdd ? (
        <Pressable
          testID="field-devices-add"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          style={[styles.addButton, disabled && styles.addButtonDisabled]}
          onPress={onAdd}
        >
          <Ionicons name="add" size={18} color={Colors.light.surface} />
          <Text style={styles.addText}>{addLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
