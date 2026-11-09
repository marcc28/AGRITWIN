import { View } from 'react-native';

import {
  DEVICE_HEALTH_COLOR,
  type DeviceHealth,
} from '@/services/deviceHealth';

export default function DeviceStatusDot({
  health,
}: {
  health: DeviceHealth;
}) {
  return (
    <View
      testID={`device-health-${health}`}
      style={{
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: DEVICE_HEALTH_COLOR[health],
        borderWidth: 1,
        borderColor: '#FFFFFF',
      }}
    />
  );
}
