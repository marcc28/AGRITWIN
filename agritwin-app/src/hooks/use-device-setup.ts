// Single connection point between the "Add device" screens and the Bluetooth
// logic.
//
// TEMPORARY: until the Bluetooth branch (160) is in `dev`, this file contains a
// simulated board so the whole flow can be tried without hardware. It never
// touches Bluetooth, the backend or the database.
//
// When the Bluetooth branch is merged:
//   1. Replace this whole file with
//        export { useBleProvisioning as useDeviceSetup } from './use-ble-provisioning';
//   2. Replace `src/types/device-setup.ts` with `export type { ... } from` the
//      types of `bleProvisioning.ts` and `use-ble-provisioning.ts`.
//   3. Delete `__tests__/unit/hooks/use-device-setup.test.ts`.
//
// Magic Wi-Fi names to see the error screens in the simulation:
//   "wifi-not-found", "wrong-password", "wifi-timeout", "no-internet",
//   "already-registered", "save-failed".
// Any other name ends in success.

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  BleBoard,
  DeviceSetup,
  DeviceSetupState,
  ProvisioningErrorCode,
} from '@/types/device-setup';

export const SIMULATED_BOARD: BleBoard = {
  id: 'simulated-board',
  name: 'AgriTwin-SIM1',
};

export const SIMULATED_ERRORS = new Map<string, ProvisioningErrorCode>([
  ['wifi-not-found', 'wifi_not_found'],
  ['wrong-password', 'wrong_password'],
  ['wifi-timeout', 'wifi_timeout'],
  ['no-internet', 'no_internet'],
  ['already-registered', 'already_registered_elsewhere'],
  ['save-failed', 'registration_failed'],
]);

export const SIMULATED_SCAN_MS = 1500;
export const SIMULATED_CONNECT_MS = 800;
export const SIMULATED_WIFI_MS = 2500;
export const SIMULATED_SAVE_MS = 800;

const INITIAL_STATE: DeviceSetupState = {
  step: 'idle',
  boards: [],
  selectedBoard: null,
  boardInfo: null,
  boardStatus: null,
  registration: null,
  errorCode: null,
  errorMessageKey: null,
};

type FailedStage = 'scan' | 'wifi' | 'register';

export function useDeviceSetup(fieldId: number): DeviceSetup {
  const [state, setState] = useState<DeviceSetupState>(INITIAL_STATE);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const failedStage = useRef<FailedStage | null>(null);

  const later = useCallback((callback: () => void, ms: number) => {
    timers.current.push(setTimeout(callback, ms));
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const update = useCallback((patch: Partial<DeviceSetupState>) => {
    setState((current) => ({ ...current, ...patch }));
  }, []);

  const fail = useCallback(
    (stage: FailedStage, code: ProvisioningErrorCode) => {
      failedStage.current = stage;
      update({
        step: 'error',
        errorCode: code,
        errorMessageKey: `deviceSetup.errors.${code}`,
      });
    },
    [update],
  );

  const startScan = useCallback(async () => {
    clearTimers();
    update({ ...INITIAL_STATE, step: 'scanning' });
    later(() => {
      update({ step: 'boardList', boards: [SIMULATED_BOARD] });
    }, SIMULATED_SCAN_MS);
  }, [clearTimers, later, update]);

  const selectBoard = useCallback(
    async (board: BleBoard) => {
      clearTimers();
      update({ step: 'connecting', selectedBoard: board });
      later(() => {
        update({
          step: 'wifiForm',
          boardInfo: {
            deviceId: `esp32_SIM_${fieldId}`,
            serialNumber: 'SIM-0001',
            firmwareVersion: '0.0.0',
            model: 'AgriTwin Soil Node',
          },
        });
      }, SIMULATED_CONNECT_MS);
    },
    [clearTimers, fieldId, later, update],
  );

  // The simulation does not use the password: it is never stored or sent.
  const submitWifi = useCallback(
    async (ssid: string) => {
      clearTimers();
      update({ step: 'provisioning', boardStatus: 'connecting' });
      later(() => {
        const code = SIMULATED_ERRORS.get(ssid.trim().toLowerCase());
        if (!code) {
          update({ step: 'registering' });
          later(
            () => update({ step: 'success', registration: 'created' }),
            SIMULATED_SAVE_MS,
          );
          return;
        }
        const stage: FailedStage =
          code === 'already_registered_elsewhere' ||
          code === 'registration_failed'
            ? 'register'
            : 'wifi';
        fail(stage, code);
      }, SIMULATED_WIFI_MS);
    },
    [clearTimers, fail, later, update],
  );

  const reset = useCallback(async () => {
    clearTimers();
    failedStage.current = null;
    setState(INITIAL_STATE);
  }, [clearTimers]);

  const retry = useCallback(async () => {
    if (failedStage.current === 'wifi') {
      update({
        step: 'wifiForm',
        errorCode: null,
        errorMessageKey: null,
        boardStatus: null,
      });
      return;
    }
    if (failedStage.current === 'register') {
      update({ step: 'registering', errorCode: null, errorMessageKey: null });
      later(
        () => update({ step: 'success', registration: 'created' }),
        SIMULATED_SAVE_MS,
      );
      return;
    }
    await startScan();
  }, [later, startScan, update]);

  return { ...state, startScan, selectBoard, submitWifi, retry, reset };
}
