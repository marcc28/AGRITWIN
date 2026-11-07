import {
  getGardenPicker,
  loadGardenPickerFields,
  openGardenPicker,
  setGardenPicker,
  subscribeGardenPicker,
} from '../../../src/services/gardenPicker';
import { getFields } from '../../../src/services/api';
import { getAuth } from '../../../src/services/auth';
import * as SecureStore from 'expo-secure-store';
import { waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

jest.mock('../../../src/services/api', () => ({ getFields: jest.fn() }));
jest.mock('../../../src/services/auth', () => ({ getAuth: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const mockGetFields = getFields as jest.MockedFunction<typeof getFields>;
const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockGetItem = SecureStore.getItemAsync as jest.Mock;
const mockSetItem = SecureStore.setItemAsync as jest.Mock;

const fields = [
  {
    id: 3,
    name: 'Camp',
    location: null,
    field_type: null,
    soil_type: null,
    size_m2: null,
    device_count: 0,
  },
];

describe('gardenPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuth.mockResolvedValue({
      token: 'token',
      username: `user-${Math.random()}`,
    } as never);
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockGetFields.mockResolvedValue(fields);
    setGardenPicker({
      open: false,
      fields: [],
      currentId: null,
      loaded: false,
      refreshing: false,
    });
  });

  it('starts closed with no fields', () => {
    expect(getGardenPicker()).toEqual({
      open: false,
      fields: [],
      currentId: null,
      loaded: false,
      refreshing: false,
    });
  });

  it('updates state and notifies subscribers', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeGardenPicker(listener);

    setGardenPicker({
      open: true,
      currentId: 3,
      fields: [
        {
          id: 3,
          name: 'Hort',
          location: null,
          field_type: null,
          soil_type: null,
          size_m2: null,
          device_count: 0,
        },
      ],
    });

    expect(getGardenPicker().open).toBe(true);
    expect(getGardenPicker().currentId).toBe(3);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('loads fields from the API and persists them for the signed-in user', async () => {
    await expect(loadGardenPickerFields()).resolves.toEqual(fields);
    expect(getGardenPicker()).toMatchObject({
      fields,
      loaded: true,
      refreshing: false,
    });
    expect(mockSetItem).toHaveBeenCalledWith(
      expect.stringMatching(/^agritwin_garden_picker_fields_user-/),
      JSON.stringify(fields),
    );
  });

  it('returns loaded fields without another request unless forced', async () => {
    await loadGardenPickerFields();
    mockGetFields.mockClear();
    await expect(loadGardenPickerFields()).resolves.toEqual(fields);
    expect(mockGetFields).not.toHaveBeenCalled();
    await loadGardenPickerFields(true);
    expect(mockGetFields).toHaveBeenCalledTimes(1);
  });

  it('hydrates cached fields before replacing them with the API result', async () => {
    const cached = [{ ...fields[0], name: 'Cached' }];
    mockGetItem.mockResolvedValue(JSON.stringify(cached));
    const notifications: string[][] = [];
    const unsubscribe = subscribeGardenPicker(() => {
      notifications.push(getGardenPicker().fields.map((field) => field.name));
    });

    await loadGardenPickerFields();

    expect(notifications).toContainEqual(['Cached']);
    expect(getGardenPicker().fields).toEqual(fields);
    unsubscribe();
  });

  it('ignores malformed cache and storage read errors', async () => {
    mockGetItem.mockResolvedValueOnce('{bad json');
    await expect(loadGardenPickerFields()).resolves.toEqual(fields);
    mockGetItem.mockRejectedValueOnce(new Error('storage unavailable'));
    setGardenPicker({ loaded: false });
    await expect(loadGardenPickerFields(true)).resolves.toEqual(fields);
  });

  it('ignores non-array cache values and supports an unauthenticated session', async () => {
    mockGetItem.mockResolvedValueOnce(JSON.stringify({ fields }));
    await expect(loadGardenPickerFields()).resolves.toEqual(fields);
    mockGetAuth.mockResolvedValue(null);
    mockGetFields.mockResolvedValueOnce(fields);
    await expect(loadGardenPickerFields(true)).resolves.toEqual(fields);
    expect(mockGetItem).toHaveBeenCalled();
  });

  it('shares an in-flight request for the same username', async () => {
    let resolveRequest!: (value: typeof fields) => void;
    mockGetFields.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const first = loadGardenPickerFields();
    const second = loadGardenPickerFields();
    await Promise.resolve();
    await Promise.resolve();
    resolveRequest(fields);
    await expect(Promise.all([first, second])).resolves.toEqual([
      fields,
      fields,
    ]);
    expect(mockGetFields).toHaveBeenCalledTimes(1);
  });

  it('clears refreshing state when the API fails and allows retry', async () => {
    mockGetFields.mockRejectedValueOnce(new Error('network down'));
    await expect(loadGardenPickerFields()).rejects.toThrow('network down');
    expect(getGardenPicker().refreshing).toBe(false);
    mockGetFields.mockResolvedValueOnce(fields);
    await expect(loadGardenPickerFields(true)).resolves.toEqual(fields);
  });

  it('opens immediately and logs background refresh failures', async () => {
    const error = new Error('network down');
    mockGetFields.mockRejectedValue(error);
    const log = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    openGardenPicker();
    expect(getGardenPicker().open).toBe(true);
    await waitFor(() =>
      expect(log).toHaveBeenCalledWith('Error actualitzant els camps:', error),
    );
    log.mockRestore();
  });

  it('keeps API fields available when persistent storage writes fail', async () => {
    mockSetItem.mockRejectedValue(new Error('storage full'));
    await expect(loadGardenPickerFields()).resolves.toEqual(fields);
    expect(getGardenPicker().fields).toEqual(fields);
  });

  it('uses web storage for the field cache', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    const storage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
    };
    Object.defineProperty(global, 'localStorage', {
      configurable: true,
      value: storage,
    });
    try {
      await loadGardenPickerFields();
      expect(storage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/^agritwin_garden_picker_fields_user-/),
        JSON.stringify(fields),
      );
    } finally {
      if (descriptor) Object.defineProperty(Platform, 'OS', descriptor);
      delete (global as { localStorage?: unknown }).localStorage;
    }
  });

  it('does not let a stale user request overwrite the newly selected user', async () => {
    let username = 'user-a';
    mockGetAuth.mockImplementation(
      async () => ({ token: 'token', username }) as never,
    );
    let resolveA!: (value: typeof fields) => void;
    let resolveB!: (value: typeof fields) => void;
    mockGetFields
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveA = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveB = resolve;
        }),
      );

    const loadA = loadGardenPickerFields();
    await waitFor(() => expect(mockGetFields).toHaveBeenCalledTimes(1));
    username = 'user-b';
    const loadB = loadGardenPickerFields();
    await waitFor(() => expect(mockGetFields).toHaveBeenCalledTimes(2));
    const fieldsA = [{ ...fields[0], name: 'Camp A' }];
    const fieldsB = [{ ...fields[0], name: 'Camp B' }];
    resolveA(fieldsA);
    await expect(loadA).resolves.toEqual(fieldsA);
    resolveB(fieldsB);
    await expect(loadB).resolves.toEqual(fieldsB);
    expect(getGardenPicker().fields).toEqual(fieldsB);
  });

  it('does not clear the new user refresh state when a stale request fails', async () => {
    let username = 'user-a';
    mockGetAuth.mockImplementation(
      async () => ({ token: 'token', username }) as never,
    );
    let rejectA!: (error: Error) => void;
    let resolveB!: (value: typeof fields) => void;
    mockGetFields
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectA = reject;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveB = resolve;
        }),
      );

    const loadA = loadGardenPickerFields();
    await waitFor(() => expect(mockGetFields).toHaveBeenCalledTimes(1));
    username = 'user-b';
    const loadB = loadGardenPickerFields();
    await waitFor(() => expect(mockGetFields).toHaveBeenCalledTimes(2));
    rejectA(new Error('old session failed'));
    await expect(loadA).rejects.toThrow('old session failed');
    expect(getGardenPicker().refreshing).toBe(true);
    resolveB(fields);
    await expect(loadB).resolves.toEqual(fields);
  });
});
