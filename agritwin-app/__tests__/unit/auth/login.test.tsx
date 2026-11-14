
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

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    LinearGradient: ({ children, ...props }: any) =>
      React.createElement(View, props, children),
  };
});

// Aïllem el component de càrrega per poder comprovar-ne la visualització.
jest.mock('../../../src/components/AgritwinLoadingScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  return function MockAgritwinLoadingScreen({
    label,
  }: {
    label: string;
  }) {
    return (
      <View testID="loading-screen">
        <Text>{label}</Text>
      </View>
    );
  };
});

// Aïllem els botons socials.
jest.mock('../../../src/components/SocialLoginButtons', () => {
  const React = require('react');
  const { View, Pressable, Text } = require('react-native');

  return function MockSocialLoginButtons() {
    return (
      <View>
        <Pressable testID="google-button">
          <Text>Google</Text>
        </Pressable>

        <Pressable testID="facebook-button">
          <Text>Facebook</Text>
        </Pressable>

        <Pressable testID="x-button">
          <Text>X</Text>
        </Pressable>
      </View>
    );
  };
});

jest.mock('../../../src/components/Alert', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  return function MockAlert({
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

const mockedRouterPush = router.push as jest.MockedFunction<
  typeof router.push
>;

const mockedRouteAfterAuth = routeAfterAuth as jest.MockedFunction<
  typeof routeAfterAuth
>;

const successfulLoginResponse = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
};

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedLogin.mockReset();
    mockedSetAuth.mockReset();
    mockedRouteAfterAuth.mockReset();

    mockedSetAuth.mockResolvedValue(undefined);
    mockedRouteAfterAuth.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('renders the login screen correctly', () => {
      render(<LoginScreen />);

      expect(screen.getByTestId('login-title')).toBeTruthy();
      expect(screen.getByTestId('login-subtitle')).toBeTruthy();

      expect(screen.getByTestId('username-input')).toBeTruthy();
      expect(screen.getByTestId('password-input')).toBeTruthy();

      expect(screen.getByTestId('social-login')).toBeTruthy();

      expect(screen.getByTestId('google-button')).toBeTruthy();
      expect(screen.getByTestId('facebook-button')).toBeTruthy();
      expect(screen.getByTestId('x-button')).toBeTruthy();

      expect(screen.getByTestId('signup-button')).toBeTruthy();
      expect(screen.getByTestId('login-button')).toBeTruthy();

      expect(screen.getByTestId('forgot-password-link')).toBeTruthy();
    });

    it('does not display the loading screen initially', () => {
      render(<LoginScreen />);

      expect(screen.queryByTestId('loading-screen')).toBeNull();
    });

    it('uses secure text entry for the password', () => {
      render(<LoginScreen />);

      expect(
        screen.getByTestId('password-input').props.secureTextEntry,
      ).toBe(true);
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
    beforeEach(() => {
      mockedLogin.mockResolvedValue(successfulLoginResponse as never);
    });

    it('calls login with trimmed username and password', async () => {
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
        expect(mockedLogin).toHaveBeenCalledWith(
          'testuser',
          'Password123',
        );
      });
    });

    it('shows the loading screen during authentication', async () => {
      let resolveLogin!: (value: typeof successfulLoginResponse) => void;

      mockedLogin.mockReturnValue(
        new Promise((resolve) => {
          resolveLogin = resolve;
        }) as never,
      );

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

      expect(await screen.findByTestId('loading-screen')).toBeTruthy();

      expect(
        screen.getByText('login.loggingIn'),
      ).toBeTruthy();

      resolveLogin(successfulLoginResponse);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-screen')).toBeNull();
      });
    });

    it('saves authentication data after successful login', async () => {
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
        expect(mockedSetAuth).toHaveBeenCalledWith(
          'testuser',
          'access-token',
          'refresh-token',
        );
      });
    });

    it('navigates after successful authentication', async () => {
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

    it('calls authentication steps in the correct order', async () => {
      const calls: string[] = [];

      mockedLogin.mockImplementation(async () => {
        calls.push('login');
        return successfulLoginResponse as never;
      });

      mockedSetAuth.mockImplementation(async () => {
        calls.push('setAuth');
      });

      mockedRouteAfterAuth.mockImplementation(async () => {
        calls.push('routeAfterAuth');
      });

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
        expect(calls).toEqual([
          'login',
          'setAuth',
          'routeAfterAuth',
        ]);
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
        await screen.findByText('Contrasenya incorrecta'),
      ).toBeTruthy();

      expect(mockedSetAuth).not.toHaveBeenCalled();
      expect(mockedRouteAfterAuth).not.toHaveBeenCalled();
    });

    it('uses the translated fallback for non-Error failures', async () => {
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

      expect(
        await screen.findByText('login.errors.invalidCredentials'),
      ).toBeTruthy();
    });

    it('shows an error when saving authentication fails', async () => {
      mockedLogin.mockResolvedValue(successfulLoginResponse as never);

      mockedSetAuth.mockRejectedValue(
        new Error('No s\'ha pogut guardar la sessió'),
      );

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

      expect(
        await screen.findByText('No s\'ha pogut guardar la sessió'),
      ).toBeTruthy();

      expect(mockedRouteAfterAuth).not.toHaveBeenCalled();
    });

    it('shows an error when post-login navigation fails', async () => {
      mockedLogin.mockResolvedValue(successfulLoginResponse as never);
      mockedRouteAfterAuth.mockRejectedValue(
        new Error('Navigation failed'),
      );

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

      expect(
        await screen.findByText('Navigation failed'),
      ).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('navigates to Sign Up when pressed', () => {
      render(<LoginScreen />);

      fireEvent.press(screen.getByTestId('signup-button'));

      expect(mockedRouterPush).toHaveBeenCalledWith(
        '/auth/signup',
      );
    });

    it('navigates to Forgot Password when pressed', () => {
      render(<LoginScreen />);

      fireEvent.press(
        screen.getByTestId('forgot-password-link'),
      );

      expect(mockedRouterPush).toHaveBeenCalledWith(
        '/auth/forgot-password',
      );
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

    it('disables inputs while authentication is in progress', async () => {
      let resolveLogin!: (value: typeof successfulLoginResponse) => void;

      mockedLogin.mockReturnValue(
        new Promise((resolve) => {
          resolveLogin = resolve;
        }) as never,
      );

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

      await screen.findByTestId('loading-screen');

      // El formulari queda substituït per la pantalla de càrrega.
      expect(screen.queryByTestId('username-input')).toBeNull();
      expect(screen.queryByTestId('password-input')).toBeNull();

      resolveLogin(successfulLoginResponse);

      await waitFor(() => {
        expect(screen.getByTestId('username-input')).toBeTruthy();
      });
    });
  });
});
