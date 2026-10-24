import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import AppHeader from '../../../src/components/AppHeader';
import { getFields } from '../../../src/services/api';
import { getAuth } from '../../../src/services/auth';
import { getCurrentField } from '../../../src/services/currentField';
import { setGardenPicker } from '../../../src/services/gardenPicker';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../../../src/services/api', () => ({
  getFields: jest.fn(),
  isAuthError: () => false,
}));

jest.mock('../../../src/services/auth', () => ({
  getAuth: jest.fn(),
  clearAuth: jest.fn(),
}));

jest.mock('../../../src/services/currentField', () => ({
  getCurrentField: jest.fn(),
  setCurrentField: jest.fn(),
  subscribeCurrentField: () => () => undefined,
}));

jest.mock('../../../src/services/gardenPicker', () => ({
  getGardenPicker: () => ({ open: false, fields: [], currentId: null }),
  setGardenPicker: jest.fn(),
  subscribeGardenPicker: () => () => undefined,
}));

const mockedGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockedGetFields = getFields as jest.MockedFunction<typeof getFields>;
const mockedGetCurrentField = getCurrentField as jest.MockedFunction<
  typeof getCurrentField
>;

describe('AppHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockResolvedValue({
      token: 'token',
      refreshToken: null,
      username: 'ainhoa',
    });
    mockedGetCurrentField.mockResolvedValue({ id: 3, name: 'Hort' });
    mockedGetFields.mockResolvedValue([
      {
        id: 3,
        name: 'Hort',
        location: null,
        field_type: null,
        soil_type: null,
        size_m2: null,
        device_count: 0,
      },
      {
        id: 4,
        name: 'Camp',
        location: null,
        field_type: null,
        soil_type: null,
        size_m2: null,
        device_count: 0,
      },
    ]);
  });

  it('shows AGRITWIN and the current garden', async () => {
    render(<AppHeader />);

    expect(screen.getByText('AGRITWIN')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('Hort')).toBeTruthy();
    });
  });

  it('opens the garden picker when there are several gardens', async () => {
    render(<AppHeader />);

    await waitFor(() => {
      expect(screen.getByLabelText('Hort')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('Hort'));
    await waitFor(() => {
      expect(setGardenPicker).toHaveBeenCalledWith(
        expect.objectContaining({ open: true, currentId: 3 }),
      );
    });
  });

  it('hides the garden button when there is no session', async () => {
    mockedGetAuth.mockResolvedValue(null);
    render(<AppHeader />);
    expect(screen.getByText('AGRITWIN')).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByText('Hort')).toBeNull();
    });
  });

  it('uses the first garden when the stored one is gone', async () => {
    mockedGetCurrentField.mockResolvedValue({ id: 99, name: 'Old' });
    render(<AppHeader />);
    await waitFor(() => {
      expect(screen.getByText('Hort')).toBeTruthy();
    });
  });
});
