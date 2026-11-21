import React from 'react';

import { render, screen } from '@testing-library/react-native';

import DeviceStatusDot from '../../../src/components/DeviceStatusDot';
import { DEVICE_HEALTH_COLOR } from '../../../src/services/deviceHealth';

describe('DeviceStatusDot', () => {
  it.each([
    ['ok', DEVICE_HEALTH_COLOR.ok],
    ['partial', DEVICE_HEALTH_COLOR.partial],
    ['down', DEVICE_HEALTH_COLOR.down],
  ] as const)('renders the %s status with its colour', (health, color) => {
    render(<DeviceStatusDot health={health} />);

    const dot = screen.getByTestId(`device-health-${health}`);
    expect(dot).toBeTruthy();
    expect(dot.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: color,
        width: 9,
        height: 9,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#FFFFFF',
      }),
    );
  });

  it('can be drawn bigger', () => {
    render(<DeviceStatusDot health="ok" size={12} />);

    expect(screen.getByTestId('device-health-ok').props.style).toEqual(
      expect.objectContaining({ width: 12, height: 12, borderRadius: 6 }),
    );
  });
});
