// Runtime permissions needed to scan and connect to Bluetooth LE boards.
//
// - Android 12+ (API 31+): "Nearby devices" (BLUETOOTH_SCAN + BLUETOOTH_CONNECT)
// - Android 11 and lower: location (ACCESS_FINE_LOCATION), required by the
//   system for any Bluetooth scan
// - iOS: the system asks by itself the first time Bluetooth is used, the text
//   comes from app.json (react-native-ble-plx plugin)

import { PermissionsAndroid, Platform, type Permission } from 'react-native';

const ANDROID_12_API_LEVEL = 31;

function requiredAndroidPermissions(): Permission[] {
  const apiLevel =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : Number(Platform.Version);
  if (apiLevel >= ANDROID_12_API_LEVEL) {
    return [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ];
  }
  return [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
}

/** Asks the Bluetooth permissions. Returns true when they are all granted. */
export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const permissions = requiredAndroidPermissions();
  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every(
    (permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
}
