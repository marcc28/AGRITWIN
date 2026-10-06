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

import LoginScreen from '../../../src/app/auth/login';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('../../../src/services/api', () => ({
  login: jest.fn(),
}));

jest.mock('../../../src/services/auth', () => ({
  setAuth: jest.fn(),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({
    children,
  }: {
    children: React.ReactNode;
  }) => children,
}));

jest.mock('../../../src/components/Alert', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

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
const mockedRouterReplace =
  router.replace as jest.MockedFunction<typeof router.replace>;
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'login.title': 'Inicia sessió',
        'login.username': "Nom d'usuari",
        'login.password': 'Contrasenya',
        'login.socialLogin': 'O inicia sessió amb',
        'login.signUp': 'Sign Up',
        'login.logIn': 'Log In',
        'login.loggingIn': 'Logging in...',
        'login.errors.usernameAndPassword':
          'Introdueix el nom d’usuari i la contrasenya',
        'login.errors.username': 'Introdueix el nom d’usuari',
        'login.errors.password': 'Introdueix la contrasenya',
        'login.errors.invalidCredentials':
          'Contrasenya incorrecta. Fes sign up si no tens compte.',
        'common.error': 'Error',
      };

      return translations[key] ?? key;
    },
  }),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the login screen correctly', () => {
      render(<LoginScreen />);

      expect(screen.getByText('AgriTwin')).toBeTruthy();
      expect(screen.getByText('Inicia sessió')).toBeTruthy();

      expect(
        screen.getByPlaceholderText("Nom d'usuari"),
      ).toBeTruthy();

      expect(
        screen.getByPlaceholderText('Contrasenya'),
      ).toBeTruthy();

      expect(screen.getByText('O inicia sessió amb')).toBeTruthy();
      expect(screen.getByText('Sign Up')).toBeTruthy();
      expect(screen.getByText('Log In')).toBeTruthy();
    });
  });

  describe('form validation', () => {
    it('shows an error when username and password are empty', async () => {
      render(<LoginScreen />);

      fireEvent.press(screen.getByText('Log In'));

      expect(
        await screen.findByText(
          'Introdueix el nom d’usuari i la contrasenya',
        ),
      ).toBeTruthy();

      expect(mockedLogin).not.toHaveBeenCalled();
    });

    it('shows an error when username is empty', async () => {
      render(<LoginScreen />);

      fireEvent.changeText(
        screen.getByPlaceholderText('Contrasenya'),
        'Password123',
      );

      fireEvent.press(screen.getByText('Log In'));

      expect(
        await screen.findByText('Introdueix el nom d’usuari'),
      ).toBeTruthy();

      expect(mockedLogin).not.toHaveBeenCalled();
    });

    it('shows an error when password is empty', async () => {
      render(<LoginScreen />);

      fireEvent.changeText(
        screen.getByPlaceholderText("Nom d'usuari"),
        'testuser',
      );

      fireEvent.press(screen.getByText('Log In'));

      expect(
        await screen.findByText('Introdueix la contrasenya'),
      ).toBeTruthy();

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
        screen.getByPlaceholderText("Nom d'usuari"),
        '  testuser  ',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Contrasenya'),
        '  Password123  ',
      );

      fireEvent.press(screen.getByText('Log In'));

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
        screen.getByPlaceholderText("Nom d'usuari"),
        'testuser',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Contrasenya'),
        'Password123',
      );

      fireEvent.press(screen.getByText('Log In'));

      await waitFor(() => {
        expect(mockedSetAuth).toHaveBeenCalledTimes(1);
      });

      expect(mockedSetAuth).toHaveBeenCalledWith(
        'testuser',
        'access-token',
        'refresh-token',
      );
    });

    it('navigates to home after successful login', async () => {
      mockedLogin.mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      } as never);

      mockedSetAuth.mockResolvedValue(undefined);

      render(<LoginScreen />);

      fireEvent.changeText(
        screen.getByPlaceholderText("Nom d'usuari"),
        'testuser',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Contrasenya'),
        'Password123',
      );

      fireEvent.press(screen.getByText('Log In'));

      await waitFor(() => {
        expect(mockedRouterReplace).toHaveBeenCalledWith('/app/home');
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
        screen.getByPlaceholderText("Nom d'usuari"),
        'testuser',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Contrasenya'),
        'WrongPassword',
      );

      fireEvent.press(screen.getByText('Log In'));

      expect(
        await screen.findByText('Contrasenya incorrecta'),
      ).toBeTruthy();

      expect(mockedRouterReplace).not.toHaveBeenCalled();
    });

    it('shows the default error when the API rejects with a non-Error', async () => {
      mockedLogin.mockRejectedValue('login failed');

      render(<LoginScreen />);

      fireEvent.changeText(
        screen.getByPlaceholderText("Nom d'usuari"),
        'testuser',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Contrasenya'),
        'Password123',
      );

      fireEvent.press(screen.getByText('Log In'));

      expect(
        await screen.findByText(
          'Contrasenya incorrecta. Fes sign up si no tens compte.',
        ),
      ).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('navigates to Sign Up when Sign Up is pressed', () => {
      render(<LoginScreen />);

      fireEvent.press(screen.getByText('Sign Up'));

      expect(mockedRouterPush).toHaveBeenCalledWith('/auth/signup');
    });
  });

  describe('input behaviour', () => {
    it('clears an error when the username changes', async () => {
      render(<LoginScreen />);

      fireEvent.press(screen.getByText('Log In'));

      expect(
        await screen.findByText(
          'Introdueix el nom d’usuari i la contrasenya',
        ),
      ).toBeTruthy();

      fireEvent.changeText(
        screen.getByPlaceholderText("Nom d'usuari"),
        'testuser',
      );

      expect(
        screen.queryByText(
          'Introdueix el nom d’usuari i la contrasenya',
        ),
      ).toBeNull();
    });

    it('clears an error when the password changes', async () => {
      render(<LoginScreen />);

      fireEvent.press(screen.getByText('Log In'));

      expect(
        await screen.findByText(
          'Introdueix el nom d’usuari i la contrasenya',
        ),
      ).toBeTruthy();

      fireEvent.changeText(
        screen.getByPlaceholderText('Contrasenya'),
        'Password123',
      );

      expect(
        screen.queryByText(
          'Introdueix el nom d’usuari i la contrasenya',
        ),
      ).toBeNull();
    });

    it('uses secure text entry for the password', () => {
      render(<LoginScreen />);

      expect(
        screen.getByPlaceholderText('Contrasenya').props.secureTextEntry,
      ).toBe(true);
    });
  });
});