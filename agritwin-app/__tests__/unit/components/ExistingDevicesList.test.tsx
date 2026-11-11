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
});
