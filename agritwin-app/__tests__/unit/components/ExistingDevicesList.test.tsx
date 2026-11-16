import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { ExistingDevicesList } from '../../../src/components/ExistingDevicesList';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const devices = [
  {
    id: 'dev-1',
    battery_status: true,
    brand: 'AgriTwin',
    serial_number: 'SN-1',
  },
  { id: 'dev-2', battery_status: false, brand: null, serial_number: null },
];

describe('ExistingDevicesList', () => {
  it('shows the id, brand and serial number of each device', () => {
    render(
      <ExistingDevicesList
        devices={devices}
        disabled={false}
        onRemove={jest.fn()}
      />,
    );

    expect(screen.getByText('dev-1')).toBeTruthy();
    expect(screen.getByText('AgriTwin · SN-1')).toBeTruthy();
    expect(screen.getByText('dev-2')).toBeTruthy();
  });

  it('removes the device that was pressed', () => {
    const onRemove = jest.fn();
    render(
      <ExistingDevicesList
        devices={devices}
        disabled={false}
        onRemove={onRemove}
      />,
    );

    fireEvent.press(screen.getByTestId('remove-device-dev-2'));

    expect(onRemove).toHaveBeenCalledWith('dev-2');
  });

  it('does not remove while it is disabled', () => {
    const onRemove = jest.fn();
    render(
      <ExistingDevicesList devices={devices} disabled onRemove={onRemove} />,
    );

    fireEvent.press(screen.getByTestId('remove-device-dev-1'));

    expect(onRemove).not.toHaveBeenCalled();
  });

  it('says if each device is connected or not', () => {
    render(
      <ExistingDevicesList
        devices={devices}
        disabled={false}
        onRemove={jest.fn()}
      />,
    );

    expect(screen.getByTestId('device-status-dev-1').props.children).toBe(
      'settings.fieldDetail.connected',
    );
    expect(screen.getByTestId('device-status-dev-2').props.children).toBe(
      'settings.fieldDetail.disconnected',
    );
    expect(screen.getAllByTestId('device-health-ok')).toHaveLength(1);
    expect(screen.getAllByTestId('device-health-down')).toHaveLength(1);
  });

  it('shows a card for each device without brand or serial number', () => {
    render(
      <ExistingDevicesList
        devices={[{ id: 'dev-9', battery_status: false }]}
        disabled={false}
        onRemove={jest.fn()}
      />,
    );

    expect(screen.getByTestId('device-dev-9')).toBeTruthy();
    expect(screen.getByText('dev-9')).toBeTruthy();
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it('names the device in the label of its remove button', () => {
    render(
      <ExistingDevicesList
        devices={devices}
        disabled={false}
        onRemove={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId('remove-device-dev-1').props.accessibilityLabel,
    ).toBe('settings.createField.removeDevice: dev-1');
  });
});
