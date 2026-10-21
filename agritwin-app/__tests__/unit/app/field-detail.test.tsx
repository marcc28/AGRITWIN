import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import FieldDetailScreen from '../../../src/app/field-detail';
import { getDashboard, getField } from '../../../src/services/api';
import { clearAuth } from '../../../src/services/auth';
import { router } from 'expo-router';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockUseLocalSearchParams = jest.fn(() => ({ id: '3' }));
const mockIsAuthError = jest.fn(() => false);

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('../../../src/services/api', () => ({
  getField: jest.fn(),
  getDashboard: jest.fn(),
  isAuthError: (error: unknown) => mockIsAuthError(error),
}));

jest.mock('../../../src/services/auth', () => ({
  clearAuth: jest.fn(),
}));

jest.mock('../../../src/components/FieldPhoto', () => ({
  FieldPhoto: () => null,
}));

jest.mock('../../../src/components/SensorCard', () => ({
  SensorCard: ({ title, onPress }: { title: string; onPress: () => void }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable onPress={onPress}>
        <Text>{title}</Text>
      </Pressable>
    );
  },
}));

const mockedGetField = getField as jest.MockedFunction<typeof getField>;
const mockedGetDashboard = getDashboard as jest.MockedFunction<
  typeof getDashboard
>;

describe('FieldDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: '3' });
    mockIsAuthError.mockReturnValue(false);
    mockedGetField.mockResolvedValue({
      id: 3,
      name: 'Hort',
      location: 'Andorra',
      field_type: 'home_garden',
      soil_type: 'loam',
      size_m2: 40,
      device_count: 1,
      devices: [
        {
          id: 'dev-1',
          battery_status: true,
          brand: 'ESP32',
          serial_number: 'SN-1',
        },
      ],
    });
    mockedGetDashboard.mockResolvedValue({
      field_name: 'Hort',
      device_ids: ['dev-1'],
      latest: null,
      history: [],
    });
  });

  it('shows garden info and devices', async () => {
    render(<FieldDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Hort')).toBeTruthy();
    });
    expect(screen.getByText('Andorra')).toBeTruthy();
    expect(screen.getByText('dev-1')).toBeTruthy();
    expect(screen.getByText('settings.fieldDetail.connected')).toBeTruthy();
    expect(screen.queryByText('settings.createField.saveDevices')).toBeNull();
  });

  it('opens device details in a popup', async () => {
    render(<FieldDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('dev-1')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('dev-1'));
    expect(
      screen.getByText('settings.fieldDetail.devicePopupTitle'),
    ).toBeTruthy();
    expect(screen.getByText('ESP32')).toBeTruthy();
    expect(screen.getByText('SN-1')).toBeTruthy();
    fireEvent.press(screen.getByText('settings.fieldDetail.devicePopupClose'));
    expect(
      screen.queryByText('settings.fieldDetail.devicePopupTitle'),
    ).toBeNull();
  });

  it('shows an invalid id', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: 'nope' });
    render(<FieldDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('settings.errors.invalidId')).toBeTruthy();
    });
  });

  it('redirects when the garden cannot be loaded', async () => {
    mockIsAuthError.mockReturnValue(true);
    mockedGetField.mockRejectedValue(new Error('Not authenticated'));
    render(<FieldDetailScreen />);
    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('shows a dashboard error', async () => {
    mockedGetDashboard.mockRejectedValue(new Error('no data'));
    render(<FieldDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Hort')).toBeTruthy();
    });
  });

  it('shows when the garden cannot be loaded', async () => {
    mockedGetField.mockRejectedValue(new Error('missing garden'));
    render(<FieldDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('missing garden')).toBeTruthy();
    });
  });

  it('goes back to profile and opens the data page', async () => {
    render(<FieldDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('settings.fieldDetail.back')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('settings.fieldDetail.back'));
    expect(router.replace).toHaveBeenCalledWith('/app/settings');
    fireEvent.press(screen.getByText('settings.fieldDetail.sensorTitle'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/field-data',
      params: { id: '3' },
    });
  });

  it('shows a disconnected device and empty types', async () => {
    mockedGetField.mockResolvedValue({
      id: 3,
      name: 'Hort',
      location: null,
      field_type: null,
      soil_type: null,
      size_m2: null,
      device_count: 1,
      devices: [{ id: 'dev-2', battery_status: false }],
    });

    render(<FieldDetailScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('settings.fieldDetail.disconnected'),
      ).toBeTruthy();
    });
  });

  it('shows when there are no devices', async () => {
    mockedGetField.mockResolvedValue({
      id: 3,
      name: 'Hort',
      location: 'Andorra',
      field_type: 'home_garden',
      soil_type: 'loam',
      size_m2: 40,
      device_count: 0,
      devices: [],
    });

    render(<FieldDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('settings.fieldDetail.noDevices')).toBeTruthy();
    });
  });

  it('opens the edit page', async () => {
    render(<FieldDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('settings.fieldDetail.edit')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('settings.fieldDetail.edit'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/edit-field',
      params: { id: '3' },
    });
  });
});
