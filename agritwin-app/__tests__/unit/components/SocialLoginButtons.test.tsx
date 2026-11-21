import React from 'react';
import { Platform } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import {
  exchangeFacebookLoginTicket,
  exchangeGoogleLoginTicket,
  exchangeXLoginTicket,
} from '@/services/api_oauth';
import { setAuth } from '@/services/auth';
import { routeAfterAuth } from '@/services/routeAfterAuth';

// Configurar l'URL abans d'importar el component.
process.env.EXPO_PUBLIC_API_URL = 'https://api.test.com';

const SocialLoginButtons = require('@/components/SocialLoginButtons').default;

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
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

const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(
  Platform,
  'OS',
);

const styles = {
  socialContainer: {},
  socialTitle: {},
  socialAccounts: {},
  socialButton: {},
  socialIcon: {},
};

const authResult = {
  username: 'joan',
  access_token: 'access-token',
  refresh_token: 'refresh-token',
};

const signupResult = {
  signup_token: 'signup-token',
  name: 'Joan Garcia',
  email: 'joan@test.com',
};

function renderComponent(loading = false) {
  const onLoadingChange = jest.fn();
  const onError = jest.fn();

  const result = render(
    <SocialLoginButtons
      styles={styles}
      loading={loading}
      onLoadingChange={onLoadingChange}
      onError={onError}
      title="Connecta el teu compte"
    />,
  );

  return {
    ...result,
    onLoadingChange,
    onError,
  };
}

function setPlatform(platform: 'web' | 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: platform,
  });
}

function mockWebOAuthSuccess(ticket = 'ticket-123') {
  (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
    type: 'success',
    url: `agritwin://auth/oauth-callback?provider=google&ticket=${ticket}`,
  });
}

beforeEach(() => {
  jest.resetAllMocks();

  setPlatform('web');

  (Linking.createURL as jest.Mock).mockImplementation(
    (path, options) =>
      `agritwin://${path}?provider=${options.queryParams.provider}`,
  );

  (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
    type: 'cancel',
  });

  (setAuth as jest.Mock).mockResolvedValue(undefined);
  (routeAfterAuth as jest.Mock).mockResolvedValue(undefined);
});

afterEach(() => {
  if (originalPlatformDescriptor) {
    Object.defineProperty(Platform, 'OS', originalPlatformDescriptor);
  }
});

describe('SocialLoginButtons', () => {
  // ---------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------

  it('renders the title and the three social buttons', () => {
    renderComponent();

    expect(screen.getByText('Connecta el teu compte')).toBeTruthy();

    expect(screen.getByTestId('google-button')).toBeTruthy();
    expect(screen.getByTestId('facebook-button')).toBeTruthy();
    expect(screen.getByTestId('x-button')).toBeTruthy();
  });

  it('disables the social buttons when loading is true', () => {
    renderComponent(true);

    expect(
      screen.getByTestId('google-button').props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      screen.getByTestId('facebook-button').props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      screen.getByTestId('x-button').props.accessibilityState.disabled,
    ).toBe(true);
  });

  it('does not launch OAuth when the buttons are disabled', () => {
    renderComponent(true);

    fireEvent.press(screen.getByTestId('google-button'));

    expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------
  // OAuth URL construction
  // ---------------------------------------------------------------

  it.each([
    ['google', 'google-button', 'login'],
    ['facebook', 'facebook-button', 'facebook/login'],
    ['x', 'x-button', 'x/login'],
  ] as const)(
    'starts the %s OAuth flow with the correct URL',
    async (provider, buttonTestId, loginPath) => {
      renderComponent();

      fireEvent.press(screen.getByTestId(buttonTestId));

      await waitFor(() => {
        expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledTimes(1);
      });

      const [loginUrl, redirectUri] = (
        WebBrowser.openAuthSessionAsync as jest.Mock
      ).mock.calls[0];

      const parsedLoginUrl = new URL(loginUrl);

      expect(parsedLoginUrl.origin).toBe('https://api.test.com');
      expect(parsedLoginUrl.pathname).toBe(`/api/v1/${loginPath}`);
      expect(parsedLoginUrl.searchParams.get('app_redirect_uri')).toBe(
        redirectUri,
      );

      expect(Linking.createURL).toHaveBeenCalledWith('auth/oauth-callback', {
        queryParams: { provider },
      });
    },
  );

  it('sets loading to true and clears the previous error', async () => {
    const { onLoadingChange, onError } = renderComponent();

    fireEvent.press(screen.getByTestId('google-button'));

    await waitFor(() => {
      expect(onLoadingChange).toHaveBeenCalledWith(true);
      expect(onError).toHaveBeenCalledWith('');
    });
  });

  // ---------------------------------------------------------------
  // Cancelled or dismissed OAuth
  // ---------------------------------------------------------------

  it.each(['cancel', 'dismiss'] as const)(
    'does not authenticate when OAuth returns %s',
    async (type) => {
      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
        type,
      });

      const { onLoadingChange } = renderComponent();

      fireEvent.press(screen.getByTestId('google-button'));

      await waitFor(() => {
        expect(onLoadingChange).toHaveBeenLastCalledWith(false);
      });

      expect(exchangeGoogleLoginTicket).not.toHaveBeenCalled();
      expect(setAuth).not.toHaveBeenCalled();
      expect(routeAfterAuth).not.toHaveBeenCalled();
    },
  );

  // ---------------------------------------------------------------
  // Native platform
  // ---------------------------------------------------------------

  it('does not exchange the ticket on native platforms', async () => {
    setPlatform('ios');

    mockWebOAuthSuccess();

    const { onLoadingChange } = renderComponent();

    fireEvent.press(screen.getByTestId('google-button'));

    await waitFor(() => {
      expect(onLoadingChange).toHaveBeenLastCalledWith(false);
    });

    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalled();
    expect(exchangeGoogleLoginTicket).not.toHaveBeenCalled();
    expect(setAuth).not.toHaveBeenCalled();
    expect(routeAfterAuth).not.toHaveBeenCalled();
  });

  it('does not exchange the ticket on Android', async () => {
    setPlatform('android');

    mockWebOAuthSuccess();

    renderComponent();

    fireEvent.press(screen.getByTestId('google-button'));

    await waitFor(() => {
      expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalled();
    });

    expect(exchangeGoogleLoginTicket).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------
  // Missing ticket
  // ---------------------------------------------------------------

  it('shows an error when the OAuth result has no ticket', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'agritwin://auth/oauth-callback?provider=google',
    });

    const { onError, onLoadingChange } = renderComponent();

    fireEvent.press(screen.getByTestId('google-button'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Google login ticket missing');
      expect(onLoadingChange).toHaveBeenLastCalledWith(false);
    });

    expect(exchangeGoogleLoginTicket).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------
  // Successful login on web
  // ---------------------------------------------------------------

  it('logs in successfully with Google', async () => {
    mockWebOAuthSuccess();

    (exchangeGoogleLoginTicket as jest.Mock).mockResolvedValue(authResult);

    const { onLoadingChange, onError } = renderComponent();

    fireEvent.press(screen.getByTestId('google-button'));

    await waitFor(() => {
      expect(exchangeGoogleLoginTicket).toHaveBeenCalledWith('ticket-123');
    });

    await waitFor(() => {
      expect(setAuth).toHaveBeenCalledWith(
        'joan',
        'access-token',
        'refresh-token',
      );

      expect(routeAfterAuth).toHaveBeenCalled();
      expect(onLoadingChange).toHaveBeenLastCalledWith(false);
    });

    expect(onError).toHaveBeenCalledWith('');
  });

  it('logs in successfully with Facebook', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'agritwin://auth/oauth-callback?ticket=facebook-ticket',
    });

    (exchangeFacebookLoginTicket as jest.Mock).mockResolvedValue(authResult);

    renderComponent();

    fireEvent.press(screen.getByTestId('facebook-button'));

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
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'agritwin://auth/oauth-callback?ticket=x-ticket',
    });

    (exchangeXLoginTicket as jest.Mock).mockResolvedValue(authResult);

    renderComponent();

    fireEvent.press(screen.getByTestId('x-button'));

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

  // ---------------------------------------------------------------
  // Social signup
  // ---------------------------------------------------------------

  it('redirects to social signup when Google returns signup_token', async () => {
    mockWebOAuthSuccess();

    (exchangeGoogleLoginTicket as jest.Mock).mockResolvedValue(signupResult);

    renderComponent();

    fireEvent.press(screen.getByTestId('google-button'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith({
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

  it('uses an empty email when signup email is missing', async () => {
    mockWebOAuthSuccess();

    (exchangeGoogleLoginTicket as jest.Mock).mockResolvedValue({
      signup_token: 'signup-token',
      name: 'Joan Garcia',
    });

    renderComponent();

    fireEvent.press(screen.getByTestId('google-button'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith({
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

  it('redirects Facebook signup to the social signup screen', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'agritwin://auth/oauth-callback?ticket=facebook-ticket',
    });

    (exchangeFacebookLoginTicket as jest.Mock).mockResolvedValue(signupResult);

    renderComponent();

    fireEvent.press(screen.getByTestId('facebook-button'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/auth/social-signup',
        params: {
          signupToken: 'signup-token',
          name: 'Joan Garcia',
          email: 'joan@test.com',
          provider: 'facebook',
        },
      });
    });

    expect(setAuth).not.toHaveBeenCalled();
  });

  it('redirects X signup to the social signup screen', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'agritwin://auth/oauth-callback?ticket=x-ticket',
    });

    (exchangeXLoginTicket as jest.Mock).mockResolvedValue(signupResult);

    renderComponent();

    fireEvent.press(screen.getByTestId('x-button'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/auth/social-signup',
        params: {
          signupToken: 'signup-token',
          name: 'Joan Garcia',
          email: 'joan@test.com',
          provider: 'x',
        },
      });
    });
  });

  // ---------------------------------------------------------------
  // Errors
  // ---------------------------------------------------------------

  it('shows an error when Google ticket exchange fails', async () => {
    mockWebOAuthSuccess();

    (exchangeGoogleLoginTicket as jest.Mock).mockRejectedValue(
      new Error('Ticket expired'),
    );

    const { onError, onLoadingChange } = renderComponent();

    fireEvent.press(screen.getByTestId('google-button'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Ticket expired');
      expect(onLoadingChange).toHaveBeenLastCalledWith(false);
    });

    expect(setAuth).not.toHaveBeenCalled();
    expect(routeAfterAuth).not.toHaveBeenCalled();
  });

  it('shows a default error when the rejection is not an Error', async () => {
    mockWebOAuthSuccess();

    (exchangeGoogleLoginTicket as jest.Mock).mockRejectedValue('Unknown error');

    const { onError } = renderComponent();

    fireEvent.press(screen.getByTestId('google-button'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Google authentication failed');
    });
  });

  it('shows an error when setAuth fails', async () => {
    mockWebOAuthSuccess();

    (exchangeGoogleLoginTicket as jest.Mock).mockResolvedValue(authResult);

    (setAuth as jest.Mock).mockRejectedValue(
      new Error('Could not save session'),
    );

    const { onError } = renderComponent();

    fireEvent.press(screen.getByTestId('google-button'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Could not save session');
    });

    expect(routeAfterAuth).not.toHaveBeenCalled();
  });

  it('shows an error when routeAfterAuth fails', async () => {
    mockWebOAuthSuccess();

    (exchangeGoogleLoginTicket as jest.Mock).mockResolvedValue(authResult);

    (routeAfterAuth as jest.Mock).mockRejectedValue(
      new Error('Navigation failed'),
    );

    const { onError } = renderComponent();

    fireEvent.press(screen.getByTestId('google-button'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Navigation failed');
    });
  });

  it('shows an error when the OAuth URL is invalid', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'not-a-valid-url',
    });

    const { onError } = renderComponent();

    fireEvent.press(screen.getByTestId('google-button'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });

    expect(exchangeGoogleLoginTicket).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------
  // Finally block
  // ---------------------------------------------------------------

  it('sets loading to false when OAuth is cancelled', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'cancel',
    });

    const { onLoadingChange } = renderComponent();

    fireEvent.press(screen.getByTestId('google-button'));

    await waitFor(() => {
      expect(onLoadingChange).toHaveBeenNthCalledWith(1, true);
      expect(onLoadingChange).toHaveBeenLastCalledWith(false);
    });
  });
});
