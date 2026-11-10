import {
  DEVICE_HEALTH_COLOR,
  DEVICE_HEALTH_LABEL,
  deviceHealthFromCounts,
} from '../../../src/services/deviceHealth';

describe('deviceHealthFromCounts', () => {
  it('is green when every Arduino is working', () => {
    expect(deviceHealthFromCounts(2, 2)).toBe('ok');
    expect(deviceHealthFromCounts(1, 1)).toBe('ok');
  });

  it('is yellow when only some Arduino boards are working', () => {
    expect(deviceHealthFromCounts(2, 1)).toBe('partial');
    expect(deviceHealthFromCounts(5, 3)).toBe('partial');
  });

  it('is red when none of the Arduino boards are working', () => {
    expect(deviceHealthFromCounts(2, 0)).toBe('down');
  });

  it('is red when the garden has no Arduino connected', () => {
    expect(deviceHealthFromCounts(0, 0)).toBe('down');
    expect(deviceHealthFromCounts(0, 1)).toBe('down');
  });

  it('stays green when the online count is greater than the total', () => {
    expect(deviceHealthFromCounts(2, 3)).toBe('ok');
  });
});

describe('device health presentation maps', () => {
  it('exposes the green, orange and red colours', () => {
    expect(DEVICE_HEALTH_COLOR.ok).toBe('#2F9E44');
    expect(DEVICE_HEALTH_COLOR.partial).toBe('#E0A100');
    expect(DEVICE_HEALTH_COLOR.down).toBe('#C92A2A');
  });

  it('exposes the i18n keys for each status', () => {
    expect(DEVICE_HEALTH_LABEL.ok).toBe('settings.deviceHealth.ok');
    expect(DEVICE_HEALTH_LABEL.partial).toBe('settings.deviceHealth.partial');
    expect(DEVICE_HEALTH_LABEL.down).toBe('settings.deviceHealth.down');
  });
});
