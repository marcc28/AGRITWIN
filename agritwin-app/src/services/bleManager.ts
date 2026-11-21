// Single shared Bluetooth LE manager for the whole app.
//
// react-native-ble-plx allows only ONE BleManager instance at a time, so every
// screen must get it from here instead of creating a new one.

import { BleManager } from 'react-native-ble-plx';

let manager: BleManager | null = null;

export function getBleManager(): BleManager {
  manager ??= new BleManager();
  return manager;
}
