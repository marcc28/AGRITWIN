import * as SecureStore from 'expo-secure-store';

import {
  clearAuth,
  getAuth,
  refreshAuth,
  resetAuthCache,
  setAuth,
} from '@/services/auth';
import { clearQueryCache } from '@/services/queryPersistence';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@/services/currentField', () => ({
  clearCurrentField: jest.fn(),
}));

jest.mock('@/services/queryPersistence', () => ({
  clearQueryCache: jest.fn(),
}));

const storage: Record<string, string> = {};
const getItem = SecureStore.getItemAsync as jest.Mock;

describe('auth kept in memory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(storage).forEach((key) => delete storage[key]);
    resetAuthCache();
    getItem.mockImplementation(async (key: string) => storage[key] ?? null);
    (SecureStore.setItemAsync as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        storage[key] = value;
      },
    );
    (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(
      async (key: string) => {
        delete storage[key];
      },
    );
  });

  it('reads the secure store only once', async () => {
    await setAuth('anna', 'token-1');
    getItem.mockClear();

    const first = await getAuth();
    const second = await getAuth();

    expect(first).toEqual({
      token: 'token-1',
      refreshToken: null,
      username: 'anna',
    });
    expect(second).toBe(first);
    expect(getItem).toHaveBeenCalledTimes(3);
  });

  it('sees the new credentials after a login', async () => {
    await setAuth('anna', 'token-1');
    await getAuth();

    await setAuth('anna', 'token-2', 'refresh-2');

    await expect(getAuth()).resolves.toMatchObject({
      token: 'token-2',
      refreshToken: 'refresh-2',
    });
  });

  it('forgets the credentials and the cached data on logout', async () => {
    await setAuth('anna', 'token-1');
    await getAuth();

    await clearAuth();

    await expect(getAuth()).resolves.toBeNull();
    expect(clearQueryCache).toHaveBeenCalled();
  });

  it('drops the cached data when another user logs in', async () => {
    await setAuth('anna', 'token-1');
    expect(clearQueryCache).not.toHaveBeenCalled();

    await setAuth('anna', 'token-2');
    expect(clearQueryCache).not.toHaveBeenCalled();

    await setAuth('marc', 'token-3');
    expect(clearQueryCache).toHaveBeenCalledTimes(1);
  });

  it('uses the renewed token right after a refresh', async () => {
    await setAuth('anna', 'old-token', 'refresh-1');
    await getAuth();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new-token' }),
    }) as unknown as typeof fetch;

    await refreshAuth();

    await expect(getAuth()).resolves.toMatchObject({
      token: 'new-token',
      refreshToken: 'refresh-1',
    });
  });

  it('keeps a session that only has the refresh token', async () => {
    storage.agritwin_refresh_token = 'refresh-1';

    await expect(getAuth()).resolves.toEqual({
      token: null,
      refreshToken: 'refresh-1',
      username: null,
    });
  });

  it('tries again after a failed read', async () => {
    getItem.mockRejectedValueOnce(new Error('locked'));

    await expect(getAuth()).rejects.toThrow('locked');

    storage.agritwin_access_token = 'token-9';
    await expect(getAuth()).resolves.toMatchObject({ token: 'token-9' });
  });
});
