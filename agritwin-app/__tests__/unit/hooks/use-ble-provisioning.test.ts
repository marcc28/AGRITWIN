import { act, renderHook } from '@testing-library/react-native';

import { useBleProvisioning } from '@/hooks/use-ble-provisioning';
import { createDevice, getField } from '@/services/api';
import { getBleManager } from '@/services/bleManager';
import { requestBlePermissions } from '@/services/blePermissions';
import { SCAN_TIMEOUT_MS } from '@/services/bleProvisioning';

import { createFakeBleManager } from '../helpers/fakeBleManager';

jest.mock('@/services/api', () => ({
  getField: jest.fn(),
  createDevice: jest.fn(),
}));
jest.mock('@/services/bleManager', () => ({ getBleManager: jest.fn() }));
jest.mock('@/services/blePermissions', () => ({
  requestBlePermissions: jest.fn(),
}));

const mockedGetField = getField as jest.MockedFunction<typeof getField>;
const mockedCreateDevice = createDevice as jest.MockedFunction<
  typeof createDevice
>;
const mockedGetBleManager = getBleManager as jest.MockedFunction<
  typeof getBleManager
>;
const mockedPermissions = requestBlePermissions as jest.MockedFunction<
  typeof requestBlePermissions
>;

const BOARD = { id: 'AA:01', name: 'AgriTwin-E5F6' };
const FIELD_ID = 3;

let fake: ReturnType<typeof createFakeBleManager>;

/** Lets pending promises and timers run. */
async function flush(ms = 0) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

function emptyField(deviceIds: string[] = []) {
  return {
    devices: deviceIds.map((id) => ({ id, battery_status: false })),
  } as unknown as Awaited<ReturnType<typeof getField>>;
}

function renderSetup() {
  return renderHook(() => useBleProvisioning(FIELD_ID));
}

type Hook = ReturnType<typeof renderSetup>['result'];

async function scanAndFind(result: Hook, boards = [BOARD]) {
  await act(async () => {
    void result.current.startScan();
  });
  await flush();
  act(() => {
    boards.forEach((board) =>
      fake.emitDevice({ id: board.id, localName: board.name }),
    );
  });
  await flush(SCAN_TIMEOUT_MS);
}

async function selectBoard(result: Hook) {
  await act(async () => {
    void result.current.selectBoard(BOARD);
  });
  await flush();
}

async function submitWifi(result: Hook, ssid = 'Home', password = 'pw') {
  await act(async () => {
    void result.current.submitWifi(ssid, password);
  });
  await flush(10);
}

describe('useBleProvisioning', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    fake = createFakeBleManager();
    mockedGetBleManager.mockReturnValue(
      fake.transport as unknown as ReturnType<typeof getBleManager>,
    );
    mockedPermissions.mockResolvedValue(true);
    mockedGetField.mockResolvedValue(emptyField());
    mockedCreateDevice.mockResolvedValue({
      id: 'esp32_A1B2C3D4E5F6',
      battery_status: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts idle', () => {
    const { result } = renderSetup();

    expect(result.current.step).toBe('idle');
    expect(result.current.boards).toEqual([]);
    expect(result.current.errorCode).toBeNull();
  });

  it('goes through the whole flow up to success', async () => {
    const { result } = renderSetup();

    await act(async () => {
      void result.current.startScan();
    });
    await flush();
    expect(result.current.step).toBe('scanning');

    act(() => fake.emitDevice({ id: BOARD.id, localName: BOARD.name }));
    expect(result.current.boards).toEqual([BOARD]);

    await flush(SCAN_TIMEOUT_MS);
    expect(result.current.step).toBe('boardList');

    await selectBoard(result);
    expect(result.current.step).toBe('wifiForm');
    expect(result.current.selectedBoard).toEqual(BOARD);
    expect(result.current.boardInfo?.deviceId).toBe('esp32_A1B2C3D4E5F6');

    await submitWifi(result, 'Casa', 'secret');
    expect(result.current.step).toBe('success');
    expect(result.current.registration).toBe('created');
    expect(result.current.boardStatus).toBe('connected');
    expect(mockedCreateDevice).toHaveBeenCalledWith(FIELD_ID, {
      id: 'esp32_A1B2C3D4E5F6',
      brand: 'AgriTwin',
      serial_number: 'A1B2C3D4E5F6',
    });
    expect(fake.manager.cancelDeviceConnection).toHaveBeenCalledWith(BOARD.id);
  });

  it('shows the "no boards" step when nothing is found', async () => {
    const { result } = renderSetup();

    await scanAndFind(result, []);

    expect(result.current.step).toBe('noBoards');
  });

  it('fails with permission_denied and retries the scan', async () => {
    mockedPermissions.mockResolvedValueOnce(false);
    const { result } = renderSetup();

    await act(async () => {
      void result.current.startScan();
    });
    await flush();
    expect(result.current.step).toBe('error');
    expect(result.current.errorCode).toBe('permission_denied');
    expect(result.current.errorMessageKey).toBe(
      'deviceSetup.errors.permission_denied',
    );

    await act(async () => {
      void result.current.retry();
    });
    await flush();
    expect(result.current.step).toBe('scanning');
    expect(result.current.errorCode).toBeNull();
  });

  it('fails with bluetooth_off when Bluetooth is disabled', async () => {
    fake.manager.state.mockResolvedValue('PoweredOff');
    const { result } = renderSetup();

    await act(async () => {
      void result.current.startScan();
    });
    await flush();

    expect(result.current.errorCode).toBe('bluetooth_off');
  });

  it('goes back to the scan when the connection to the board fails', async () => {
    fake.manager.connectToDevice.mockRejectedValueOnce(new Error('timeout'));
    const { result } = renderSetup();
    await scanAndFind(result);

    await selectBoard(result);
    expect(result.current.errorCode).toBe('connection_failed');

    await act(async () => {
      void result.current.retry();
    });
    await flush();
    expect(result.current.step).toBe('scanning');
  });

  it('shows the board error and goes back to the Wi-Fi form', async () => {
    fake.setAnswerToConnect(['connecting', 'error:wrong_password']);
    const { result } = renderSetup();
    await scanAndFind(result);
    await selectBoard(result);

    await submitWifi(result);
    expect(result.current.step).toBe('error');
    expect(result.current.errorCode).toBe('wrong_password');
    expect(result.current.errorMessageKey).toBe(
      'deviceSetup.errors.wrong_password',
    );

    await act(async () => {
      void result.current.retry();
    });
    expect(result.current.step).toBe('wifiForm');
    expect(result.current.boardStatus).toBeNull();

    fake.setAnswerToConnect(['connected']);
    await submitWifi(result);
    expect(result.current.step).toBe('success');
  });

  it('reconnects to the board when the link was lost', async () => {
    const { result } = renderSetup();
    await scanAndFind(result);
    await selectBoard(result);
    fake.manager.isDeviceConnected.mockResolvedValueOnce(false);

    await submitWifi(result);

    expect(fake.manager.connectToDevice).toHaveBeenCalledTimes(2);
    expect(result.current.step).toBe('success');
  });

  it('retries only the registration when the backend fails', async () => {
    mockedCreateDevice.mockRejectedValueOnce(new Error('Server error'));
    const { result } = renderSetup();
    await scanAndFind(result);
    await selectBoard(result);

    await submitWifi(result);
    expect(result.current.errorCode).toBe('registration_failed');
    const writes =
      fake.manager.writeCharacteristicWithResponseForDevice.mock.calls.length;

    await act(async () => {
      void result.current.retry();
    });
    await flush();
    expect(result.current.step).toBe('success');
    expect(
      fake.manager.writeCharacteristicWithResponseForDevice,
    ).toHaveBeenCalledTimes(writes);
  });

  it('reports a board already linked to this field as success', async () => {
    mockedGetField.mockResolvedValue(emptyField(['esp32_A1B2C3D4E5F6']));
    const { result } = renderSetup();
    await scanAndFind(result);
    await selectBoard(result);

    await submitWifi(result);

    expect(result.current.step).toBe('success');
    expect(result.current.registration).toBe('already_linked');
  });

  it('fails when submitting without a selected board', async () => {
    const { result } = renderSetup();

    await submitWifi(result);

    expect(result.current.errorCode).toBe('connection_failed');
  });

  it('reset goes back to idle and frees the board', async () => {
    const { result } = renderSetup();
    await scanAndFind(result);
    await selectBoard(result);

    await act(async () => {
      await result.current.reset();
    });

    expect(result.current.step).toBe('idle');
    expect(result.current.selectedBoard).toBeNull();
    expect(fake.manager.cancelDeviceConnection).toHaveBeenCalledWith(BOARD.id);
  });

  it('stops the scan and frees the board when the screen closes', async () => {
    const { result, unmount } = renderSetup();
    await scanAndFind(result);
    await selectBoard(result);
    fake.manager.stopDeviceScan.mockClear();

    unmount();

    expect(fake.manager.stopDeviceScan).toHaveBeenCalled();
    expect(fake.manager.cancelDeviceConnection).toHaveBeenCalledWith(BOARD.id);
  });
});
