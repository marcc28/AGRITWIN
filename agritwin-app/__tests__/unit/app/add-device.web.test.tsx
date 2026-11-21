import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddDeviceWebScreen from '../../../src/app/add-device.web';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUseLocalSearchParams = jest.fn(
  () => ({ id: '7' }) as Record<string, string>,
);

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

describe('AddDeviceWebScreen', () => {
  it('explains that the board is added from the phone', () => {
    render(<AddDeviceWebScreen />);

    expect(screen.getByText('addDevice.web.title')).toBeTruthy();
    expect(screen.getByText('addDevice.web.hint')).toBeTruthy();
  });

  it('goes back to the field', () => {
    render(<AddDeviceWebScreen />);

    fireEvent.press(screen.getByText('addDevice.back'));

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/field-detail',
      params: { id: '7' },
    });
  });

  it('goes home when it was opened while creating the first garden', () => {
    mockUseLocalSearchParams.mockReturnValueOnce({ id: '7', from: 'home' });
    render(<AddDeviceWebScreen />);

    fireEvent.press(screen.getByText('addDevice.back'));

    expect(router.replace).toHaveBeenCalledWith('/app/home');
  });
});
