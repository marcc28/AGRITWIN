import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { FieldDevicesCard } from '../../../src/components/FieldDevicesCard';
import type { FieldDevicesState } from '../../../src/hooks/use-field-devices';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderCard(state: FieldDevicesState) {
  const onPress = jest.fn();
  const onRetry = jest.fn();
  render(
    <FieldDevicesCard state={state} onPress={onPress} onRetry={onRetry} />,
  );
  return { onPress, onRetry };
}

describe('FieldDevicesCard', () => {
  it('shows a spinner while loading', () => {
    renderCard({ status: 'loading' });

    expect(screen.getByTestId('field-devices-loading')).toBeTruthy();
  });

  it('says there are none when the field has no devices', () => {
    renderCard({ status: 'ready', devices: [] });

    expect(screen.getByText('home.devices.title')).toBeTruthy();
    expect(screen.getByTestId('field-devices-none')).toBeTruthy();
    expect(screen.getByText('home.devices.none')).toBeTruthy();
  });

  it('shows one device with a green dot when it is connected', () => {
    renderCard({
      status: 'ready',
      devices: [{ id: 'esp32_sim_01', battery_status: true }],
    });

    expect(screen.getByText('esp32_sim_01')).toBeTruthy();
    expect(screen.getAllByTestId('device-health-ok')).toHaveLength(1);
    expect(screen.queryByTestId('device-health-down')).toBeNull();
    expect(screen.queryByTestId('field-devices-none')).toBeNull();
  });

  it('shows every device with its own colour', () => {
    renderCard({
      status: 'ready',
      devices: [
        { id: 'esp32_sim_01', battery_status: true },
        { id: 'esp32_sim_02', battery_status: false },
      ],
    });

    expect(screen.getByText('esp32_sim_01')).toBeTruthy();
    expect(screen.getByText('esp32_sim_02')).toBeTruthy();
    expect(screen.getAllByTestId('device-health-ok')).toHaveLength(1);
    expect(screen.getAllByTestId('device-health-down')).toHaveLength(1);
    expect(screen.queryByTestId('device-health-partial')).toBeNull();
  });

  it('describes the status for screen readers', () => {
    renderCard({
      status: 'ready',
      devices: [
        { id: 'esp32_sim_01', battery_status: true },
        { id: 'esp32_sim_02', battery_status: false },
      ],
    });

    expect(
      screen.getByLabelText('esp32_sim_01: settings.fieldDetail.connected'),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('esp32_sim_02: settings.fieldDetail.disconnected'),
    ).toBeTruthy();
  });

  it('opens the field when it is pressed', () => {
    const { onPress } = renderCard({ status: 'ready', devices: [] });

    fireEvent.press(screen.getByTestId('field-devices-card'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows the error and retries', () => {
    const { onRetry } = renderCard({ status: 'error' });

    expect(screen.getByText('home.devices.error')).toBeTruthy();
    fireEvent.press(screen.getByTestId('field-devices-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
