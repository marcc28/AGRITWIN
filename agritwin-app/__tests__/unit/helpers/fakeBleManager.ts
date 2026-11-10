// Fake react-native-ble-plx manager that behaves like an AgriTwin board in
// setup mode. Used by the Bluetooth provisioning tests.

import { textToBase64 } from '../../../src/services/bleEncoding';
import {
  BLE_CHAR_COMMAND_UUID,
  type BleTransport,
} from '../../../src/services/bleProvisioning';

export const BOARD_INFO_JSON = {
  device_id: 'esp32_A1B2C3D4E5F6',
  serial: 'A1B2C3D4E5F6',
  fw: '0.1.0',
  model: 'AgriTwin Soil Node',
};

type ScanListener = Parameters<BleTransport['startDeviceScan']>[2];
type StatusListener = Parameters<
  BleTransport['monitorCharacteristicForDevice']
>[3];

export function createFakeBleManager() {
  let scanListener: ScanListener | null = null;
  let statusListener: StatusListener | null = null;
  /** Statuses the board sends after receiving the "connect" command. */
  let answerToConnect: string[] = ['connecting', 'connected'];
  const subscription = { remove: jest.fn() };

  const emitStatus = (status: string) =>
    statusListener?.(null, {
      value: textToBase64(status),
    } as unknown as Parameters<StatusListener>[1]);

  const manager = {
    state: jest.fn().mockResolvedValue('PoweredOn'),
    startDeviceScan: jest.fn(
      async (_uuids: unknown, _options: unknown, listener: ScanListener) => {
        scanListener = listener;
      },
    ),
    stopDeviceScan: jest.fn().mockResolvedValue(undefined),
    connectToDevice: jest.fn().mockResolvedValue({}),
    discoverAllServicesAndCharacteristicsForDevice: jest
      .fn()
      .mockResolvedValue({}),
    readCharacteristicForDevice: jest.fn().mockResolvedValue({
      value: textToBase64(JSON.stringify(BOARD_INFO_JSON)),
    }),
    writeCharacteristicWithResponseForDevice: jest.fn(
      async (
        _deviceId: string,
        _serviceUuid: string,
        characteristicUuid: string,
        _base64Value: string,
      ) => {
        if (characteristicUuid === BLE_CHAR_COMMAND_UUID) {
          // The board answers a moment after the command, like the real one.
          setTimeout(() => answerToConnect.forEach(emitStatus), 0);
        }
        return {};
      },
    ),
    monitorCharacteristicForDevice: jest.fn(
      (
        _deviceId: string,
        _serviceUuid: string,
        _characteristicUuid: string,
        listener: StatusListener,
      ) => {
        statusListener = listener;
        return subscription;
      },
    ),
    cancelDeviceConnection: jest.fn().mockResolvedValue({}),
    isDeviceConnected: jest.fn().mockResolvedValue(true),
  };

  return {
    manager,
    transport: manager as unknown as BleTransport,
    subscription,
    /** A board appears during the scan. */
    emitDevice(device: {
      id: string;
      localName?: string | null;
      name?: string | null;
    }) {
      scanListener?.(null, {
        localName: null,
        name: null,
        ...device,
      } as unknown as Parameters<ScanListener>[1]);
    },
    emitScanResult(error: unknown, device: unknown) {
      scanListener?.(
        error as Parameters<ScanListener>[0],
        device as Parameters<ScanListener>[1],
      );
    },
    emitStatus,
    emitStatusError(error: unknown) {
      statusListener?.(error as Parameters<StatusListener>[0], null);
    },
    /** Changes what the board answers to "connect". */
    setAnswerToConnect(statuses: string[]) {
      answerToConnect = statuses;
    },
  };
}
