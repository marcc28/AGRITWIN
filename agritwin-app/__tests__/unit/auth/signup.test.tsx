import React from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import {
  signup,
  getPrivacyPolicy,
  getSecurityPolicy,
} from '../../../src/services/api';

import SignupScreen from '../../../src/app/auth/signup';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('../../../src/services/api', () => ({
  signup: jest.fn(),
  getPrivacyPolicy: jest.fn(),
  getSecurityPolicy: jest.fn(),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
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

const mockedSignup = signup as jest.MockedFunction<typeof signup>;
const mockedGetPrivacyPolicy =
  getPrivacyPolicy as jest.MockedFunction<typeof getPrivacyPolicy>;
const mockedGetSecurityPolicy =
  getSecurityPolicy as jest.MockedFunction<typeof getSecurityPolicy>;

const mockedRouterPush = router.push as jest.MockedFunction<typeof router.push>;

const getPrivacyCheckbox = () =>
  screen.getByLabelText('Accept privacy notice');
const getSecurityCheckbox = () =>
  screen.getByLabelText('Accept security policy');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'signup.title': 'Crear compte',
        'signup.errors.requiredFields': 'Omple tots els camps',
        'signup.errors.invalidEmail': "Format d'email incorrecte",
        'signup.errors.passwordMismatch':
          'Les contrasenyes no coincideixen',
        'signup.errors.privacyRequired':
          'Has d’acceptar la Privacy Notice',
        'signup.errors.securityRequired':
          'Has d’acceptar la Security Policy',
        'signup.errors.createFailed':
          'No s’ha pogut crear el compte',
        'signup.success': "El compte s'ha creat correctament",
      };

      return translations[key] ?? key;
    },
  }),
}));

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the signup screen correctly', () => {
      render(<SignupScreen />);

      expect(screen.getByText('AgriTwin')).toBeTruthy();
      expect(screen.getByText('Crear compte')).toBeTruthy();

      expect(screen.getByPlaceholderText('Nom d\'usuari')).toBeTruthy();
      expect(screen.getByPlaceholderText('Contrasenya')).toBeTruthy();
      expect(screen.getByPlaceholderText('Repetir contrasenya')).toBeTruthy();
      expect(screen.getByPlaceholderText('Email')).toBeTruthy();

      expect(screen.getByText('Privacy Notice')).toBeTruthy();
      expect(screen.getByText('Security Policy')).toBeTruthy();

      expect(screen.getByText('Log In')).toBeTruthy();
      expect(screen.getByText('Sign Up')).toBeTruthy();
    });
  });

  describe('form validation', () => {
    it('shows an error when fields are empty', async () => {
      render(<SignupScreen />);

      fireEvent.press(screen.getByText('Sign Up'));

      expect(
        await screen.findByText('Omple tots els camps'),
      ).toBeTruthy();

      expect(mockedSignup).not.toHaveBeenCalled();
    });

    it('shows an error when passwords do not match', async () => {
      render(<SignupScreen />);

      fireEvent.changeText(
        screen.getByPlaceholderText('Nom d\'usuari'),
        'testuser',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Email'),
        'test@example.com',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Contrasenya'),
        'Password123',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Repetir contrasenya'),
        'DifferentPassword',
      );

      fireEvent.press(screen.getByText('Sign Up'));

      expect(
        await screen.findByText('Les contrasenyes no coincideixen'),
      ).toBeTruthy();

      expect(mockedSignup).not.toHaveBeenCalled();
    });

    it('requires the privacy policy to be accepted', async () => {
      render(<SignupScreen />);

      fireEvent.changeText(
        screen.getByPlaceholderText('Nom d\'usuari'),
        'testuser',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Email'),
        'test@example.com',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Contrasenya'),
        'Password123',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Repetir contrasenya'),
        'Password123',
      );

      fireEvent.press(screen.getByText('Sign Up'));

      expect(
        await screen.findByText('Has d’acceptar la Privacy Notice'),
      ).toBeTruthy();

      expect(mockedSignup).not.toHaveBeenCalled();
    });

    it('requires the security policy to be accepted', async () => {
      render(<SignupScreen />);

      fireEvent.changeText(
        screen.getByPlaceholderText('Nom d\'usuari'),
        'testuser',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Email'),
        'test@example.com',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Contrasenya'),
        'Password123',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Repetir contrasenya'),
        'Password123',
      );

      fireEvent.press(getPrivacyCheckbox());

      fireEvent.press(screen.getByText('Sign Up'));

      expect(
        await screen.findByText('Has d’acceptar la Security Policy'),
      ).toBeTruthy();

      expect(mockedSignup).not.toHaveBeenCalled();
    });

    it('rejects an invalid email', async () => {
      render(<SignupScreen />);

      fireEvent.changeText(
        screen.getByPlaceholderText('Nom d\'usuari'),
        'testuser',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Email'),
        'invalid-email',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Contrasenya'),
        'Password123',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Repetir contrasenya'),
        'Password123',
      );

      fireEvent.press(getPrivacyCheckbox());
      fireEvent.press(getSecurityCheckbox());

      fireEvent.press(screen.getByText('Sign Up'));

      expect(
        await screen.findByText("Format d'email incorrecte"),
      ).toBeTruthy();

      expect(mockedSignup).not.toHaveBeenCalled();
    });
  });

  describe('successful signup', () => {
    it('calls signup with the correct data', async () => {
      mockedSignup.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      } as never);

      render(<SignupScreen />);

      fireEvent.changeText(
        screen.getByPlaceholderText('Nom d\'usuari'),
        '  testuser  ',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Email'),
        '  test@example.com  ',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Contrasenya'),
        'Password123',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Repetir contrasenya'),
        'Password123',
      );

      fireEvent.press(getPrivacyCheckbox());
      fireEvent.press(getSecurityCheckbox());

      fireEvent.press(screen.getByText('Sign Up'));

      await waitFor(() => {
        expect(mockedSignup).toHaveBeenCalledTimes(1);
      });

      expect(mockedSignup).toHaveBeenCalledWith(
        'testuser',
        'test@example.com',
        'Password123',
        'Password123',
        true,
        true,
      );
    });

    it('shows the success message after signup', async () => {
      mockedSignup.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      } as never);

      render(<SignupScreen />);

      fireEvent.changeText(
        screen.getByPlaceholderText('Nom d\'usuari'),
        'testuser',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Email'),
        'test@example.com',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Contrasenya'),
        'Password123',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Repetir contrasenya'),
        'Password123',
      );

      fireEvent.press(getPrivacyCheckbox());
      fireEvent.press(getSecurityCheckbox());

      fireEvent.press(screen.getByText('Sign Up'));

      expect(
        await screen.findByText("El compte s'ha creat correctament"),
      ).toBeTruthy();
    });

    it('navigates to login after successful signup', async () => {
      jest.useFakeTimers();

      mockedSignup.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      } as never);

      render(<SignupScreen />);

      fireEvent.changeText(
        screen.getByPlaceholderText('Nom d\'usuari'),
        'testuser',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Email'),
        'test@example.com',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Contrasenya'),
        'Password123',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Repetir contrasenya'),
        'Password123',
      );

      fireEvent.press(getPrivacyCheckbox());
      fireEvent.press(getSecurityCheckbox());

      fireEvent.press(screen.getByText('Sign Up'));

      await waitFor(() => {
        expect(
          screen.getByText("El compte s'ha creat correctament"),
        ).toBeTruthy();
      });

      jest.advanceTimersByTime(1500);

      expect(mockedRouterPush).toHaveBeenCalledWith('/auth/login');

      jest.useRealTimers();
    });
  });

  describe('signup errors', () => {
    it('shows the API error message when signup fails', async () => {
      mockedSignup.mockRejectedValue(
        new Error('Aquest usuari ja existeix'),
      );

      render(<SignupScreen />);

      fireEvent.changeText(
        screen.getByPlaceholderText('Nom d\'usuari'),
        'existinguser',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Email'),
        'existing@example.com',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Contrasenya'),
        'Password123',
      );

      fireEvent.changeText(
        screen.getByPlaceholderText('Repetir contrasenya'),
        'Password123',
      );

      fireEvent.press(getPrivacyCheckbox());
      fireEvent.press(getSecurityCheckbox());

      fireEvent.press(screen.getByText('Sign Up'));

      expect(
        await screen.findByText('Aquest usuari ja existeix'),
      ).toBeTruthy();

      expect(mockedRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('navigates to login when Log In is pressed', () => {
      render(<SignupScreen />);

      fireEvent.press(screen.getByText('Log In'));

      expect(mockedRouterPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  describe('legal documents', () => {
    it('opens the privacy policy and displays its content', async () => {
      mockedGetPrivacyPolicy.mockResolvedValue({
        content: 'Privacy policy content',
        version: '1.0',
        document_type: 'privacy_policy',
      });

      render(<SignupScreen />);

      fireEvent.press(screen.getByText('Privacy Notice'));

      expect(
        await screen.findByText('Privacy policy content'),
      ).toBeTruthy();

      expect(screen.getByText('Version 1.0')).toBeTruthy();

      expect(mockedGetPrivacyPolicy).toHaveBeenCalledTimes(1);
    });

    it('opens the security policy and displays its content', async () => {
      mockedGetSecurityPolicy.mockResolvedValue({
        content: 'Security policy content',
        version: '2.0',
        document_type: 'security_policy',
      });

      render(<SignupScreen />);

      fireEvent.press(screen.getByText('Security Policy'));

      expect(
        await screen.findByText('Security policy content'),
      ).toBeTruthy();

      expect(screen.getByText('Version 2.0')).toBeTruthy();

      expect(mockedGetSecurityPolicy).toHaveBeenCalledTimes(1);
    });

    it('shows an error when the privacy policy cannot be loaded', async () => {
      mockedGetPrivacyPolicy.mockRejectedValue(
        new Error('Error carregant Privacy Policy'),
      );

      render(<SignupScreen />);

      fireEvent.press(screen.getByText('Privacy Notice'));

      expect(
        await screen.findByText('Error carregant Privacy Policy'),
      ).toBeTruthy();
    });

    it('closes the legal modal', async () => {
      mockedGetPrivacyPolicy.mockResolvedValue({
        content: 'Privacy policy content',
        version: '1.0',
        document_type: 'privacy_policy',
      });

      render(<SignupScreen />);

      fireEvent.press(screen.getByText('Privacy Notice'));

      expect(
        await screen.findByText('Privacy policy content'),
      ).toBeTruthy();

      fireEvent.press(screen.getByText('Tancar'));

      await waitFor(() => {
        expect(
          screen.queryByText('Privacy policy content'),
        ).toBeNull();
      });
    });
  });

  describe('input behaviour', () => {
    it('clears an error when the user starts typing', async () => {
      render(<SignupScreen />);

      fireEvent.press(screen.getByText('Sign Up'));

      expect(
        await screen.findByText('Omple tots els camps'),
      ).toBeTruthy();

      fireEvent.changeText(
        screen.getByPlaceholderText('Nom d\'usuari'),
        'testuser',
      );

      expect(
        screen.queryByText('Omple tots els camps'),
      ).toBeNull();
    });

    it('allows the privacy checkbox to be toggled', () => {
      render(<SignupScreen />);

      const privacyCheckbox = getPrivacyCheckbox();

      fireEvent.press(privacyCheckbox);

      expect(getPrivacyCheckbox().props.accessibilityState).toMatchObject({
        checked: true,
      });

      fireEvent.press(getPrivacyCheckbox());

      expect(getPrivacyCheckbox().props.accessibilityState).toMatchObject({
        checked: false,
      });
    });

    it('allows the security checkbox to be toggled', () => {
      render(<SignupScreen />);

      const securityCheckbox = getSecurityCheckbox();

      fireEvent.press(securityCheckbox);

      expect(getSecurityCheckbox().props.accessibilityState).toMatchObject({
        checked: true,
      });

      fireEvent.press(getSecurityCheckbox());

      expect(getSecurityCheckbox().props.accessibilityState).toMatchObject({
        checked: false,
      });
    });
  });
});
