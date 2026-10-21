import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import CreateFieldScreen from '../../../src/app/create-field';
import { createField } from '../../../src/services/api';
import { router } from 'expo-router';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: () => ({ from: 'profile' }),
}));

jest.mock('../../../src/services/api', () => ({
  createField: jest.fn(),
  createDevice: jest.fn(),
  geocodeLocation: jest.fn(),
  isAuthError: () => false,
}));

jest.mock('../../../src/services/auth', () => ({
  clearAuth: jest.fn(),
}));

jest.mock('../../../src/services/currentField', () => ({
  setCurrentField: jest.fn(),
}));

jest.mock('../../../src/services/fieldPhoto', () => ({
  setFieldPhotoIndex: jest.fn(),
}));

const mockedCreateField = createField as jest.MockedFunction<
  typeof createField
>;

describe('CreateFieldScreen', () => {
  it('creates a garden from the profile form', async () => {
    mockedCreateField.mockResolvedValue({
      id: 8,
      name: 'Hort nou',
      location: 'Andorra',
      field_type: 'home_garden',
      soil_type: 'loam',
      size_m2: 20,
      device_count: 0,
    });

    render(<CreateFieldScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'Hort nou',
    );
    fireEvent.press(screen.getByText('settings.createField.submitNext'));

    await waitFor(() => {
      expect(mockedCreateField).toHaveBeenCalled();
    });
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/field-detail',
      params: { id: '8' },
    });
  });
});
