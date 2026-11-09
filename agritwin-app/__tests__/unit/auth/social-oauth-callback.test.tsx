
import React from 'react';
import { Platform } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import SocialOAuthCallbackScreen from '@/app/auth/oauth-callback';

import {
  exchangeFacebookLoginTicket,
  exchangeGoogleLoginTicket,
  exchangeXLoginTicket,
} from '@/services/api_oauth';
import { setAuth } from '@/services/auth';
import { routeAfterAuth } from '@/services/routeAfterAuth';
import { router, useLocalSearchParams } from 'expo-router';

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@/services/api_oauth', () => ({
  exchangeFacebookLoginTicket: jest.fn(),
  exchangeGoogleLoginTicket: jest.fn(),
  exchangeXLoginTicket: jest.fn(),
}));

jest.mock('@/services/auth', () => ({
  setAuth: jest.fn(),
}));

jest.mock('@/services/routeAfterAuth', () => ({
  routeAfterAuth: jest.fn(),
}));

jest.mock('@/components/Alert', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      React.createElement(Text, null, children),
    );
});

const mockedUseLocalSearchParams = useLocalSearchParams as jest.Mock;

const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(
  Platform,
  'OS',
);

const googleResult = {
  username: 'joan',
  access_token: 'access-token',
  refresh_token: 'refresh-token',
};

const signupResult = {
  signup_token: 'signup-token',
  name: 'Joan Garcia',
  email: 'joan@test.com',
};

beforeEach(() => {
  jest.clearAllMocks();

  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: 'ios',
  });

  mockedUseLocalSearchParams.mockReturnValue({
    provider: 'google',
    ticket: 'ticket-123',
  });

  (setAuth as jest.Mock).mockResolvedValue(undefined);
  (routeAfterAuth as jest.Mock).mockResolvedValue(undefined);
});

afterEach(() => {
  if (originalPlatformDescriptor) {
    Object.defineProperty(Platform, 'OS', originalPlatformDescriptor);
  }
});

describe('SocialOAuthCallbackScreen', () => {
  // Initial rendering

  it('renders the Google loading message', () => {
    (exchangeGoogleLoginTicket as jest.Mock).mockReturnValue(
      new Promise(() => {}),
    );

    render(<SocialOAuthCallbackScreen />);

    expect(
      screen.getByText('Finalitzant la sessió amb Google...'),
    ).toBeTruthy();
  });

  it('renders the Facebook loading message', () => {
    mockedUseLocalSearchParams.mockReturnValue({
      provider: 'facebook',
      ticket: 'ticket-123',
    });

    (exchangeFacebookLoginTicket as jest.Mock).mockReturnValue(
      new Promise(() => {}),
    );

    render(<SocialOAuthCallbackScreen />);

    expect(
      screen.getByText('Finalitzant la sessió amb Facebook...'),
    ).toBeTruthy();
  });

  it('renders the X loading message', () => {
    mockedUseLocalSearchParams.mockReturnValue({
      provider: 'x',
      ticket: 'ticket-123',
    });

    (exchangeXLoginTicket as jest.Mock).mockReturnValue(
      new Promise(() => {}),
    );

    render(<SocialOAuthCallbackScreen />);

    expect(
      screen.getByText('Finalitzant la sessió amb X...'),
    ).toBeTruthy();
  });

  // Missing parameters

  it('shows an error when the ticket is missing', () => {
    mockedUseLocalSearchParams.mockReturnValue({
      provider: 'google',
    });

    render(<SocialOAuthCallbackScreen />);

    expect(
      screen.getByText(
        'El retorn social no ha inclòs el tiquet de sessió.',
      ),
    ).toBeTruthy();

    expect(exchangeGoogleLoginTicket).not.toHaveBeenCalled();
  });

  it('shows an error when the provider is missing', () => {
    mockedUseLocalSearchParams.mockReturnValue({
      ticket: 'ticket-123',
    });

    render(<SocialOAuthCallbackScreen />);

    expect(
      screen.getByText(
        'El retorn social no ha inclòs el tiquet de sessió.',
      ),
    ).toBeTruthy();
  });

  it('shows an error when both parameters are missing', () => {
    mockedUseLocalSearchParams.mockReturnValue({});

    render(<SocialOAuthCallbackScreen />);

    expect(
      screen.getByText(
        'El retorn social no ha inclòs el tiquet de sessió.',
      ),
    ).toBeTruthy();
  });

  // Web platform

  it('does not process authentication on web', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    });

    render(<SocialOAuthCallbackScreen />);

    expect(exchangeGoogleLoginTicket).not.toHaveBeenCalled();
    expect(exchangeFacebookLoginTicket).not.toHaveBeenCalled();
    expect(exchangeXLoginTicket).not.toHaveBeenCalled();
    expect(setAuth).not.toHaveBeenCalled();
  });

  // Successful login

  it('logs in successfully with Google', async () => {
    (exchangeGoogleLoginTicket as jest.Mock).mockResolvedValue(
      googleResult,
    );

    render(<SocialOAuthCallbackScreen />);

    await waitFor(() => {
      expect(exchangeGoogleLoginTicket).toHaveBeenCalledWith(
        'ticket-123',
      );
      expect(setAuth).toHaveBeenCalledWith(
        'joan',
        'access-token',
        'refresh-token',
      );
      expect(routeAfterAuth).toHaveBeenCalled();
    });

    expect(router.replace).not.toHaveBeenCalled();
  });

  it('logs in successfully with Facebook', async () => {
    mockedUseLocalSearchParams.mockReturnValue({
      provider: 'facebook',
      ticket: 'facebook-ticket',
    });

    (exchangeFacebookLoginTicket as jest.Mock).mockResolvedValue(
      googleResult,
    );

    render(<SocialOAuthCallbackScreen />);

    await waitFor(() => {
      expect(exchangeFacebookLoginTicket).toHaveBeenCalledWith(
        'facebook-ticket',
      );
      expect(setAuth).toHaveBeenCalledWith(
        'joan',
        'access-token',
        'refresh-token',
      );
      expect(routeAfterAuth).toHaveBeenCalled();
    });
  });

  it('logs in successfully with X', async () => {
    mockedUseLocalSearchParams.mockReturnValue({
      provider: 'x',
      ticket: 'x-ticket',
    });

    (exchangeXLoginTicket as jest.Mock).mockResolvedValue(
      googleResult,
    );

    render(<SocialOAuthCallbackScreen />);

    await waitFor(() => {
      expect(exchangeXLoginTicket).toHaveBeenCalledWith('x-ticket');
      expect(setAuth).toHaveBeenCalledWith(
        'joan',
        'access-token',
        'refresh-token',
      );
      expect(routeAfterAuth).toHaveBeenCalled();
    });
  });

  // Social signup

  it('redirects to social signup when Google returns a signup token', async () => {
    (exchangeGoogleLoginTicket as jest.Mock).mockResolvedValue(
      signupResult,
    );

    render(<SocialOAuthCallbackScreen />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/auth/social-signup',
        params: {
          signupToken: 'signup-token',
          name: 'Joan Garcia',
          email: 'joan@test.com',
          provider: 'google',
        },
      });
    });

    expect(setAuth).not.toHaveBeenCalled();
    expect(routeAfterAuth).not.toHaveBeenCalled();
  });

  it('uses an empty email when the signup result has no email', async () => {
    (exchangeGoogleLoginTicket as jest.Mock).mockResolvedValue({
      signup_token: 'signup-token',
      name: 'Joan Garcia',
    });

    render(<SocialOAuthCallbackScreen />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/auth/social-signup',
        params: {
          signupToken: 'signup-token',
          name: 'Joan Garcia',
          email: '',
          provider: 'google',
        },
      });
    });
  });

  // Invalid provider

  it('shows an error when the provider is invalid', async () => {
    mockedUseLocalSearchParams.mockReturnValue({
      provider: 'instagram',
      ticket: 'ticket-123',
    });

    render(<SocialOAuthCallbackScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('Proveïdor social no vàlid.'),
      ).toBeTruthy();
    });

    expect(exchangeGoogleLoginTicket).not.toHaveBeenCalled();
    expect(exchangeFacebookLoginTicket).not.toHaveBeenCalled();
    expect(exchangeXLoginTicket).not.toHaveBeenCalled();
    expect(setAuth).not.toHaveBeenCalled();
  });

  // Authentication errors

  it('shows the error message when the exchange fails', async () => {
    (exchangeGoogleLoginTicket as jest.Mock).mockRejectedValue(
      new Error('Ticket expired'),
    );

    render(<SocialOAuthCallbackScreen />);

    await waitFor(() => {
      expect(screen.getByText('Ticket expired')).toBeTruthy();
    });

    expect(setAuth).not.toHaveBeenCalled();
    expect(routeAfterAuth).not.toHaveBeenCalled();
  });

  it('shows a default error when the rejection is not an Error', async () => {
    (exchangeGoogleLoginTicket as jest.Mock).mockRejectedValue(
      'Unknown error',
    );

    render(<SocialOAuthCallbackScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('No s’ha pogut iniciar sessió.'),
      ).toBeTruthy();
    });
  });

  it('shows an error when setAuth fails', async () => {
    (exchangeGoogleLoginTicket as jest.Mock).mockResolvedValue(
      googleResult,
    );

    (setAuth as jest.Mock).mockRejectedValue(
      new Error('Could not save session'),
    );

    render(<SocialOAuthCallbackScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('Could not save session'),
      ).toBeTruthy();
    });

    expect(routeAfterAuth).not.toHaveBeenCalled();
  });

  it('shows an error when routeAfterAuth fails', async () => {
    (exchangeGoogleLoginTicket as jest.Mock).mockResolvedValue(
      googleResult,
    );

    // És essencial que setAuth no falli en aquest test.
    (setAuth as jest.Mock).mockResolvedValue(undefined);

    (routeAfterAuth as jest.Mock).mockRejectedValue(
      new Error('Navigation failed'),
    );

    render(<SocialOAuthCallbackScreen />);

    await waitFor(() => {
      expect(routeAfterAuth).toHaveBeenCalled();
      expect(
        screen.getByText('Navigation failed'),
      ).toBeTruthy();
    });
  });

  // Prevent duplicate ticket processing

  it('does not exchange the same ticket twice', async () => {
    (exchangeGoogleLoginTicket as jest.Mock).mockReturnValue(
      new Promise(() => {}),
    );

    const { rerender } = render(<SocialOAuthCallbackScreen />);

    expect(exchangeGoogleLoginTicket).toHaveBeenCalledTimes(1);

    mockedUseLocalSearchParams.mockReturnValue({
      provider: 'facebook',
      ticket: 'ticket-123',
    });

    rerender(<SocialOAuthCallbackScreen />);

    expect(exchangeGoogleLoginTicket).toHaveBeenCalledTimes(1);
    expect(exchangeFacebookLoginTicket).not.toHaveBeenCalled();
  });

  // Return to login

  it('returns to login when the user presses the login button', async () => {
    (exchangeGoogleLoginTicket as jest.Mock).mockRejectedValue(
      new Error('Login failed'),
    );

    render(<SocialOAuthCallbackScreen />);

    const loginButton = await screen.findByText(
      'Torna a iniciar sessió',
    );

    fireEvent.press(loginButton);

    expect(router.replace).toHaveBeenCalledWith('/auth/login');
  });
});
