import React from 'react';

import { render, screen, waitFor } from '@testing-library/react-native';

import EditFieldScreen from '../../../src/app/edit-field';
import { getField } from '../../../src/services/api';

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
  getField: jest.fn(),
  updateField: jest.fn(),
  createDevice: jest.fn(),
  updateDevice: jest.fn(),
  deleteDevice: jest.fn(),
  isAuthError: () => false,
}));

jest.mock('../../../src/services/auth', () => ({
  clearAuth: jest.fn(),
}));

jest.mock('../../../src/services/currentField', () => ({
  getCurrentField: jest.fn(async () => ({ id: 3, name: 'Hort' })),
  setCurrentField: jest.fn(),
}));

jest.mock('../../../src/services/fieldPhoto', () => ({
  getFieldPhotoIndex: jest.fn(async () => 1),
  setFieldPhotoIndex: jest.fn(),
}));

const mockedGetField = getField as jest.MockedFunction<typeof getField>;

describe('EditFieldScreen', () => {
  it('loads the garden to edit', async () => {
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

    render(<EditFieldScreen />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Hort')).toBeTruthy();
    });
    expect(screen.getByDisplayValue('Andorra')).toBeTruthy();
  });
});
