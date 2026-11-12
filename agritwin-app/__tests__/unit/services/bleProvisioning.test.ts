import { createDevice, getField } from '@/services/api';
import { base64ToText, textToBase64 } from '@/services/bleEncoding';
import {
  BLE_CHAR_COMMAND_UUID,
  BLE_CHAR_FIELD_UUID,
  BLE_CHAR_INFO_UUID,
  BLE_CHAR_WIFI_PSK_UUID,
  BLE_CHAR_SSID_UUID,
  BLE_CHAR_STATUS_UUID,
  BLE_MTU,
  BLE_SERVICE_UUID,
  CONNECT_TIMEOUT_MS,
  ProvisioningError,
  boardErrorCode,
  connectToBoard,
  disconnectBoard,
  ensureBluetoothOn,
  parseBoardInfo,
  provisioningErrorMessageKey,
  registerBoard,
  scanForBoards,
  sendWifiSettings,
  stopScan,
  toProvisioningError,
  validateWifiSettings,
  type BoardInfo,
} from '@/services/bleProvisioning';

import {
  BOARD_INFO_JSON,
  createFakeBleManager,
} from '../helpers/fakeBleManager';

jest.mock('@/services/api', () => ({
  getField: jest.fn(),
  createDevice: jest.fn(),
}));

const mockedGetField = getField as jest.MockedFunction<typeof getField>;
const mockedCreateDevice = createDevice as jest.MockedFunction<
  typeof createDevice
>;

const BOARD_INFO: BoardInfo = {
  deviceId: 'esp32_A1B2C3D4E5F6',
  serialNumber: 'A1B2C3D4E5F6',
  firmwareVersion: '0.1.0',
  model: 'AgriTwin Soil Node',
};

const WIFI = { ssid: 'Casa Pérez', password: 'secret-123', fieldId: 3 };

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return (error as ProvisioningError).code;
  }
  throw new Error('Expected the promise to reject');
}

describe('bleProvisioning', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('error helpers', () => {
    it('maps the board errors to error codes', () => {
      expect(boardErrorCode('error:wifi_not_found')).toBe('wifi_not_found');
      expect(boardErrorCode('error:wrong_password')).toBe('wrong_password');
      expect(boardErrorCode('error:wifi_timeout')).toBe('wifi_timeout');
      expect(boardErrorCode('error:no_internet')).toBe('no_internet');
      expect(boardErrorCode('error:missing_data')).toBe('missing_data');
      expect(boardErrorCode('error:bad_field_id')).toBe('bad_field_id');
      expect(boardErrorCode('error:something_new')).toBe('unknown');
    });

    it('builds the i18n key of each error', () => {
      expect(provisioningErrorMessageKey('wrong_password')).toBe(
        'deviceSetup.errors.wrong_password',
      );
    });

    it('keeps a ProvisioningError and wraps anything else', () => {
      const original = new ProvisioningError('no_internet');
      expect(toProvisioningError(original, 'unknown')).toBe(original);

      const cause = new Error('boom');
      const wrapped = toProvisioningError(cause, 'scan_failed');
      expect(wrapped).toBeInstanceOf(ProvisioningError);
      expect(wrapped.code).toBe('scan_failed');
      expect(wrapped.message).toBe('scan_failed');
      expect((wrapped as { cause?: unknown }).cause).toBe(cause);
    });
  });

  describe('ensureBluetoothOn', () => {
    it('passes when Bluetooth is on', async () => {
      const fake = createFakeBleManager();
      await expect(ensureBluetoothOn(fake.transport)).resolves.toBeUndefined();
    });

    it('fails with bluetooth_off otherwise', async () => {
      const fake = createFakeBleManager();
      fake.manager.state.mockResolvedValue('PoweredOff');
      expect(await codeOf(ensureBluetoothOn(fake.transport))).toBe(
        'bluetooth_off',
      );
    });
  });

  describe('scanForBoards', () => {
    it('returns each board once, filtering on the AgriTwin service', async () => {
      const fake = createFakeBleManager();
      const onBoardFound = jest.fn();

      const scan = scanForBoards(fake.transport, {
        timeoutMs: 20,
        onBoardFound,
      });
      fake.emitDevice({ id: 'AA:01', localName: 'AgriTwin-E5F6' });
      fake.emitDevice({ id: 'AA:01', localName: 'AgriTwin-E5F6' });
      fake.emitDevice({ id: 'AA:02', name: 'AgriTwin-0A0B' });
      fake.emitScanResult(null, null);

      await expect(scan).resolves.toEqual([
        { id: 'AA:01', name: 'AgriTwin-E5F6' },
        { id: 'AA:02', name: 'AgriTwin-0A0B' },
      ]);
      expect(onBoardFound).toHaveBeenCalledTimes(2);
      expect(fake.manager.startDeviceScan).toHaveBeenCalledWith(
        [BLE_SERVICE_UUID],
        null,
        expect.any(Function),
      );
      expect(fake.manager.stopDeviceScan).toHaveBeenCalled();
    });

    it('reports a board again when its real name arrives', async () => {
      const fake = createFakeBleManager();
      const onBoardFound = jest.fn();

      const scan = scanForBoards(fake.transport, {
        timeoutMs: 20,
        onBoardFound,
      });
      fake.emitDevice({ id: 'AA:01' });
      fake.emitDevice({ id: 'AA:01', localName: 'AgriTwin-E5F6' });

      await expect(scan).resolves.toEqual([
        { id: 'AA:01', name: 'AgriTwin-E5F6' },
      ]);
      expect(onBoardFound).toHaveBeenNthCalledWith(1, {
        id: 'AA:01',
        name: 'AgriTwin',
      });
      expect(onBoardFound).toHaveBeenNthCalledWith(2, {
        id: 'AA:01',
        name: 'AgriTwin-E5F6',
      });
    });

    it('resolves an empty list when nothing is found', async () => {
      const fake = createFakeBleManager();
      await expect(
        scanForBoards(fake.transport, { timeoutMs: 10 }),
      ).resolves.toEqual([]);
    });

    it('fails with scan_failed when the scan reports an error', async () => {
      const fake = createFakeBleManager();
      const scan = scanForBoards(fake.transport, { timeoutMs: 1000 });
      fake.emitScanResult(new Error('scan error'), null);
      fake.emitDevice({ id: 'AA:01', localName: 'AgriTwin-E5F6' });

      expect(await codeOf(scan)).toBe('scan_failed');
    });

    it('fails with scan_failed when the scan cannot start', async () => {
      const fake = createFakeBleManager();
      fake.manager.startDeviceScan.mockRejectedValue(new Error('no adapter'));

      expect(await codeOf(scanForBoards(fake.transport))).toBe('scan_failed');
    });

    it('stopScan ignores errors', async () => {
      const fake = createFakeBleManager();
      fake.manager.stopDeviceScan.mockRejectedValue(new Error('not scanning'));

      await expect(stopScan(fake.transport)).resolves.toBeUndefined();
    });
  });

  describe('parseBoardInfo', () => {
    it('reads the INFO JSON sent by the firmware', () => {
      expect(parseBoardInfo(JSON.stringify(BOARD_INFO_JSON))).toEqual(
        BOARD_INFO,
      );
    });

    it('uses empty strings for the optional fields', () => {
      expect(
        parseBoardInfo('{"device_id":"esp32_X","serial":"X"}'),
      ).toMatchObject({ firmwareVersion: '', model: '' });
    });

    it.each(['not json', 'null', '{"device_id":"esp32_X"}', '{"serial":"X"}'])(
      'rejects an invalid INFO value: %p',
      (text) => {
        expect(() => parseBoardInfo(text)).toThrow(ProvisioningError);
      },
    );
  });

  describe('connectToBoard', () => {
    it('connects with a large MTU and reads the board identity', async () => {
      const fake = createFakeBleManager();

      await expect(connectToBoard(fake.transport, 'AA:01')).resolves.toEqual(
        BOARD_INFO,
      );
      expect(fake.manager.connectToDevice).toHaveBeenCalledWith('AA:01', {
        requestMTU: BLE_MTU,
        timeout: CONNECT_TIMEOUT_MS,
      });
      expect(fake.manager.readCharacteristicForDevice).toHaveBeenCalledWith(
        'AA:01',
        BLE_SERVICE_UUID,
        BLE_CHAR_INFO_UUID,
      );
    });

    it('disconnects and fails with connection_failed on error', async () => {
      const fake = createFakeBleManager();
      fake.manager.connectToDevice.mockRejectedValue(new Error('timeout'));

      expect(await codeOf(connectToBoard(fake.transport, 'AA:01'))).toBe(
        'connection_failed',
      );
      expect(fake.manager.cancelDeviceConnection).toHaveBeenCalledWith('AA:01');
    });

    it('fails with connection_failed when INFO is not valid', async () => {
      const fake = createFakeBleManager();
      fake.manager.readCharacteristicForDevice.mockResolvedValue({
        value: textToBase64('garbage'),
      });

      expect(await codeOf(connectToBoard(fake.transport, 'AA:01'))).toBe(
        'connection_failed',
      );
    });

    it('disconnectBoard ignores "already disconnected"', async () => {
      const fake = createFakeBleManager();
      fake.manager.cancelDeviceConnection.mockRejectedValue(
        new Error('not connected'),
      );

      await expect(
        disconnectBoard(fake.transport, 'AA:01'),
      ).resolves.toBeUndefined();
    });
  });

  describe('validateWifiSettings', () => {
    it.each([
      { ssid: '', password: 'x', fieldId: 1 },
      { ssid: '   ', password: 'x', fieldId: 1 },
      { ssid: 'Home', password: 'x', fieldId: 0 },
      { ssid: 'Home', password: 'x', fieldId: 1.5 },
    ])('rejects %p', (settings) => {
      expect(() => validateWifiSettings(settings)).toThrow(ProvisioningError);
    });

    it('accepts an open network without password', () => {
      expect(() =>
        validateWifiSettings({ ssid: 'Home', password: '', fieldId: 1 }),
      ).not.toThrow();
    });
  });

  describe('sendWifiSettings', () => {
    function writtenValues(fake: ReturnType<typeof createFakeBleManager>) {
      return fake.manager.writeCharacteristicWithResponseForDevice.mock.calls.map(
        ([, , uuid, value]) => [uuid, base64ToText(value as string)],
      );
    }

    it('sends the settings in order and resolves on "connected"', async () => {
      const fake = createFakeBleManager();
      const onStatus = jest.fn();

      await expect(
        sendWifiSettings(fake.transport, 'AA:01', WIFI, { onStatus }),
      ).resolves.toBeUndefined();

      expect(writtenValues(fake)).toEqual([
        [BLE_CHAR_SSID_UUID, 'Casa Pérez'],
        [BLE_CHAR_WIFI_PSK_UUID, 'secret-123'],
        [BLE_CHAR_FIELD_UUID, '3'],
        [BLE_CHAR_COMMAND_UUID, 'connect'],
      ]);
      expect(fake.manager.monitorCharacteristicForDevice).toHaveBeenCalledWith(
        'AA:01',
        BLE_SERVICE_UUID,
        BLE_CHAR_STATUS_UUID,
        expect.any(Function),
      );
      expect(onStatus.mock.calls).toEqual([['connecting'], ['connected']]);
      expect(fake.subscription.remove).toHaveBeenCalled();
    });

    it('fails with the error code sent by the board', async () => {
      const fake = createFakeBleManager();
      fake.setAnswerToConnect(['connecting', 'error:wrong_password']);

      expect(
        await codeOf(sendWifiSettings(fake.transport, 'AA:01', WIFI)),
      ).toBe('wrong_password');
    });

    it('ignores empty status values', async () => {
      const fake = createFakeBleManager();
      fake.setAnswerToConnect(['', 'connected']);
      const onStatus = jest.fn();

      await sendWifiSettings(fake.transport, 'AA:01', WIFI, { onStatus });
      expect(onStatus.mock.calls).toEqual([['connected']]);
    });

    it('fails with connection_lost when the notifications fail', async () => {
      const fake = createFakeBleManager();
      fake.setAnswerToConnect([]);
      const sending = sendWifiSettings(fake.transport, 'AA:01', WIFI);
      fake.emitStatusError(new Error('disconnected'));

      expect(await codeOf(sending)).toBe('connection_lost');
    });

    it('fails with connection_lost when a write fails', async () => {
      const fake = createFakeBleManager();
      fake.manager.writeCharacteristicWithResponseForDevice.mockRejectedValue(
        new Error('write failed'),
      );

      expect(
        await codeOf(sendWifiSettings(fake.transport, 'AA:01', WIFI)),
      ).toBe('connection_lost');
    });

    it('fails with no_answer when the board never answers', async () => {
      const fake = createFakeBleManager();
      fake.setAnswerToConnect(['connecting']);

      expect(
        await codeOf(
          sendWifiSettings(fake.transport, 'AA:01', WIFI, { timeoutMs: 20 }),
        ),
      ).toBe('no_answer');
    });

    it('rejects invalid input without touching the board', async () => {
      const fake = createFakeBleManager();

      expect(
        await codeOf(
          sendWifiSettings(fake.transport, 'AA:01', { ...WIFI, ssid: '' }),
        ),
      ).toBe('invalid_input');
      expect(
        fake.manager.writeCharacteristicWithResponseForDevice,
      ).not.toHaveBeenCalled();
    });
  });

  describe('registerBoard', () => {
    const field = (deviceIds: string[]) =>
      ({
        devices: deviceIds.map((id) => ({ id, battery_status: false })),
      }) as unknown as Awaited<ReturnType<typeof getField>>;

    it('creates the device on the field', async () => {
      mockedGetField.mockResolvedValue(field(['other']));
      mockedCreateDevice.mockResolvedValue({
        id: BOARD_INFO.deviceId,
        battery_status: false,
      });

      await expect(registerBoard(3, BOARD_INFO)).resolves.toBe('created');
      expect(mockedCreateDevice).toHaveBeenCalledWith(3, {
        id: 'esp32_A1B2C3D4E5F6',
        brand: 'AgriTwin',
        serial_number: 'A1B2C3D4E5F6',
      });
    });

    it('accepts a board already linked to the same field', async () => {
      mockedGetField.mockResolvedValue(field([BOARD_INFO.deviceId]));

      await expect(registerBoard(3, BOARD_INFO)).resolves.toBe(
        'already_linked',
      );
      expect(mockedCreateDevice).not.toHaveBeenCalled();
    });

    it.each([
      ['Not authenticated', 'session_expired'],
      ['This device is already registered', 'already_registered_elsewhere'],
      ['Server error', 'registration_failed'],
    ])('maps "%s" to %s', async (message, code) => {
      mockedGetField.mockResolvedValue(field([]));
      mockedCreateDevice.mockRejectedValue(new Error(message));

      expect(await codeOf(registerBoard(3, BOARD_INFO))).toBe(code);
    });

    it('fails with registration_failed when the field cannot be read', async () => {
      mockedGetField.mockRejectedValue('offline');

      expect(await codeOf(registerBoard(3, BOARD_INFO))).toBe(
        'registration_failed',
      );
    });
  });
});
