import { Platform } from 'react-native';
import { router } from 'expo-router';
import { authenticatedFetch, clearAuth, getAuth, refreshAuth, setAuth } from '@/services/auth';
import { clearQueryCache } from '@/services/queryPersistence';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('@/services/currentField', () => ({ clearCurrentField: jest.fn() }));
jest.mock('@/services/queryPersistence', () => ({ clearQueryCache: jest.fn() }));

describe('auth refresh and authenticated requests', () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(Platform, 'OS');
  const originalFetch = global.fetch;
  const storage: Record<string, string> = {};
  const localStorageMock = {
    setItem: jest.fn((key: string, value: string) => { storage[key] = value; }),
    getItem: jest.fn((key: string) => storage[key] ?? null),
    removeItem: jest.fn((key: string) => { delete storage[key]; }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.keys(storage).forEach((key) => delete storage[key]);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    Object.defineProperty(global, 'localStorage', { configurable: true, value: localStorageMock });
    await clearAuth();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (originalPlatform) Object.defineProperty(Platform, 'OS', originalPlatform);
  });

  it('expires the session and redirects when there is no refresh token', async () => {
    await expect(refreshAuth()).rejects.toThrow('No refresh token available');
    expect(storage).toEqual({});
    expect(router.replace).toHaveBeenCalledWith('/auth/login');
  });

  it('refreshes and stores the returned access and rotated refresh tokens', async () => {
    await setAuth('farmer', 'old-access', 'old-refresh');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new-access', refresh_token: 'new-refresh' }),
    }) as jest.Mock;

    await expect(refreshAuth()).resolves.toEqual({
      accessToken: 'new-access', refreshToken: 'new-refresh', username: 'farmer',
    });
    expect(storage.agritwin_access_token).toBe('new-access');
    expect(storage.agritwin_refresh_token).toBe('new-refresh');
    expect(await getAuth()).toEqual({ token: 'new-access', refreshToken: 'new-refresh', username: 'farmer' });
  });

  it('clears cached account data when a different user signs in', async () => {
    await setAuth('first-farmer', 'first-access', 'first-refresh');
    await setAuth('second-farmer', 'second-access', 'second-refresh');
    expect(clearQueryCache).toHaveBeenCalled();
  });

  it('redirects and clears credentials for an unauthorized refresh', async () => {
    await setAuth('farmer', 'old-access', 'expired-refresh');
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as jest.Mock;
    await expect(refreshAuth()).rejects.toThrow('Token refresh failed: 401');
    expect(storage).toEqual({});
    expect(router.replace).toHaveBeenCalledWith('/auth/login');
  });

  it('expires the session when the refresh response has no access token', async () => {
    await setAuth('farmer', 'old-access', 'refresh-token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ refresh_token: 'rotated' }),
    }) as jest.Mock;
    await expect(refreshAuth()).rejects.toThrow(
      'Refresh response does not contain access_token',
    );
    expect(storage).toEqual({});
    expect(router.replace).toHaveBeenCalledWith('/auth/login');
  });

  it('reports a missing API URL before making a refresh request', async () => {
    await setAuth('farmer', 'old-access', 'refresh-token');
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    try {
      let isolatedRefresh!: () => Promise<unknown>;
      jest.isolateModules(() => {
        isolatedRefresh = require('@/services/auth').refreshAuth;
      });
      await expect(isolatedRefresh()).rejects.toThrow(
        'EXPO_PUBLIC_API_URL is not configured',
      );
    } finally {
      if (apiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
      else process.env.EXPO_PUBLIC_API_URL = apiUrl;
    }
  });

  it('retries an authorized request once with the refreshed token', async () => {
    await setAuth('farmer', 'old-access', 'refresh-token');
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ status: 401 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'new-access' }) })
      .mockResolvedValueOnce({ status: 200, ok: true }) as jest.Mock;

    const response = await authenticatedFetch('/protected', {
      headers: { Authorization: 'Bearer old-access' },
    });
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenLastCalledWith('/protected', expect.objectContaining({
      headers: expect.any(Headers),
    }));
  });

  it('does not refresh a request without authorization', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 200 }) as jest.Mock;
    await authenticatedFetch('/public');
    expect(global.fetch).toHaveBeenCalledWith('/public', {});
  });

  it('returns an authorized successful response without refreshing', async () => {
    await setAuth('farmer', 'valid-access', 'refresh-token');
    global.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true }) as jest.Mock;
    const response = await authenticatedFetch('/protected', {
      headers: { Authorization: 'Bearer valid-access' },
    });
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns the original unauthorized response when refresh fails', async () => {
    await setAuth('farmer', 'old-access', 'refresh-token');
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ status: 401 })
      .mockResolvedValueOnce({ ok: false, status: 500 }) as jest.Mock;
    const response = await authenticatedFetch('/protected', {
      headers: { Authorization: 'Bearer old-access' },
    });
    expect(response.status).toBe(401);
  });

  it('uses a newer token when another request refreshes during the first response', async () => {
    await setAuth('farmer', 'old-access', 'refresh-token');
    global.fetch = jest.fn()
      .mockImplementationOnce(async () => {
        await setAuth('farmer', 'new-access', 'refresh-token');
        return { status: 401 };
      })
      .mockResolvedValueOnce({ status: 200, ok: true }) as jest.Mock;
    const response = await authenticatedFetch('/protected', {
      headers: { Authorization: 'Bearer old-access' },
    });
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('expires the session when the newer token is also rejected', async () => {
    await setAuth('farmer', 'old-access', 'refresh-token');
    global.fetch = jest.fn()
      .mockImplementationOnce(async () => {
        await setAuth('farmer', 'new-access', 'refresh-token');
        return { status: 401 };
      })
      .mockResolvedValueOnce({ status: 401, ok: false }) as jest.Mock;
    const response = await authenticatedFetch('/protected', {
      headers: { Authorization: 'Bearer old-access' },
    });
    expect(response.status).toBe(401);
    expect(router.replace).toHaveBeenCalledWith('/auth/login');
  });

  it('expires the session when the retry after refresh is still unauthorized', async () => {
    await setAuth('farmer', 'old-access', 'refresh-token');
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ status: 401 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'new-access' }) })
      .mockResolvedValueOnce({ status: 401 }) as jest.Mock;
    const response = await authenticatedFetch('/protected', {
      headers: { Authorization: 'Bearer old-access' },
    });
    expect(response.status).toBe(401);
    expect(router.replace).toHaveBeenCalledWith('/auth/login');
  });
});
