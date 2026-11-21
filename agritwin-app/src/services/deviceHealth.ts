export type DeviceHealth = 'ok' | 'partial' | 'down';

export function deviceHealthFromCounts(
  total: number,
  online: number,
): DeviceHealth {
  if (total <= 0 || online <= 0) {
    return 'down';
  }
  if (online >= total) {
    return 'ok';
  }
  return 'partial';
}

export const DEVICE_HEALTH_COLOR: Record<DeviceHealth, string> = {
  ok: '#2F9E44',
  partial: '#E0A100',
  down: '#C92A2A',
};

export const DEVICE_HEALTH_LABEL: Record<DeviceHealth, string> = {
  ok: 'settings.deviceHealth.ok',
  partial: 'settings.deviceHealth.partial',
  down: 'settings.deviceHealth.down',
};
