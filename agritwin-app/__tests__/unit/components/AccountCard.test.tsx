import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';

import { AccountCard } from '../../../src/components/AccountCard';
import {
  getMe,
  isAuthError,
  updateMe,
  updateMyEmail,
} from '../../../src/services/api';
import { clearAuth } from '../../../src/services/auth';

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
  updateMe: jest.fn(),
  updateMyEmail: jest.fn(),
  isAuthError: jest.fn(() => false),
}));

jest.mock('../../../src/services/auth', () => ({
  clearAuth: jest.fn(),
}));

const mockedGetMe = getMe as jest.MockedFunction<typeof getMe>;
const mockedUpdateMe = updateMe as jest.MockedFunction<typeof updateMe>;
const mockedUpdateMyEmail = updateMyEmail as jest.MockedFunction<
  typeof updateMyEmail
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

describe('AccountCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetMe.mockResolvedValue(me);
    mockedUpdateMe.mockResolvedValue(me);
    mockedUpdateMyEmail.mockResolvedValue({ ...me, email: 'new@test.com' });
    mockedIsAuthError.mockReturnValue(false);
  });

  it('loads the account data', async () => {
    render(<AccountCard />);

    await waitFor(() => {
      expect(screen.getByText('Ainhoa')).toBeTruthy();
    });
    expect(screen.getByText('ainhoa@test.com')).toBeTruthy();
  }, 15000);

  it('saves a new name', async () => {
    mockedUpdateMe.mockResolvedValue({ ...me, name: 'Nova' });
    render(<AccountCard />);

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
    render(<AccountCard />);

    await waitFor(() => {
      expect(screen.getByText('Ainhoa')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Ainhoa'));
    fireEvent.changeText(screen.getByDisplayValue('Ainhoa'), '  ');
    fireEvent.press(screen.getByText('settings.accept'));

    expect(screen.getByText('settings.errors.nameRequired')).toBeTruthy();
  });

  it('rejects an invalid email', async () => {
    render(<AccountCard />);

    await waitFor(() => {
      expect(screen.getByText('ainhoa@test.com')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('ainhoa@test.com'));
    fireEvent.changeText(screen.getByDisplayValue('ainhoa@test.com'), 'nope');
    fireEvent.press(screen.getByText('settings.accept'));

    expect(screen.getByText('settings.errors.invalidEmail')).toBeTruthy();
  });

  it('saves a new email', async () => {
    render(<AccountCard />);

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
    render(<AccountCard />);

    await waitFor(() => {
      expect(screen.getByText('Ainhoa')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('settings.changePassword'));
    expect(router.push).toHaveBeenCalledWith('/change-password');
  });

  it('changes language', async () => {
    render(<AccountCard />);

    await waitFor(() => {
      expect(screen.getByText('Ainhoa')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('languages.spanish'));

    await waitFor(() => {
      expect(mockChangeLanguage).toHaveBeenCalledWith('es');
      expect(mockedUpdateMe).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'es' }),
      );
    });
  });

  it('logs out', async () => {
    render(<AccountCard />);

    await waitFor(() => {
      expect(screen.getByText('Ainhoa')).toBeTruthy();
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

    render(<AccountCard />);

    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
    });
  });
});
