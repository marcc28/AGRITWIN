import React from 'react';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';

import FieldDataScreen from '../../../src/app/field-data';
import { getDashboard } from '../../../src/services/api';
import { clearAuth } from '../../../src/services/auth';
import { SENSOR_REFRESH_MS } from '../../../src/services/queries';

const mockUseLocalSearchParams = jest.fn(() => ({ id: '3' }));
const mockIsFocused = jest.fn(() => true);
const mockIsAuthError = jest.fn((_error?: unknown) => false);
const mockTranslate = (key: string) => key;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockTranslate,
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useIsFocused: () => mockIsFocused(),
}));

jest.mock('../../../src/services/api', () => ({
  getDashboard: jest.fn(),
  isAuthError: (error?: unknown) => mockIsAuthError(error),
}));

jest.mock('../../../src/services/auth', () => ({
  clearAuth: jest.fn(),
}));

jest.mock('../../../src/components/SensorModal', () => ({
  SensorModal: ({
    dashboard,
  }: {
    dashboard: { latest: { temperature: number } | null };
  }) => {
    const React = jest.requireActual<typeof import('react')>('react');
    const { Text } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <>
        <Text>sensor-modal</Text>
        <Text>{`temp-${dashboard.latest?.temperature}`}</Text>
      </>
    );
  },
}));

const mockedGetDashboard = getDashboard as jest.MockedFunction<
  typeof getDashboard
>;
const mockedClearAuth = clearAuth as jest.MockedFunction<typeof clearAuth>;
const mockedRouterReplace = router.replace as jest.MockedFunction<
  typeof router.replace
>;

describe('FieldDataScreen', () => {
  const reading = (temperature: number) => ({
    field_name: 'Hort',
    device_ids: ['dev-1'],
    latest: {
      timestamp: '2026-01-01T00:00:00Z',
      temperature,
      air_humidity: 40,
      soil_humidity: 30,
      light: 100,
    },
    history: [],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDashboard.mockReset();
    mockUseLocalSearchParams.mockReturnValue({ id: '3' });
    mockIsFocused.mockReturnValue(true);
    mockIsAuthError.mockReset();
    mockIsAuthError.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the sensor screen when there is a reading', async () => {
    mockedGetDashboard.mockResolvedValue({
      field_name: 'Hort',
      device_ids: ['dev-1'],
      latest: {
        timestamp: '2026-01-01T00:00:00Z',
        temperature: 20,
        air_humidity: 40,
        soil_humidity: 30,
        light: 100,
      },
      history: [],
    });

    render(<FieldDataScreen />);

    await waitFor(() => {
      expect(screen.getByText('sensor-modal')).toBeTruthy();
    });
  });

  it('shows a message when there is no reading', async () => {
    mockedGetDashboard.mockResolvedValue({
      field_name: 'Hort',
      device_ids: ['dev-1'],
      latest: null,
      history: [],
    });

    render(<FieldDataScreen />);

    await waitFor(() => {
      expect(screen.getByText('settings.errors.noReading')).toBeTruthy();
    });
  });

  it('shows a message when there is no device', async () => {
    mockedGetDashboard.mockResolvedValue({
      field_name: 'Hort',
      device_ids: [],
      latest: null,
      history: [],
    });

    render(<FieldDataScreen />);

    await waitFor(() => {
      expect(screen.getByText('settings.errors.noDevice')).toBeTruthy();
    });
  });

  it('shows an error and skips the request when the field id is invalid', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: 'not-a-number' });

    render(<FieldDataScreen />);

    await waitFor(() => {
      expect(screen.getByText('settings.errors.invalidId')).toBeTruthy();
    });
    expect(mockedGetDashboard).not.toHaveBeenCalled();
  });

  it('shows an Error message when loading the dashboard fails', async () => {
    mockedGetDashboard.mockRejectedValueOnce(new Error('Dashboard failed'));

    render(<FieldDataScreen />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard failed')).toBeTruthy();
    });
    expect(screen.queryByText('settings.loading')).toBeNull();
  });

  it('shows the translated fallback for a non-Error rejection', async () => {
    mockedGetDashboard.mockRejectedValueOnce('network failure');

    render(<FieldDataScreen />);

    await waitFor(() => {
      expect(screen.getByText('settings.errors.loadData')).toBeTruthy();
    });
  });

  it('clears auth and redirects to login after an auth error', async () => {
    const authError = new Error('Unauthorized');
    mockIsAuthError.mockReturnValueOnce(true);
    mockedGetDashboard.mockRejectedValueOnce(authError);

    render(<FieldDataScreen />);

    await waitFor(() => {
      expect(mockedRouterReplace).toHaveBeenCalledWith('/auth/login');
    });
    expect(mockedClearAuth).toHaveBeenCalledTimes(1);
  });

  it('replaces the readings every 10 seconds without the loading text', async () => {
    expect(SENSOR_REFRESH_MS).toBe(10 * 1000);
    jest.useFakeTimers();
    mockedGetDashboard
      .mockResolvedValueOnce(reading(20))
      .mockResolvedValueOnce(reading(21));

    render(<FieldDataScreen />);

    await waitFor(() => {
      expect(screen.getByText('temp-20')).toBeTruthy();
    });

    await act(async () => {
      jest.advanceTimersByTime(SENSOR_REFRESH_MS);
    });

    await waitFor(() => {
      expect(screen.getByText('temp-21')).toBeTruthy();
    });
    expect(screen.queryByText('settings.loading')).toBeNull();
    expect(mockedGetDashboard).toHaveBeenCalledTimes(2);
  });

  it('stops asking when the screen is no longer open', async () => {
    jest.useFakeTimers();
    mockIsFocused.mockReturnValue(false);
    mockedGetDashboard.mockResolvedValue(reading(20));

    render(<FieldDataScreen />);

    await waitFor(() => {
      expect(screen.getByText('temp-20')).toBeTruthy();
    });

    await act(async () => {
      jest.advanceTimersByTime(SENSOR_REFRESH_MS * 3);
    });

    expect(mockedGetDashboard).toHaveBeenCalledTimes(1);
  });

  it('returns to the field detail when the back button is pressed', async () => {
    mockedGetDashboard.mockResolvedValue({
      field_name: 'Hort',
      device_ids: ['dev-1'],
      latest: {
        timestamp: '2026-01-01T00:00:00Z',
        temperature: 20,
        air_humidity: 40,
        soil_humidity: 30,
        light: 100,
      },
      history: [],
    });

    render(<FieldDataScreen />);

    await waitFor(() => {
      expect(screen.getByText('sensor-modal')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('settings.fieldDetail.dataBack'));

    expect(mockedRouterReplace).toHaveBeenCalledWith({
      pathname: '/field-detail',
      params: { id: '3' },
    });
  });
});
