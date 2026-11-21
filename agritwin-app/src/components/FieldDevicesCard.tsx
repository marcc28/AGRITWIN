import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import DeviceStatusDot from '@/components/DeviceStatusDot';
import { Colors } from '@/constants/theme';
import type { FieldDevicesState } from '@/hooks/use-field-devices';
import { fieldDevicesStyles } from '@/styles/field-devices.styles';
import { styles as cardStyles } from '@/styles/sensor.styles';

type Props = Readonly<{
  state: FieldDevicesState;
  onPress: () => void;
  onRetry: () => void;
}>;

/**
 * Small card for the dashboard: every device of the field with a green dot
 * (connected) or a red dot (disconnected) under its name.
 */
export function FieldDevicesCard({ state, onPress, onRetry }: Props) {
  const { t } = useTranslation();
  const style = [cardStyles.card, fieldDevicesStyles.card];

  if (state.status === 'loading') {
    return (
      <View testID="field-devices-loading" style={style}>
        <ActivityIndicator color={Colors.light.primary} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View testID="field-devices-error" style={style}>
        <Text style={fieldDevicesStyles.title}>{t('home.devices.title')}</Text>
        <Text style={cardStyles.emptyText}>{t('home.devices.error')}</Text>
        <Pressable
          testID="field-devices-retry"
          accessibilityRole="button"
          onPress={onRetry}
          style={fieldDevicesStyles.retryButton}
        >
          <Text style={fieldDevicesStyles.retryText}>
            {t('home.devices.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      testID="field-devices-card"
      accessibilityRole="button"
      onPress={onPress}
      style={style}
    >
      <View style={fieldDevicesStyles.header}>
        <Text style={fieldDevicesStyles.title}>{t('home.devices.title')}</Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={Colors.light.textMuted}
        />
      </View>

      {state.devices.length === 0 ? (
        <Text testID="field-devices-none" style={fieldDevicesStyles.none}>
          {t('home.devices.none')}
        </Text>
      ) : (
        <View style={fieldDevicesStyles.list}>
          {state.devices.map((device) => (
            <View
              key={device.id}
              style={fieldDevicesStyles.device}
              accessible
              accessibilityLabel={`${device.id}: ${
                device.battery_status
                  ? t('settings.fieldDetail.connected')
                  : t('settings.fieldDetail.disconnected')
              }`}
            >
              <Text style={fieldDevicesStyles.deviceName} numberOfLines={1}>
                {device.id}
              </Text>
              <DeviceStatusDot
                health={device.battery_status ? 'ok' : 'down'}
                size={12}
              />
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}
