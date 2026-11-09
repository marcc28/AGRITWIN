
import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { router } from 'expo-router';

import { login } from '../../../src/services/api';
import { setAuth } from '../../../src/services/auth';
import { routeAfterAuth } from '../../../src/services/routeAfterAuth';

import LoginScreen from '../../../src/app/auth/login';

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
}));

jest.mock('../../../src/services/routeAfterAuth', () => ({
  routeAfterAuth: jest.fn(),
}));

jest.mock('../../../src/services/api', () => ({
  login: jest.fn(),
}));

jest.mock('../../../src/services/auth', () => ({
  setAuth: jest.fn(),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../../src/components/Alert', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View, Text } =
    jest.requireActual<typeof import('react-native')>('react-native');

  return function Alert({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <View>
        <Text>{title}</Text>
        <Text>{children}</Text>
      </View>
    );
  };
});

jest.mock('../../../assets/images/google.png', () => 'google.png');
jest.mock('../../../assets/images/instagram.png', () => 'instagram.png');
jest.mock('../../../assets/images/twitter.png', () => 'twitter.png');

const mockedLogin = login as jest.MockedFunction<typeof login>;
const mockedSetAuth = setAuth as jest.MockedFunction<typeof setAuth>;

const mockedRouterPush = router.push as jest.MockedFunction<typeof router.push>;

const mockedRouterReplace = router.replace as jest.MockedFunction<
  typeof router.replace
>;

const mockedRouteAfterAuth = routeAfterAuth as jest.MockedFunction<
  typeof routeAfterAuth
>;

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedLogin.mockReset();
    mockedSetAuth.mockReset();
    mockedRouteAfterAuth.mockReset();
  });

  describe('rendering', () => {
    it('renders the login screen correctly', () => {
      render(<LoginScreen />);

      expect(screen.getByTestId('login-title')).toBeTruthy();
      expect(screen.getByTestId('login-subtitle')).toBeTruthy();

      expect(screen.getByTestId('username-input')).toBeTruthy();
      expect(screen.getByTestId('password-input')).toBeTruthy();

      expect(screen.getByTestId('social-login')).toBeTruthy();

      // Els proveïdors socials implementats actualment.
      expect(screen.getByTestId('google-button')).toBeTruthy();
      expect(screen.getByTestId('facebook-button')).toBeTruthy();
      expect(screen.getByTestId('x-button')).toBeTruthy();

      expect(screen.queryByTestId('instagram-button')).toBeNull();
      expect(screen.queryByTestId('twitter-button')).toBeNull();

      expect(screen.getByTestId('signup-button')).toBeTruthy();
      expect(screen.getByTestId('login-button')).toBeTruthy();
    });
  });

  describe('form validation', () => {
    it('shows an error when username and password are empty', async () => {
      render(<LoginScreen />);

      fireEvent.press(screen.getByTestId('login-button'));

      expect(await screen.findByTestId('login-error')).toBeTruthy();
      expect(mockedLogin).not.toHaveBeenCalled();
    });

    it('shows an error when username is empty', async () => {
      render(<LoginScreen />);

      fireEvent.changeText(
        screen.getByTestId('password-input'),
        'Password123',
      );

      fireEvent.press(screen.getByTestId('login-button'));

      expect(await screen.findByTestId('login-error')).toBeTruthy();
      expect(mockedLogin).not.toHaveBeenCalled();
    });

    it('shows an error when password is empty', async () => {
      render(<LoginScreen />);

      fireEvent.changeText(
        screen.getByTestId('username-input'),
        'testuser',
      );

      fireEvent.press(screen.getByTestId('login-button'));

      expect(await screen.findByTestId('login-error')).toBeTruthy();
      expect(mockedLogin).not.toHaveBeenCalled();
    });
  });

  describe('successful login', () => {
    it('calls login with the correct data', async () => {
      mockedLogin.mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      } as never);

      mockedSetAuth.mockResolvedValue(undefined);

      render(<LoginScreen />);

      fireEvent.changeText(
        screen.getByTestId('username-input'),
        '  testuser  ',
      );

      fireEvent.changeText(
        screen.getByTestId('password-input'),
        '  Password123  ',
      );

      fireEvent.press(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockedLogin).toHaveBeenCalledTimes(1);
      });

      expect(mockedLogin).toHaveBeenCalledWith(
        'testuser',
        'Password123',
      );
    });

    it('saves authentication data after successful login', async () => {
      mockedLogin.mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      } as never);

      mockedSetAuth.mockResolvedValue(undefined);

      render(<LoginScreen />);

      fireEvent.changeText(
        screen.getByTestId('username-input'),
        'testuser',
      );

      fireEvent.changeText(
        screen.getByTestId('password-input'),
        'Password123',
      );

      fireEvent.press(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockedSetAuth).toHaveBeenCalledTimes(1);
      });

      expect(mockedSetAuth).toHaveBeenCalledWith(
        'testuser',
        'access-token',
        'refresh-token',
      );
    });

    it('navigates after successful login', async () => {
      mockedLogin.mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      } as never);

      mockedSetAuth.mockResolvedValue(undefined);
      mockedRouteAfterAuth.mockResolvedValue(undefined);

      render(<LoginScreen />);

      fireEvent.changeText(
        screen.getByTestId('username-input'),
        'testuser',
      );

      fireEvent.changeText(
        screen.getByTestId('password-input'),
        'Password123',
      );

      fireEvent.press(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockedRouteAfterAuth).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('login errors', () => {
    it('shows the API error message when login fails', async () => {
      mockedLogin.mockRejectedValue(
        new Error('Contrasenya incorrecta'),
      );

      render(<LoginScreen />);

      fireEvent.changeText(
        screen.getByTestId('username-input'),
        'testuser',
      );

      fireEvent.changeText(
        screen.getByTestId('password-input'),
        'WrongPassword',
      );

      fireEvent.press(screen.getByTestId('login-button'));

      expect(await screen.findByTestId('login-error')).toBeTruthy();
      expect(
        screen.getByText('Contrasenya incorrecta'),
      ).toBeTruthy();

      expect(mockedRouterReplace).not.toHaveBeenCalled();
    });

    it('shows an error when login rejects with a non-Error value', async () => {
      mockedLogin.mockRejectedValue('login failed');

      render(<LoginScreen />);

      fireEvent.changeText(
        screen.getByTestId('username-input'),
        'testuser',
      );

      fireEvent.changeText(
        screen.getByTestId('password-input'),
        'Password123',
      );

      fireEvent.press(screen.getByTestId('login-button'));

      expect(await screen.findByTestId('login-error')).toBeTruthy();
      expect(mockedLogin).toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('navigates to Sign Up when Sign Up is pressed', () => {
      render(<LoginScreen />);

      fireEvent.press(screen.getByTestId('signup-button'));

      expect(mockedRouterPush).toHaveBeenCalledWith('/auth/signup');
    });
  });

  describe('input behaviour', () => {
    it('clears an error when the username changes', async () => {
      render(<LoginScreen />);

      fireEvent.press(screen.getByTestId('login-button'));

      expect(await screen.findByTestId('login-error')).toBeTruthy();

      fireEvent.changeText(
        screen.getByTestId('username-input'),
        'testuser',
      );

      expect(screen.queryByTestId('login-error')).toBeNull();
    });

    it('clears an error when the password changes', async () => {
      render(<LoginScreen />);

      fireEvent.press(screen.getByTestId('login-button'));

      expect(await screen.findByTestId('login-error')).toBeTruthy();

      fireEvent.changeText(
        screen.getByTestId('password-input'),
        'Password123',
      );

      expect(screen.queryByTestId('login-error')).toBeNull();
    });

    it('uses secure text entry for the password', () => {
      render(<LoginScreen />);

      expect(
        screen.getByTestId('password-input').props.secureTextEntry,
      ).toBe(true);
    });
  });
});
