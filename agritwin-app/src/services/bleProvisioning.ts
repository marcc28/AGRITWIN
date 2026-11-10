// First setup of an AgriTwin board over Bluetooth LE ("provisioning").
//
// A new board has no Wi-Fi saved, so it turns Bluetooth on and waits. This
// service talks to it with the protocol of iot/firmware/README.md:
//   1. scan for boards advertising the AgriTwin service
//   2. connect and read INFO (device id, serial number, firmware)
//   3. write SSID, PASSWORD, FIELD_ID, then COMMAND "connect"
//   4. wait for STATUS: "connected" or "error:..."
//   5. register the board in the backend with createDevice()
//
// The UUIDs must stay identical to iot/firmware/agritwin_esp32/config.h and
// iot/firmware/tools/provision_ble.py.

import type { BleManager, Device, Subscription } from 'react-native-ble-plx';

import { createDevice, getField } from './api';
import { base64ToText, textToBase64 } from './bleEncoding';

export const BLE_SERVICE_UUID = '422285f2-0000-4631-a335-64b1ab75567c';
export const BLE_CHAR_INFO_UUID = '422285f2-0001-4631-a335-64b1ab75567c';
export const BLE_CHAR_SSID_UUID = '422285f2-0002-4631-a335-64b1ab75567c';
export const BLE_CHAR_PASSWORD_UUID = '422285f2-0003-4631-a335-64b1ab75567c';
export const BLE_CHAR_FIELD_UUID = '422285f2-0004-4631-a335-64b1ab75567c';
export const BLE_CHAR_COMMAND_UUID = '422285f2-0005-4631-a335-64b1ab75567c';
export const BLE_CHAR_STATUS_UUID = '422285f2-0006-4631-a335-64b1ab75567c';

export const BOARD_NAME_PREFIX = 'AgriTwin-';
export const BOARD_BRAND = 'AgriTwin';

export const SCAN_TIMEOUT_MS = 8000;
export const CONNECT_TIMEOUT_MS = 10000;
// The board tests the Wi-Fi for up to 20 s and the Internet for up to 5 s.
export const STATUS_TIMEOUT_MS = 40000;
// The firmware accepts up to 256 bytes, enough for SSID + password in one write.
export const BLE_MTU = 256;

/** Subset of BleManager used here: lets the tests pass a fake manager. */
export type BleTransport = Pick<
  BleManager,
  | 'startDeviceScan'
  | 'stopDeviceScan'
  | 'connectToDevice'
  | 'discoverAllServicesAndCharacteristicsForDevice'
  | 'readCharacteristicForDevice'
  | 'writeCharacteristicWithResponseForDevice'
  | 'monitorCharacteristicForDevice'
  | 'cancelDeviceConnection'
  | 'isDeviceConnected'
  | 'state'
>;

/** A board found during the scan, shown in the list. */
export type BleBoard = {
  /** Bluetooth id used to connect (MAC on Android, UUID on iOS). */
  id: string;
  /** Name shown to the user, e.g. "AgriTwin-E5F6". */
  name: string;
};

/** Content of the INFO characteristic. */
export type BoardInfo = {
  deviceId: string;
  serialNumber: string;
  firmwareVersion: string;
  model: string;
};

export type WifiSettings = {
  ssid: string;
  password: string;
  fieldId: number;
};

/** Status values the board sends on the STATUS characteristic. */
export type BoardStatus = 'waiting' | 'connecting' | 'connected' | string;

export type RegistrationResult = 'created' | 'already_linked';

export type ProvisioningErrorCode =
  // Phone side
  | 'bluetooth_off'
  | 'permission_denied'
  | 'scan_failed'
  | 'invalid_input'
  // Bluetooth link
  | 'connection_failed'
  | 'connection_lost'
  | 'no_answer'
  // Sent by the board
  | 'missing_data'
  | 'bad_field_id'
  | 'wifi_not_found'
  | 'wrong_password'
  | 'wifi_timeout'
  | 'no_internet'
  // Backend registration
  | 'session_expired'
  | 'already_registered_elsewhere'
  | 'registration_failed'
  | 'unknown';

export class ProvisioningError extends Error {
  readonly code: ProvisioningErrorCode;

  constructor(code: ProvisioningErrorCode, cause?: unknown) {
    super(code);
    this.name = 'ProvisioningError';
    this.code = code;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

/** Keeps a ProvisioningError as it is, wraps anything else in `fallback`. */
export function toProvisioningError(
  error: unknown,
  fallback: ProvisioningErrorCode,
): ProvisioningError {
  return error instanceof ProvisioningError
    ? error
    : new ProvisioningError(fallback, error);
}

const BOARD_ERRORS: Record<string, ProvisioningErrorCode> = {
  'error:missing_data': 'missing_data',
  'error:bad_field_id': 'bad_field_id',
  'error:wifi_not_found': 'wifi_not_found',
  'error:wrong_password': 'wrong_password',
  'error:wifi_timeout': 'wifi_timeout',
  'error:no_internet': 'no_internet',
};

/** Maps a board status such as "error:wrong_password" to an error code. */
export function boardErrorCode(status: string): ProvisioningErrorCode {
  return BOARD_ERRORS[status] ?? 'unknown';
}

/** i18n key of the message to show for each error code. */
export function provisioningErrorMessageKey(
  code: ProvisioningErrorCode,
): string {
  return `deviceSetup.errors.${code}`;
}

/** Bluetooth must be powered on before scanning. */
export async function ensureBluetoothOn(manager: BleTransport): Promise<void> {
  const state = await manager.state();
  if (state !== 'PoweredOn') {
    throw new ProvisioningError('bluetooth_off');
  }
}

function boardFromDevice(device: Device): BleBoard {
  return {
    id: device.id,
    // The name is in the scan response, it can be missing in the first packet.
    name: device.localName ?? device.name ?? BOARD_BRAND,
  };
}

/**
 * Scans for AgriTwin boards in setup mode for `timeoutMs` and returns the
 * boards found. `onBoardFound` is called as soon as each board appears, so the
 * list can be updated live.
 */
export function scanForBoards(
  manager: BleTransport,
  options: {
    timeoutMs?: number;
    onBoardFound?: (board: BleBoard) => void;
  } = {},
): Promise<BleBoard[]> {
  const timeoutMs = options.timeoutMs ?? SCAN_TIMEOUT_MS;
  const found = new Map<string, BleBoard>();

  return new Promise((resolve, reject) => {
    let finished = false;

    const finish = (error?: ProvisioningError) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timer);
      manager.stopDeviceScan().catch(() => undefined);
      if (error) {
        reject(error);
      } else {
        resolve([...found.values()]);
      }
    };

    const timer = setTimeout(() => finish(), timeoutMs);

    manager
      .startDeviceScan([BLE_SERVICE_UUID], null, (error, device) => {
        if (error) {
          finish(new ProvisioningError('scan_failed', error));
          return;
        }
        if (!device || finished) {
          return;
        }
        const board = boardFromDevice(device);
        const known = found.get(board.id);
        // Report a board once, or again when its real name arrives.
        if (!known || known.name !== board.name) {
          found.set(board.id, board);
          options.onBoardFound?.(board);
        }
      })
      .catch((error: unknown) =>
        finish(new ProvisioningError('scan_failed', error)),
      );
  });
}

/** Stops a scan started with scanForBoards (e.g. when the screen closes). */
export async function stopScan(manager: BleTransport): Promise<void> {
  await manager.stopDeviceScan().catch(() => undefined);
}

/** Parses the JSON of the INFO characteristic. */
export function parseBoardInfo(text: string): BoardInfo {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new ProvisioningError('connection_failed', error);
  }
  const info = data as Record<string, unknown> | null;
  if (
    !info ||
    typeof info.device_id !== 'string' ||
    typeof info.serial !== 'string' ||
    !info.device_id ||
    !info.serial
  ) {
    throw new ProvisioningError('connection_failed');
  }
  return {
    deviceId: info.device_id,
    serialNumber: info.serial,
    firmwareVersion: typeof info.fw === 'string' ? info.fw : '',
    model: typeof info.model === 'string' ? info.model : '',
  };
}

/** Connects to the board chosen by the user and reads its identity. */
export async function connectToBoard(
  manager: BleTransport,
  boardId: string,
): Promise<BoardInfo> {
  try {
    await manager.connectToDevice(boardId, {
      requestMTU: BLE_MTU,
      timeout: CONNECT_TIMEOUT_MS,
    });
    await manager.discoverAllServicesAndCharacteristicsForDevice(boardId);
    const characteristic = await manager.readCharacteristicForDevice(
      boardId,
      BLE_SERVICE_UUID,
      BLE_CHAR_INFO_UUID,
    );
    return parseBoardInfo(base64ToText(characteristic.value));
  } catch (error) {
    await disconnectBoard(manager, boardId);
    throw toProvisioningError(error, 'connection_failed');
  }
}

/** Closes the Bluetooth connection, ignoring "already disconnected". */
export async function disconnectBoard(
  manager: BleTransport,
  boardId: string,
): Promise<void> {
  await manager.cancelDeviceConnection(boardId).catch(() => undefined);
}

/** Checks the values typed by the user before sending them to the board. */
export function validateWifiSettings(settings: WifiSettings): void {
  if (
    !settings.ssid.trim() ||
    !Number.isInteger(settings.fieldId) ||
    settings.fieldId <= 0
  ) {
    throw new ProvisioningError('invalid_input');
  }
}

async function writeText(
  manager: BleTransport,
  boardId: string,
  characteristicUuid: string,
  text: string,
): Promise<void> {
  await manager.writeCharacteristicWithResponseForDevice(
    boardId,
    BLE_SERVICE_UUID,
    characteristicUuid,
    textToBase64(text),
  );
}

/**
 * Sends Wi-Fi name, password and field id, then asks the board to connect.
 * Resolves when the board answers "connected" (it then saves the settings
 * and reboots), rejects with the matching ProvisioningError otherwise.
 * `onStatus` receives every status, e.g. "connecting".
 */
export function sendWifiSettings(
  manager: BleTransport,
  boardId: string,
  settings: WifiSettings,
  options: {
    timeoutMs?: number;
    onStatus?: (status: BoardStatus) => void;
  } = {},
): Promise<void> {
  try {
    validateWifiSettings(settings);
  } catch (error) {
    return Promise.reject(error);
  }
  const timeoutMs = options.timeoutMs ?? STATUS_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    let settled = false;
    let subscription: Subscription | null = null;

    const settle = (error?: ProvisioningError) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      subscription?.remove();
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    const timer = setTimeout(
      () => settle(new ProvisioningError('no_answer')),
      timeoutMs,
    );

    // Listen before writing, so no status is missed.
    subscription = manager.monitorCharacteristicForDevice(
      boardId,
      BLE_SERVICE_UUID,
      BLE_CHAR_STATUS_UUID,
      (error, characteristic) => {
        if (error) {
          settle(new ProvisioningError('connection_lost', error));
          return;
        }
        const status = base64ToText(characteristic?.value);
        if (!status) {
          return;
        }
        options.onStatus?.(status);
        if (status === 'connected') {
          settle();
        } else if (status.startsWith('error:')) {
          settle(new ProvisioningError(boardErrorCode(status)));
        }
      },
    );

    (async () => {
      await writeText(manager, boardId, BLE_CHAR_SSID_UUID, settings.ssid);
      await writeText(
        manager,
        boardId,
        BLE_CHAR_PASSWORD_UUID,
        settings.password,
      );
      await writeText(
        manager,
        boardId,
        BLE_CHAR_FIELD_UUID,
        String(settings.fieldId),
      );
      await writeText(manager, boardId, BLE_CHAR_COMMAND_UUID, 'connect');
    })().catch((error: unknown) =>
      settle(toProvisioningError(error, 'connection_lost')),
    );
  });
}

// Messages thrown by api.ts / the backend that need a specific error code.
const NOT_AUTHENTICATED = 'Not authenticated';
const DEVICE_CONFLICT = 'This device is already registered';

function registrationError(error: unknown): ProvisioningError {
  const message = error instanceof Error ? error.message : '';
  if (message === NOT_AUTHENTICATED) {
    return new ProvisioningError('session_expired', error);
  }
  if (message === DEVICE_CONFLICT) {
    return new ProvisioningError('already_registered_elsewhere', error);
  }
  return new ProvisioningError('registration_failed', error);
}

/**
 * Links the board to the field (and so to the logged-in account).
 * A board already linked to this same field is fine: the farmer is simply
 * setting it up again after a reset.
 */
export async function registerBoard(
  fieldId: number,
  info: BoardInfo,
): Promise<RegistrationResult> {
  try {
    const field = await getField(fieldId);
    if (field.devices.some((device) => device.id === info.deviceId)) {
      return 'already_linked';
    }
    await createDevice(fieldId, {
      id: info.deviceId,
      brand: BOARD_BRAND,
      serial_number: info.serialNumber,
    });
    return 'created';
  } catch (error) {
    throw registrationError(error);
  }
}
