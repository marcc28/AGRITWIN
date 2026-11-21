import { PermissionsAndroid, Platform } from 'react-native';

import { requestBlePermissions } from '@/services/blePermissions';

const { BLUETOOTH_SCAN, BLUETOOTH_CONNECT, ACCESS_FINE_LOCATION } =
  PermissionsAndroid.PERMISSIONS;
const { GRANTED, DENIED } = PermissionsAndroid.RESULTS;

function setPlatform(os: string, version: number | string) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  Object.defineProperty(Platform, 'Version', {
    value: version,
    configurable: true,
  });
}

describe('requestBlePermissions', () => {
  const originalOs = Platform.OS;
  const originalVersion = Platform.Version;
  let requestMultiple: jest.SpyInstance;

  beforeEach(() => {
    requestMultiple = jest.spyOn(PermissionsAndroid, 'requestMultiple');
  });

  afterEach(() => {
    requestMultiple.mockRestore();
    setPlatform(originalOs, originalVersion);
  });

  it('does not ask anything on iOS', async () => {
    setPlatform('ios', '18.0');

    await expect(requestBlePermissions()).resolves.toBe(true);
    expect(requestMultiple).not.toHaveBeenCalled();
  });

  it('asks "Nearby devices" on Android 12 and newer', async () => {
    setPlatform('android', 33);
    requestMultiple.mockResolvedValue({
      [BLUETOOTH_SCAN]: GRANTED,
      [BLUETOOTH_CONNECT]: GRANTED,
    });

    await expect(requestBlePermissions()).resolves.toBe(true);
    expect(requestMultiple).toHaveBeenCalledWith([
      BLUETOOTH_SCAN,
      BLUETOOTH_CONNECT,
    ]);
  });

  it('asks location on Android 11 and older', async () => {
    setPlatform('android', '30');
    requestMultiple.mockResolvedValue({ [ACCESS_FINE_LOCATION]: GRANTED });

    await expect(requestBlePermissions()).resolves.toBe(true);
    expect(requestMultiple).toHaveBeenCalledWith([ACCESS_FINE_LOCATION]);
  });

  it('returns false when one permission is denied', async () => {
    setPlatform('android', 34);
    requestMultiple.mockResolvedValue({
      [BLUETOOTH_SCAN]: GRANTED,
      [BLUETOOTH_CONNECT]: DENIED,
    });

    await expect(requestBlePermissions()).resolves.toBe(false);
  });
});
