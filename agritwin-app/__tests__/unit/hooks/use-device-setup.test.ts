import { act, renderHook } from '@testing-library/react-native';

import {
  SIMULATED_BOARD,
  SIMULATED_CONNECT_MS,
  SIMULATED_SAVE_MS,
  SIMULATED_SCAN_MS,
  SIMULATED_WIFI_MS,
  useDeviceSetup,
} from '@/hooks/use-device-setup';

// Tests of the TEMPORARY simulated flow. Delete this file when the real
// Bluetooth hook replaces `use-device-setup.ts`.

function setup() {
  return renderHook(() => useDeviceSetup(7));
}

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

async function reachWifiForm(hook: ReturnType<typeof setup>) {
  await act(async () => {
    await hook.result.current.startScan();
  });
  advance(SIMULATED_SCAN_MS);
  await act(async () => {
    await hook.result.current.selectBoard(SIMULATED_BOARD);
  });
  advance(SIMULATED_CONNECT_MS);
}

async function submit(hook: ReturnType<typeof setup>, ssid: string) {
  await act(async () => {
    await hook.result.current.submitWifi(ssid, 'secret');
  });
}

describe('useDeviceSetup (simulation)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts idle without boards', () => {
    const hook = setup();

    expect(hook.result.current.step).toBe('idle');
    expect(hook.result.current.boards).toEqual([]);
  });

  it('searches and then lists the simulated board', async () => {
    const hook = setup();

    await act(async () => {
      await hook.result.current.startScan();
    });
    expect(hook.result.current.step).toBe('scanning');

    advance(SIMULATED_SCAN_MS);
    expect(hook.result.current.step).toBe('boardList');
    expect(hook.result.current.boards).toEqual([SIMULATED_BOARD]);
  });

  it('reads the board data after selecting it', async () => {
    const hook = setup();
    await reachWifiForm(hook);

    expect(hook.result.current.step).toBe('wifiForm');
    expect(hook.result.current.selectedBoard).toEqual(SIMULATED_BOARD);
    expect(hook.result.current.boardInfo).not.toBeNull();
  });

  it('connects, saves and succeeds with a normal Wi-Fi name', async () => {
    const hook = setup();
    await reachWifiForm(hook);

    await submit(hook, 'Casa');
    expect(hook.result.current.step).toBe('provisioning');
    expect(hook.result.current.boardStatus).toBe('connecting');

    advance(SIMULATED_WIFI_MS);
    expect(hook.result.current.step).toBe('registering');

    advance(SIMULATED_SAVE_MS);
    expect(hook.result.current.step).toBe('success');
    expect(hook.result.current.registration).toBe('created');
  });

  it('uses the field in the simulated board data', async () => {
    const hook = setup();
    await reachWifiForm(hook);

    expect(hook.result.current.boardInfo?.deviceId).toBe('esp32_SIM_7');
  });

  it('does not take inherited object names as magic Wi-Fi names', async () => {
    const hook = setup();
    await reachWifiForm(hook);

    await submit(hook, 'constructor');
    advance(SIMULATED_WIFI_MS + SIMULATED_SAVE_MS);

    expect(hook.result.current.step).toBe('success');
  });

  it.each([
    ['wifi-not-found', 'wifi_not_found'],
    ['wrong-password', 'wrong_password'],
    ['wifi-timeout', 'wifi_timeout'],
    ['no-internet', 'no_internet'],
    ['  WIFI-NOT-FOUND ', 'wifi_not_found'],
  ])('fails with the magic Wi-Fi name "%s"', async (ssid, code) => {
    const hook = setup();
    await reachWifiForm(hook);

    await submit(hook, ssid);
    advance(SIMULATED_WIFI_MS);

    expect(hook.result.current.step).toBe('error');
    expect(hook.result.current.errorCode).toBe(code);
    expect(hook.result.current.errorMessageKey).toBe(
      `deviceSetup.errors.${code}`,
    );
  });

  it('returns to the Wi-Fi form when retrying a Wi-Fi error', async () => {
    const hook = setup();
    await reachWifiForm(hook);
    await submit(hook, 'wrong-password');
    advance(SIMULATED_WIFI_MS);

    await act(async () => {
      await hook.result.current.retry();
    });

    expect(hook.result.current.step).toBe('wifiForm');
    expect(hook.result.current.errorCode).toBeNull();
    expect(hook.result.current.boardStatus).toBeNull();
  });

  it('retries only the saving when the board was connected', async () => {
    const hook = setup();
    await reachWifiForm(hook);
    await submit(hook, 'save-failed');
    advance(SIMULATED_WIFI_MS);
    expect(hook.result.current.errorCode).toBe('registration_failed');

    await act(async () => {
      await hook.result.current.retry();
    });
    expect(hook.result.current.step).toBe('registering');

    advance(SIMULATED_SAVE_MS);
    expect(hook.result.current.step).toBe('success');
  });

  it('reports a board linked to another field', async () => {
    const hook = setup();
    await reachWifiForm(hook);

    await submit(hook, 'already-registered');
    advance(SIMULATED_WIFI_MS);

    expect(hook.result.current.errorCode).toBe('already_registered_elsewhere');
  });

  it('searches again when retrying without a failed stage', async () => {
    const hook = setup();

    await act(async () => {
      await hook.result.current.retry();
    });

    expect(hook.result.current.step).toBe('scanning');
  });

  it('goes back to the start on reset and drops pending timers', async () => {
    const hook = setup();
    await act(async () => {
      await hook.result.current.startScan();
    });

    await act(async () => {
      await hook.result.current.reset();
    });
    advance(SIMULATED_SCAN_MS);

    expect(hook.result.current.step).toBe('idle');
    expect(hook.result.current.boards).toEqual([]);
  });

  it('restarts the search from scratch', async () => {
    const hook = setup();
    await reachWifiForm(hook);

    await act(async () => {
      await hook.result.current.startScan();
    });

    expect(hook.result.current.step).toBe('scanning');
    expect(hook.result.current.selectedBoard).toBeNull();
  });

  it('cancels the timers when the screen closes', async () => {
    const hook = setup();
    await act(async () => {
      await hook.result.current.startScan();
    });
    const clear = jest.spyOn(globalThis, 'clearTimeout');

    hook.unmount();

    expect(clear).toHaveBeenCalled();
    clear.mockRestore();
  });
});
