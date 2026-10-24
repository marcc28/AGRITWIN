import {
  clearCurrentField,
  getCurrentField,
  setCurrentField,
  subscribeCurrentField,
} from '../../../src/services/currentField';

const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
}));

describe('currentField', () => {
  beforeEach(async () => {
    mockStore.clear();
    await clearCurrentField();
  });

  it('returns null when nothing is stored', async () => {
    await expect(getCurrentField()).resolves.toBeNull();
  });

  it('stores and reads the current field', async () => {
    await setCurrentField({ id: 3, name: 'Hort' });
    await expect(getCurrentField()).resolves.toEqual({ id: 3, name: 'Hort' });
  });

  it('does not notify when the same field is set again', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeCurrentField(listener);

    await setCurrentField({ id: 3, name: 'Hort' });
    listener.mockClear();
    await setCurrentField({ id: 3, name: 'Hort' });

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('notifies subscribers when the field changes', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeCurrentField(listener);

    await setCurrentField({ id: 3, name: 'Hort' });
    expect(listener).toHaveBeenCalledTimes(1);

    await setCurrentField({ id: 4, name: 'Camp' });
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('ignores invalid stored json', async () => {
    mockStore.set('agritwin_current_field', '{bad');
    await expect(getCurrentField()).resolves.toBeNull();
  });
});
