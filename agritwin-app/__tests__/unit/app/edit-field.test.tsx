import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import EditFieldScreen from '../../../src/app/edit-field';
import { getField, updateField } from '../../../src/services/api';
import { router } from 'expo-router';

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
  isAuthError: jest.fn(() => false),
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
const mockedUpdateField = updateField as jest.MockedFunction<
  typeof updateField
>;

describe('EditFieldScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  });

  it('loads the garden to edit', async () => {
    render(<EditFieldScreen />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Hort')).toBeTruthy();
    });
    expect(screen.getByDisplayValue('Andorra')).toBeTruthy();
  });

  it('saves the garden', async () => {
    mockedUpdateField.mockResolvedValue({
      id: 3,
      name: 'Hort nou',
      location: 'Andorra',
      field_type: 'home_garden',
      soil_type: 'loam',
      size_m2: 40,
      device_count: 0,
    });

    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Hort')).toBeTruthy();
    });
    fireEvent.changeText(screen.getByDisplayValue('Hort'), 'Hort nou');
    fireEvent.press(screen.getByText('settings.accept'));

    await waitFor(() => {
      expect(mockedUpdateField).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ name: 'Hort nou' }),
      );
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/field-detail',
        params: { id: '3' },
      });
    });
  });

  it('rejects an empty name', async () => {
    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Hort')).toBeTruthy();
    });
    fireEvent.changeText(screen.getByDisplayValue('Hort'), '  ');
    fireEvent.press(screen.getByText('settings.accept'));
    expect(screen.getByText('settings.errors.nameRequired')).toBeTruthy();
  });

  it('goes back without saving', async () => {
    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(screen.getByText('settings.cancel')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('settings.cancel'));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/field-detail',
      params: { id: '3' },
    });
  });
});
