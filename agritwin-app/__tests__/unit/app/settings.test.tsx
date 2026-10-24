import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';

import SettingsScreen from '../../../src/app/app/settings';
import {
  getFields,
  getMe,
  isAuthError,
  updateMe,
  updateMyEmail,
} from '../../../src/services/api';
import { clearAuth } from '../../../src/services/auth';
import {
  getCurrentField,
  setCurrentField,
} from '../../../src/services/currentField';

const mockChangeLanguage = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ca', changeLanguage: mockChangeLanguage },
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('../../../src/services/api', () => ({
  getMe: jest.fn(),
  getFields: jest.fn(),
  updateMe: jest.fn(),
  updateMyEmail: jest.fn(),
  isAuthError: jest.fn(() => false),
}));

jest.mock('../../../src/services/auth', () => ({
  clearAuth: jest.fn(),
}));

jest.mock('../../../src/services/currentField', () => ({
  getCurrentField: jest.fn(),
  setCurrentField: jest.fn(),
  subscribeCurrentField: () => () => undefined,
}));

jest.mock('../../../src/components/FieldPhoto', () => ({
  FieldPhoto: () => null,
}));

const mockedGetMe = getMe as jest.MockedFunction<typeof getMe>;
const mockedGetFields = getFields as jest.MockedFunction<typeof getFields>;
const mockedUpdateMe = updateMe as jest.MockedFunction<typeof updateMe>;
const mockedUpdateMyEmail = updateMyEmail as jest.MockedFunction<
  typeof updateMyEmail
>;
const mockedGetCurrentField = getCurrentField as jest.MockedFunction<
  typeof getCurrentField
>;
const mockedIsAuthError = isAuthError as jest.MockedFunction<
  typeof isAuthError
>;

const me = {
  username: 'ainhoa',
  email: 'ainhoa@test.com',
  name: 'Ainhoa',
  language: 'ca',
  notifications_enabled: true,
  weather_alerts_enabled: true,
};

const fields = [
  {
    id: 3,
    name: 'Hort',
    location: 'Andorra',
    field_type: 'home_garden',
    soil_type: 'loam',
    size_m2: 20,
    device_count: 1,
  },
  {
    id: 4,
    name: 'Camp',
    location: 'La Massana',
    field_type: 'open_field',
    soil_type: 'clay',
    size_m2: 100,
    device_count: 2,
  },
];

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetMe.mockResolvedValue(me);
    mockedGetFields.mockResolvedValue(fields);
    mockedGetCurrentField.mockResolvedValue({ id: 3, name: 'Hort' });
    mockedUpdateMe.mockResolvedValue(me);
    mockedUpdateMyEmail.mockResolvedValue({
      ...me,
      email: 'new@test.com',
    });
    mockedIsAuthError.mockReturnValue(false);
  });

  it('loads profile and gardens', async () => {
    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Ainhoa')).toBeTruthy();
    });
    expect(screen.getByText('ainhoa@test.com')).toBeTruthy();
    expect(screen.getByText('Hort')).toBeTruthy();
    expect(screen.getByText('Camp')).toBeTruthy();
  });

  it('uses the first garden when the stored one is gone', async () => {
    mockedGetCurrentField.mockResolvedValue({ id: 99, name: 'Old' });

    render(<SettingsScreen />);

    await waitFor(() => {
      expect(setCurrentField).toHaveBeenCalledWith({ id: 3, name: 'Hort' });
    });
  });

  it('saves a new name', async () => {
    mockedUpdateMe.mockResolvedValue({ ...me, name: 'Nova' });
    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Ainhoa')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Ainhoa'));
    fireEvent.changeText(screen.getByDisplayValue('Ainhoa'), 'Nova');
    fireEvent.press(screen.getByText('settings.accept'));

    await waitFor(() => {
      expect(mockedUpdateMe).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Nova' }),
      );
    });
  });

  it('rejects an empty name', async () => {
    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Ainhoa')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Ainhoa'));
    fireEvent.changeText(screen.getByDisplayValue('Ainhoa'), '  ');
    fireEvent.press(screen.getByText('settings.accept'));

    expect(screen.getByText('settings.errors.nameRequired')).toBeTruthy();
  });

  it('rejects an invalid email', async () => {
    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('ainhoa@test.com')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('ainhoa@test.com'));
    fireEvent.changeText(screen.getByDisplayValue('ainhoa@test.com'), 'nope');
    fireEvent.press(screen.getByText('settings.accept'));

    expect(screen.getByText('settings.errors.invalidEmail')).toBeTruthy();
  });

  it('saves a new email', async () => {
    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('ainhoa@test.com')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('ainhoa@test.com'));
    fireEvent.changeText(
      screen.getByDisplayValue('ainhoa@test.com'),
      'new@test.com',
    );
    fireEvent.press(screen.getByText('settings.accept'));

    await waitFor(() => {
      expect(mockedUpdateMyEmail).toHaveBeenCalledWith('new@test.com');
    });
  });

  it('opens the password screen', async () => {
    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('settings.changePassword')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('settings.changePassword'));
    expect(router.push).toHaveBeenCalledWith('/change-password');
  });

  it('changes language', async () => {
    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('languages.spanish')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('languages.spanish'));

    await waitFor(() => {
      expect(mockChangeLanguage).toHaveBeenCalledWith('es');
      expect(mockedUpdateMe).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'es' }),
      );
    });
  });

  it('opens a garden and can set it as current', async () => {
    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Camp')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Camp'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/field-detail',
      params: { id: '4' },
    });
    fireEvent.press(screen.getByText('settings.setCurrent'));
    await waitFor(() => {
      expect(setCurrentField).toHaveBeenCalledWith({ id: 4, name: 'Camp' });
    });
  });

  it('logs out', async () => {
    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('settings.logout')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('settings.logout'));
    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('redirects when the session is not valid', async () => {
    mockedGetMe.mockRejectedValue(new Error('Not authenticated'));
    mockedIsAuthError.mockReturnValue(true);

    render(<SettingsScreen />);

    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('opens create garden from profile', async () => {
    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('settings.addGarden')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('settings.addGarden'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/create-field',
      params: { from: 'profile' },
    });
  });

  it('shows an empty gardens message', async () => {
    mockedGetFields.mockResolvedValue([]);
    mockedGetCurrentField.mockResolvedValue(null);

    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('settings.emptyGardens')).toBeTruthy();
    });
  });
});
