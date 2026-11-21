import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import DeviceStatusDot from './DeviceStatusDot';
import { Colors } from '../constants/theme';
import type { FieldDevice } from '../services/api';
import { deviceStyles as styles } from '../styles/device-form.styles';

type Props = Readonly<{
  devices: FieldDevice[];
  disabled: boolean;
  onRemove: (deviceId: string) => void;
}>;

/**
 * Devices already linked to a field, one small card each: its name, brand and
 * serial number, whether it is connected, and a button to remove it.
 * New devices are linked with the "Add device" flow (see FieldDevicesSection).
 */
export function ExistingDevicesList({ devices, disabled, onRemove }: Props) {
  const { t } = useTranslation();

  return (
    <View>
      {devices.map((device) => {
        const detail = [device.brand, device.serial_number]
          .map((value) => (value ?? '').trim())
          .filter(Boolean)
          .join(' · ');
        const connected = Boolean(device.battery_status);

        return (
          <View
            key={device.id}
            testID={`device-${device.id}`}
            style={styles.box}
          >
            <View style={styles.iconBubble}>
              <Ionicons
                name="hardware-chip-outline"
                size={20}
                color={Colors.light.primaryDark}
              />
            </View>
            <View style={styles.deviceBody}>
              <Text style={styles.deviceId} numberOfLines={1}>
                {device.id}
              </Text>
              {detail ? (
                <Text style={styles.deviceDetail} numberOfLines={1}>
                  {detail}
                </Text>
              ) : null}
              <View style={styles.statusRow}>
                <DeviceStatusDot health={connected ? 'ok' : 'down'} size={9} />
                <Text
                  testID={`device-status-${device.id}`}
                  style={[
                    styles.statusText,
                    connected ? styles.statusOn : styles.statusOff,
                  ]}
                >
                  {connected
                    ? t('settings.fieldDetail.connected')
                    : t('settings.fieldDetail.disconnected')}
                </Text>
              </View>
            </View>
            <Pressable
              testID={`remove-device-${device.id}`}
              onPress={() => onRemove(device.id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`${t('settings.createField.removeDevice')}: ${device.id}`}
              style={styles.removeButton}
            >
              <Ionicons
                name="trash-outline"
                size={14}
                color={Colors.light.dangerText}
              />
              <Text style={styles.removeText}>
                {t('settings.createField.removeDevice')}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
