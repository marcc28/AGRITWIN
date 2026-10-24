import React from 'react';

import { render, screen, waitFor } from '@testing-library/react-native';

import FieldDataScreen from '../../../src/app/field-data';
import { getDashboard } from '../../../src/services/api';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: '3' }),
}));

jest.mock('../../../src/services/api', () => ({
  getDashboard: jest.fn(),
  isAuthError: () => false,
}));

jest.mock('../../../src/services/auth', () => ({
  clearAuth: jest.fn(),
}));

jest.mock('../../../src/components/SensorModal', () => ({
  SensorModal: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return <Text>sensor-modal</Text>;
  },
}));

const mockedGetDashboard = getDashboard as jest.MockedFunction<
  typeof getDashboard
>;

describe('FieldDataScreen', () => {
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
});
