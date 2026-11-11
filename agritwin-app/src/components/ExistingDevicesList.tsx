import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { FieldDevice } from '../services/api';
import { deviceStyles as styles } from '../styles/device-form.styles';

type Props = Readonly<{
  devices: FieldDevice[];
  disabled: boolean;
  onRemove: (deviceId: string) => void;
}>;

/**
 * Devices already linked to a field. They are only shown and can be removed:
 * new devices are added from the field screen with the "Add device" flow.
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

        return (
          <View key={device.id} style={styles.box}>
            <View style={styles.boxHeader}>
              <Text style={styles.deviceId}>{device.id}</Text>
              <Pressable
                testID={`remove-device-${device.id}`}
                onPress={() => onRemove(device.id)}
                disabled={disabled}
                accessibilityRole="button"
              >
                <Text style={styles.removeText}>
                  {t('settings.createField.removeDevice')}
                </Text>
              </Pressable>
            </View>
            {detail ? <Text style={styles.deviceDetail}>{detail}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}
