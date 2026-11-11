import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { router } from 'expo-router';

import AddDeviceScreen from '../../../src/app/add-device';
import type { DeviceSetup } from '../../../src/types/device-setup';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

const mockStartScan = jest.fn(async () => undefined);
const mockUseDeviceSetup = jest.fn();

jest.mock('../../../src/hooks/use-device-setup', () => ({
  useDeviceSetup: (fieldId: number) => mockUseDeviceSetup(fieldId),
}));

function fakeSetup(patch: Partial<DeviceSetup> = {}): DeviceSetup {
  return {
    step: 'scanning',
    boards: [],
    selectedBoard: null,
    boardInfo: null,
    boardStatus: null,
    registration: null,
    errorCode: null,
    errorMessageKey: null,
    startScan: mockStartScan,
    selectBoard: jest.fn(),
    submitWifi: jest.fn(),
    retry: jest.fn(),
    reset: jest.fn(),
    ...patch,
  } as DeviceSetup;
}

describe('AddDeviceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: '7' });
    mockUseDeviceSetup.mockReturnValue(fakeSetup());
  });

  it('uses the field of the route and starts searching once', () => {
    render(<AddDeviceScreen />);

    expect(mockUseDeviceSetup).toHaveBeenCalledWith(7);
    expect(mockStartScan).toHaveBeenCalledTimes(1);
    expect(screen.getByText('addDevice.scan.instructions')).toBeTruthy();
  });

  it('goes back to the refreshed field', () => {
    render(<AddDeviceScreen />);

    fireEvent.press(screen.getByText('addDevice.back'));

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/field-detail',
      params: { id: '7' },
    });
  });

  it('goes back to the field after a successful connection', () => {
    mockUseDeviceSetup.mockReturnValue(
      fakeSetup({ step: 'success', registration: 'created' }),
    );
    render(<AddDeviceScreen />);

    fireEvent.press(screen.getByText('addDevice.success.done'));

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/field-detail',
      params: { id: '7' },
    });
  });

  it('opens the app settings when the permission is missing', () => {
    const openSettings = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    mockUseDeviceSetup.mockReturnValue(
      fakeSetup({ step: 'error', errorCode: 'permission_denied' }),
    );
    render(<AddDeviceScreen />);

    fireEvent.press(screen.getByText('addDevice.error.openSettings'));

    expect(openSettings).toHaveBeenCalled();
  });

  it('does not search when the field id is not valid', () => {
    mockUseLocalSearchParams.mockReturnValue({ id: 'abc' });
    render(<AddDeviceScreen />);

    expect(mockStartScan).not.toHaveBeenCalled();
    expect(screen.getByText('settings.errors.invalidId')).toBeTruthy();
  });
});
