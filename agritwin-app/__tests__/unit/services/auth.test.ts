import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { setAuth, getAuth, clearAuth } from '@/services/auth';
import { clearCurrentField } from '@/services/currentField';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@/services/currentField', () => ({
  clearCurrentField: jest.fn(),
}));

describe('auth service', () => {
  const TOKEN_KEY = 'agritwin_access_token';
  const REFRESH_TOKEN_KEY = 'agritwin_refresh_token';
  const USERNAME_KEY = 'agritwin_username';

  let storage: Record<string, string>;
  let localStorageMock: {
    setItem: jest.Mock;
    getItem: jest.Mock;
    removeItem: jest.Mock;
  };

  const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(
    Platform,
    'OS',
  );

  const setPlatform = (platform: 'web' | 'ios' | 'android') => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: platform,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    storage = {};

    localStorageMock = {
      setItem: jest.fn((key: string, value: string) => {
        storage[key] = value;
      }),

      getItem: jest.fn((key: string) => storage[key] ?? null),

      removeItem: jest.fn((key: string) => {
        delete storage[key];
      }),
    };

    Object.defineProperty(global, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    });

    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    (clearCurrentField as jest.Mock).mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (originalPlatformDescriptor) {
      Object.defineProperty(Platform, 'OS', originalPlatformDescriptor);
    }
  });

  describe('setAuth - Web', () => {
    beforeEach(() => {
      setPlatform('web');
    });

    it('should save username, access token and refresh token', async () => {
      await setAuth('testuser', 'access-token', 'refresh-token');

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(3);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        USERNAME_KEY,
        'testuser',
      );

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        TOKEN_KEY,
        'access-token',
      );

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        REFRESH_TOKEN_KEY,
        'refresh-token',
      );
    });

    it('should not save refresh token when it is not provided', async () => {
      await setAuth('testuser', 'access-token');

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);

      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        REFRESH_TOKEN_KEY,
        expect.anything(),
      );
    });

    it('should not use SecureStore on web', async () => {
      await setAuth('testuser', 'access-token', 'refresh-token');

      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });
  });

  describe('setAuth - Native', () => {
    beforeEach(() => {
      setPlatform('ios');
    });

    it('should save all credentials using SecureStore', async () => {
      await setAuth('testuser', 'access-token', 'refresh-token');

      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(3);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        USERNAME_KEY,
        'testuser',
      );

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        TOKEN_KEY,
        'access-token',
      );

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        REFRESH_TOKEN_KEY,
        'refresh-token',
      );
    });

    it('should not save refresh token when it is not provided', async () => {
      await setAuth('testuser', 'access-token');

      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);

      expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(
        REFRESH_TOKEN_KEY,
        expect.anything(),
      );
    });

    it('should not use localStorage on native', async () => {
      await setAuth('testuser', 'access-token', 'refresh-token');

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('getAuth - Web', () => {
    beforeEach(() => {
      setPlatform('web');
    });

    it('should return all stored credentials', async () => {
      storage[TOKEN_KEY] = 'access-token';
      storage[REFRESH_TOKEN_KEY] = 'refresh-token';
      storage[USERNAME_KEY] = 'testuser';

      const result = await getAuth();

      expect(result).toEqual({
        token: 'access-token',
        refreshToken: 'refresh-token',
        username: 'testuser',
      });

      expect(localStorageMock.getItem).toHaveBeenCalledWith(TOKEN_KEY);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(USERNAME_KEY);
    });

    it('should return null when access token does not exist', async () => {
      const result = await getAuth();

      expect(result).toBeNull();
    });

    it('should return null even when username and refresh token exist without access token', async () => {
      storage[REFRESH_TOKEN_KEY] = 'refresh-token';
      storage[USERNAME_KEY] = 'testuser';

      const result = await getAuth();

      expect(result).toBeNull();
    });

    it('should return null refresh token and username when they are missing', async () => {
      storage[TOKEN_KEY] = 'access-token';

      const result = await getAuth();

      expect(result).toEqual({
        token: 'access-token',
        refreshToken: null,
        username: null,
      });
    });

    it('should not use SecureStore on web', async () => {
      storage[TOKEN_KEY] = 'access-token';

      await getAuth();

      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    });
  });

  describe('getAuth - Native', () => {
    beforeEach(() => {
      setPlatform('android');
    });

    it('should return all credentials from SecureStore', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token')
        .mockResolvedValueOnce('testuser');

      const result = await getAuth();

      expect(result).toEqual({
        token: 'access-token',
        refreshToken: 'refresh-token',
        username: 'testuser',
      });

      expect(SecureStore.getItemAsync).toHaveBeenNthCalledWith(1, TOKEN_KEY);

      expect(SecureStore.getItemAsync).toHaveBeenNthCalledWith(
        2,
        REFRESH_TOKEN_KEY,
      );

      expect(SecureStore.getItemAsync).toHaveBeenNthCalledWith(3, USERNAME_KEY);
    });

    it('should return null when access token does not exist', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('refresh-token')
        .mockResolvedValueOnce('testuser');

      const result = await getAuth();

      expect(result).toBeNull();
    });

    it('should not use localStorage on native', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('access-token');

      await getAuth();

      expect(localStorageMock.getItem).not.toHaveBeenCalled();
    });
  });

  describe('clearAuth - Web', () => {
    beforeEach(() => {
      setPlatform('web');
    });

    it('should remove all stored credentials', async () => {
      storage[TOKEN_KEY] = 'access-token';
      storage[REFRESH_TOKEN_KEY] = 'refresh-token';
      storage[USERNAME_KEY] = 'testuser';

      await clearAuth();

      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(3);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(TOKEN_KEY);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        REFRESH_TOKEN_KEY,
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(USERNAME_KEY);

      expect(storage).toEqual({});
    });

    it('should call clearCurrentField', async () => {
      await clearAuth();

      expect(clearCurrentField).toHaveBeenCalledTimes(1);
    });

    it('should not use SecureStore on web', async () => {
      await clearAuth();

      expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    });
  });

  describe('clearAuth - Native', () => {
    beforeEach(() => {
      setPlatform('ios');
    });

    it('should delete all credentials using SecureStore', async () => {
      await clearAuth();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        REFRESH_TOKEN_KEY,
      );
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(USERNAME_KEY);
    });

    it('should call clearCurrentField', async () => {
      await clearAuth();

      expect(clearCurrentField).toHaveBeenCalledTimes(1);
    });

    it('should not use localStorage on native', async () => {
      await clearAuth();

      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate SecureStore setItemAsync errors', async () => {
      setPlatform('ios');

      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
        new Error('SecureStore write failed'),
      );

      await expect(setAuth('testuser', 'access-token')).rejects.toThrow(
        'SecureStore write failed',
      );
    });

    it('should propagate SecureStore getItemAsync errors', async () => {
      setPlatform('ios');

      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('SecureStore read failed'),
      );

      await expect(getAuth()).rejects.toThrow('SecureStore read failed');
    });

    it('should propagate SecureStore deleteItemAsync errors', async () => {
      setPlatform('ios');

      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(
        new Error('SecureStore delete failed'),
      );

      await expect(clearAuth()).rejects.toThrow('SecureStore delete failed');
    });

    it('should propagate clearCurrentField errors', async () => {
      setPlatform('web');

      (clearCurrentField as jest.Mock).mockRejectedValue(
        new Error('Could not clear current field'),
      );

      await expect(clearAuth()).rejects.toThrow(
        'Could not clear current field',
      );
    });
  });
});
