import * as SecureStore from 'expo-secure-store';

import {
  clearCurrentField,
  getCurrentField,
  peekCurrentField,
  resetCurrentFieldCache,
  setCurrentField,
} from '@/services/currentField';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const storage: Record<string, string> = {};

describe('current field kept in memory', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    resetCurrentFieldCache();
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(
      async (key: string) => storage[key] ?? null,
    );
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

  it('is unknown before anything is read', () => {
    expect(peekCurrentField()).toBeUndefined();
  });

  it('remembers what was read from storage', async () => {
    storage.agritwin_current_field = JSON.stringify({ id: 2, name: 'Hort' });

    await getCurrentField();

    expect(peekCurrentField()).toEqual({ id: 2, name: 'Hort' });
  });

  it('follows a new selection and a logout', async () => {
    await setCurrentField({ id: 5, name: 'Vinya' });
    expect(peekCurrentField()).toEqual({ id: 5, name: 'Vinya' });

    await clearCurrentField();
    expect(peekCurrentField()).toBeNull();
  });
});
