import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import FieldDetailScreen from '../../../src/app/field-detail';
import { getDashboard, getField } from '../../../src/services/api';
import { router } from 'expo-router';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: '3' }),
}));

jest.mock('../../../src/services/api', () => ({
  getField: jest.fn(),
  getDashboard: jest.fn(),
  isAuthError: () => false,
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
    mockedGetField.mockResolvedValue({
      id: 3,
      name: 'Hort',
      location: 'Andorra',
      field_type: 'home_garden',
      soil_type: 'loam',
      size_m2: 40,
      device_count: 1,
      devices: [{ id: 'dev-1', battery_status: true }],
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
