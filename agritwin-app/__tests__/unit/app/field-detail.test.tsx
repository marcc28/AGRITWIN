import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import FieldDetailScreen from '../../../src/app/field-detail';
import { getDashboard, getField } from '../../../src/services/api';
import { clearAuth, getAuth } from '../../../src/services/auth';
import { getFieldCrops } from '../../../src/services/api_fieldCrops';
import { getCrops } from '../../../src/services/api_crops';
import { router } from 'expo-router';

jest.mock('react-i18next', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const mockUseLocalSearchParams = jest.fn(() => ({ id: '3' }));
const mockIsAuthError = jest.fn((_error?: unknown) => false);

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
  isAuthError: (error?: unknown) => mockIsAuthError(error),
}));

jest.mock('../../../src/services/auth', () => ({
  clearAuth: jest.fn(),
  getAuth: jest.fn(async () => ({ token: 'field-token' })),
}));

jest.mock('../../../src/services/api_fieldCrops', () => ({
  getFieldCrops: jest.fn(async () => []),
}));

jest.mock('../../../src/services/api_crops', () => ({
  getCrops: jest.fn(async () => []),
}));

jest.mock('../../../src/components/FieldPhoto', () => ({
  FieldPhoto: () => null,
}));

jest.mock('../../../src/components/SensorCard', () => ({
  SensorCard: ({ title, onPress }: { title: string; onPress: () => void }) => {
    const React = jest.requireActual<typeof import('react')>('react');
    const { Pressable, Text } =
      jest.requireActual<typeof import('react-native')>('react-native');
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
const mockedGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockedGetFieldCrops = getFieldCrops as jest.MockedFunction<
  typeof getFieldCrops
>;
const mockedGetCrops = getCrops as jest.MockedFunction<typeof getCrops>;

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
    mockedGetFieldCrops.mockResolvedValue([]);
    mockedGetCrops.mockResolvedValue([]);
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

  it('closes device details when tapping outside the popup', async () => {
    render(<FieldDetailScreen />);
    await waitFor(() => expect(screen.getByText('dev-1')).toBeTruthy());
    fireEvent.press(screen.getByText('dev-1'));
    fireEvent.press(screen.getByTestId('device-popup-backdrop'));
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

  it('shows field crops and resolves their names from the crop catalog', async () => {
    mockedGetFieldCrops.mockResolvedValue([
      {
        id: 31,
        field_id: 3,
        crop_id: 9,
        crop_name: null,
        planted_at: '2026-04-01',
        expected_harvest_at: '2026-08-01',
        status: 'planned',
      },
      {
        id: 32,
        field_id: 3,
        crop_id: 10,
        crop_name: 'Ceba',
        status: 'harvested',
      },
    ]);
    mockedGetCrops.mockResolvedValue([
      {
        id: 9,
        name: 'Tomàquet',
        scientific_name: 'Solanum lycopersicum',
        category: 'vegetable',
      },
      {
        id: 10,
        name: 'Ceba',
        scientific_name: 'Allium cepa',
        category: 'vegetable',
      },
    ]);

    render(<FieldDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Tomàquet')).toBeTruthy();
      expect(screen.getByText('Ceba')).toBeTruthy();
    });
    expect(
      screen.getByText('settings.fieldDetail.cropStatuses.planned'),
    ).toBeTruthy();
    expect(
      screen.getByText('settings.fieldDetail.cropStatuses.harvested'),
    ).toBeTruthy();
    expect(mockedGetFieldCrops).toHaveBeenCalledWith(0, 100, 'field-token', {
      field_id: 3,
    });
    expect(mockedGetCrops).toHaveBeenCalledWith(0, 100, 'field-token');
  });

  it('shows field-crop loading errors without hiding the field', async () => {
    mockedGetFieldCrops.mockRejectedValue(new Error('Cultius no disponibles'));

    render(<FieldDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Cultius no disponibles')).toBeTruthy();
    });
    expect(screen.getByText('Hort')).toBeTruthy();
  });

  it('shows an error when crop loading has no auth token', async () => {
    mockedGetAuth.mockResolvedValueOnce(
      null as Awaited<ReturnType<typeof getAuth>>,
    );
    render(<FieldDetailScreen />);
    await waitFor(() =>
      expect(screen.getByText('Not authenticated')).toBeTruthy(),
    );
    expect(mockedGetFieldCrops).not.toHaveBeenCalled();
  });

  it('uses a fallback message for non-Error crop failures', async () => {
    mockedGetFieldCrops.mockRejectedValue('offline');
    render(<FieldDetailScreen />);
    await waitFor(() =>
      expect(screen.getByText('settings.errors.loadCrops')).toBeTruthy(),
    );
  });

  it('clears an invalid session after crop requests', async () => {
    mockIsAuthError.mockReturnValue(true);
    mockedGetFieldCrops.mockRejectedValue(new Error('Not authenticated'));
    render(<FieldDetailScreen />);
    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
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
