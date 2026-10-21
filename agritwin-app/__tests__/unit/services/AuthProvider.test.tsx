import React from 'react';

import { render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AuthProvider from '../../../src/services/AuthProvider';
import { getAuth } from '../../../src/services/auth';
import { routeAfterAuth } from '../../../src/services/routeAfterAuth';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock('../../../src/services/auth', () => ({
  getAuth: jest.fn(),
}));

jest.mock('../../../src/services/routeAfterAuth', () => ({
  routeAfterAuth: jest.fn(),
}));

const mockedGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes after a valid session', async () => {
    mockedGetAuth.mockResolvedValue({
      token: 'token',
      refreshToken: null,
      username: 'ainhoa',
    });
    render(<AuthProvider />);
    await waitFor(() => {
      expect(routeAfterAuth).toHaveBeenCalled();
    });
  });

  it('sends the user to login when there is no session', async () => {
    mockedGetAuth.mockResolvedValue(null);
    render(<AuthProvider />);
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
    });
  });
});
