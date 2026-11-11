import { View } from 'react-native';

import {
  DEVICE_HEALTH_COLOR,
  type DeviceHealth,
} from '@/services/deviceHealth';

export default function DeviceStatusDot({
  health,
  size = 9,
}: {
  health: DeviceHealth;
  size?: number;
}) {
  return (
    <View
      testID={`device-health-${health}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.ceil(size / 2),
        backgroundColor: DEVICE_HEALTH_COLOR[health],
        borderWidth: 1,
        borderColor: '#FFFFFF',
      }}
    />
  );
}
