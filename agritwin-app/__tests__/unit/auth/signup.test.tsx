import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
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
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(),
    },
  }),
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
const mockedGetPrivacyPolicy = getPrivacyPolicy as jest.MockedFunction<
  typeof getPrivacyPolicy
>;
const mockedGetSecurityPolicy = getSecurityPolicy as jest.MockedFunction<
  typeof getSecurityPolicy
>;

const mockedRouterPush = router.push as jest.MockedFunction<typeof router.push>;

const getPrivacyCheckbox = () => screen.getByLabelText('Accept privacy notice');
const getSecurityCheckbox = () =>
  screen.getByLabelText('Accept security policy');

const fillValidSignupForm = () => {
  fireEvent.changeText(screen.getByTestId('signup-username'), 'testuser');

  fireEvent.changeText(screen.getByTestId('signup-email'), 'test@example.com');

  fireEvent.changeText(screen.getByTestId('signup-password'), 'Password123');

  fireEvent.changeText(
    screen.getByTestId('signup-password-confirm'),
    'Password123',
  );
};

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the signup screen correctly', () => {
      render(<SignupScreen />);

      expect(screen.getByText('AgriTwin')).toBeTruthy();

      expect(screen.getByTestId('signup-title')).toBeTruthy();
      expect(screen.getByTestId('signup-username')).toBeTruthy();
      expect(screen.getByTestId('signup-password')).toBeTruthy();
      expect(screen.getByTestId('signup-password-confirm')).toBeTruthy();
      expect(screen.getByTestId('signup-email')).toBeTruthy();

      expect(screen.getByTestId('privacy-checkbox-press')).toBeTruthy();
      expect(screen.getByTestId('security-checkbox-press')).toBeTruthy();

      expect(screen.getByTestId('login-button')).toBeTruthy();
      expect(screen.getByTestId('signup-button')).toBeTruthy();
    });
  });

  describe('form validation', () => {
    it('shows an error when fields are empty', async () => {
      render(<SignupScreen />);

      fireEvent.press(screen.getByTestId('signup-button'));

      expect(await screen.findByTestId('signup-error')).toBeTruthy();
      expect(mockedSignup).not.toHaveBeenCalled();
    });

    it('shows an error when passwords do not match', async () => {
      render(<SignupScreen />);

      fireEvent.changeText(screen.getByTestId('signup-username'), 'testuser');

      fireEvent.changeText(
        screen.getByTestId('signup-email'),
        'test@example.com',
      );

      fireEvent.changeText(
        screen.getByTestId('signup-password'),
        'Password123',
      );

      fireEvent.changeText(
        screen.getByTestId('signup-password-confirm'),
        'DifferentPassword',
      );

      fireEvent.press(screen.getByTestId('signup-button'));

      expect(await screen.findByTestId('signup-error')).toBeTruthy();
      expect(mockedSignup).not.toHaveBeenCalled();
    });

    it('requires the privacy policy to be accepted', async () => {
      render(<SignupScreen />);

      fillValidSignupForm();

      // Privacy queda sense acceptar
      fireEvent.press(screen.getByTestId('security-checkbox-press'));

      fireEvent.press(screen.getByTestId('signup-button'));

      expect(await screen.findByTestId('signup-error')).toBeTruthy();
      expect(mockedSignup).not.toHaveBeenCalled();
    });

    it('requires the security policy to be accepted', async () => {
      render(<SignupScreen />);

      fillValidSignupForm();

      // Privacy acceptada, security no
      fireEvent.press(screen.getByTestId('privacy-checkbox-press'));

      fireEvent.press(screen.getByTestId('signup-button'));

      expect(await screen.findByTestId('signup-error')).toBeTruthy();
      expect(mockedSignup).not.toHaveBeenCalled();
    });

    it('rejects an invalid email', async () => {
      render(<SignupScreen />);

      fireEvent.changeText(screen.getByTestId('signup-username'), 'testuser');

      fireEvent.changeText(screen.getByTestId('signup-email'), 'invalid-email');

      fireEvent.changeText(
        screen.getByTestId('signup-password'),
        'Password123',
      );

      fireEvent.changeText(
        screen.getByTestId('signup-password-confirm'),
        'Password123',
      );

      fireEvent.press(screen.getByTestId('privacy-checkbox-press'));
      fireEvent.press(screen.getByTestId('security-checkbox-press'));

      fireEvent.press(screen.getByTestId('signup-button'));

      expect(await screen.findByTestId('signup-error')).toBeTruthy();
      expect(mockedSignup).not.toHaveBeenCalled();
    });
  });
  describe('successful signup', () => {
    it('calls signup with the correct data', async () => {
      mockedSignup.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      } as never);

      render(<SignupScreen />);

      fireEvent.changeText(
        screen.getByPlaceholderText("Nom d'usuari"),
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

      fillValidSignupForm();

      fireEvent.press(screen.getByTestId('privacy-checkbox-press'));
      fireEvent.press(screen.getByTestId('security-checkbox-press'));

      fireEvent.press(screen.getByTestId('signup-button'));

      expect(await screen.findByTestId('signup-success-message')).toBeTruthy();
    });

    it('navigates to login after successful signup', async () => {
      mockedSignup.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      } as never);

      render(<SignupScreen />);

      fillValidSignupForm();

      fireEvent.press(screen.getByTestId('privacy-checkbox-press'));
      fireEvent.press(screen.getByTestId('security-checkbox-press'));

      fireEvent.press(screen.getByTestId('signup-button'));

      await waitFor(() => {
        expect(mockedRouterPush).toHaveBeenCalledWith('/auth/login');
      });
    });
  });

  describe('signup errors', () => {
    it('shows the API error message when signup fails', async () => {
      mockedSignup.mockRejectedValue(new Error('Aquest usuari ja existeix'));

      render(<SignupScreen />);

      fireEvent.changeText(
        screen.getByPlaceholderText("Nom d'usuari"),
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

      expect(await screen.findByText('Aquest usuari ja existeix')).toBeTruthy();

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

      expect(await screen.findByText('Privacy policy content')).toBeTruthy();

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

      expect(await screen.findByText('Security policy content')).toBeTruthy();

      expect(screen.getByText('Version 2.0')).toBeTruthy();

      expect(mockedGetSecurityPolicy).toHaveBeenCalledTimes(1);
    });
    
    it('shows an error when the privacy policy cannot be loaded', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockedGetPrivacyPolicy.mockRejectedValue(
        new Error('Error carregant Privacy Policy'),
      );

      render(<SignupScreen />);

      fireEvent.press(screen.getByTestId('privacy-checkbox-open'));

      expect(
        await screen.findByText('Error carregant Privacy Policy'),
      ).toBeTruthy();

      expect(mockedGetPrivacyPolicy).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it('closes the legal modal', async () => {
      mockedGetPrivacyPolicy.mockResolvedValue({
        content: 'Privacy policy content',
        version: '1.0',
        document_type: 'privacy_policy',
      });

      render(<SignupScreen />);

      fireEvent.press(screen.getByText('Privacy Notice'));

      expect(await screen.findByText('Privacy policy content')).toBeTruthy();

      fireEvent.press(screen.getByText('Tancar'));

      await waitFor(() => {
        expect(screen.queryByText('Privacy policy content')).toBeNull();
      });
    });
  });

  describe('input behaviour', () => {
    it('clears an error when the user starts typing', async () => {
      render(<SignupScreen />);

      fireEvent.press(screen.getByTestId('signup-button'));

      expect(await screen.findByTestId('signup-error')).toBeTruthy();

      fireEvent.changeText(screen.getByTestId('signup-username'), 'testuser');

      await waitFor(() => {
        expect(screen.queryByTestId('signup-error')).toBeNull();
      });
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
