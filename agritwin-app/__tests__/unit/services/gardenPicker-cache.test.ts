import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import {
  getCachedGardenPickerFields,
  loadGardenPickerFields,
} from '@/services/gardenPicker';
import { getFields, type Field } from '@/services/api';
import { getAuth } from '@/services/auth';
import { queryClient } from '@/services/queryClient';
import { queryKeys } from '@/services/queryKeys';

jest.mock('@/services/api', () => ({ getFields: jest.fn() }));
jest.mock('@/services/auth', () => ({ getAuth: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const fields = [{ id: 3, name: 'Camp', device_count: 0 }] as Field[];

describe('gardens known without the server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    (getAuth as jest.Mock).mockResolvedValue({
      token: 't',
      username: 'anna',
    });
  });

  it('reads the list saved in the last session', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
      JSON.stringify(fields),
    );

    await expect(getCachedGardenPickerFields()).resolves.toEqual(fields);
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
      'agritwin_garden_picker_fields_anna',
    );
  });

  it('has nothing when no list was saved', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    await expect(getCachedGardenPickerFields()).resolves.toBeNull();
  });

  it('uses the list in memory and shares it with the screens', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (getFields as jest.Mock).mockResolvedValue(fields);

    await loadGardenPickerFields(true);
    (SecureStore.getItemAsync as jest.Mock).mockClear();

    await expect(getCachedGardenPickerFields()).resolves.toEqual(fields);
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(queryKeys.fields)).toEqual(fields);
  });
});
