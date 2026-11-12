// State machine of the "Add device" flow, ready to be plugged into the UI.
//
// The screens only read `step` (and the data next to it) and call the
// actions; all the Bluetooth and backend work happens here.
//
//   idle ─startScan→ scanning ─┬→ boardList ─selectBoard→ connecting → wifiForm
//                              └→ noBoards                                │
//                                                              submitWifi │
//   success ← registering ← provisioning ←───────────────────────────────┘
//   any failure → error ─retry→ back to the step that failed

import { useCallback, useEffect, useRef, useState } from 'react';

import { getBleManager } from '@/services/bleManager';
import { requestBlePermissions } from '@/services/blePermissions';
import {
  connectToBoard,
  disconnectBoard,
  ensureBluetoothOn,
  provisioningErrorMessageKey,
  registerBoard,
  scanForBoards,
  sendWifiSettings,
  stopScan,
  toProvisioningError,
  type BleBoard,
  type BoardInfo,
  type BoardStatus,
  type ProvisioningErrorCode,
  type RegistrationResult,
} from '@/services/bleProvisioning';

export type DeviceSetupStep =
  /** Nothing started yet. */
  | 'idle'
  /** 1. Searching for boards; `boards` fills up live. */
  | 'scanning'
  /** 2. Boards found, the user taps one. */
  | 'boardList'
  /** 3. No board found. */
  | 'noBoards'
  /** Connecting to the chosen board (short loading). */
  | 'connecting'
  /** 4. Wi-Fi name + password form. */
  | 'wifiForm'
  /** 5. The board is testing the Wi-Fi (up to ~25 s). */
  | 'provisioning'
  /** 5. Saving the board in the backend. */
  | 'registering'
  /** 6. Board connected and linked to the field. */
  | 'success'
  /** 7. Something failed, see `errorCode`. */
  | 'error';

/** Part of the flow that failed: decides what retry() does. */
type FailedStage = 'scan' | 'connect' | 'wifi' | 'register';

export type DeviceSetupState = {
  step: DeviceSetupStep;
  /** Boards found during the scan. */
  boards: BleBoard[];
  /** Board chosen by the user. */
  selectedBoard: BleBoard | null;
  /** Identity read from the chosen board. */
  boardInfo: BoardInfo | null;
  /** Last status sent by the board, e.g. "connecting". */
  boardStatus: BoardStatus | null;
  /** Result of the backend registration, set on success. */
  registration: RegistrationResult | null;
  errorCode: ProvisioningErrorCode | null;
  /** i18n key of the error message, e.g. "deviceSetup.errors.wrong_password". */
  errorMessageKey: string | null;
};

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

const CLEAR_ERROR = { errorCode: null, errorMessageKey: null } as const;

export function useBleProvisioning(fieldId: number) {
  const [state, setState] = useState<DeviceSetupState>(INITIAL_STATE);

  const mounted = useRef(true);
  const failedStage = useRef<FailedStage | null>(null);
  const boardRef = useRef<BleBoard | null>(null);
  const infoRef = useRef<BoardInfo | null>(null);
  const finished = useRef(false);
  // Id of the scan whose results may still change the screen. The user can
  // tap a board before the scan ends: the scan keeps running until its
  // timeout, and its late result must not bring back the board list.
  const activeScan = useRef(0);

  const update = useCallback((patch: Partial<DeviceSetupState>) => {
    if (mounted.current) {
      setState((current) => ({ ...current, ...patch }));
    }
  }, []);

  const fail = useCallback(
    (stage: FailedStage, error: unknown) => {
      const code = toProvisioningError(error, 'unknown').code;
      failedStage.current = stage;
      update({
        step: 'error',
        errorCode: code,
        errorMessageKey: provisioningErrorMessageKey(code),
      });
    },
    [update],
  );

  /** Screen 1: asks permissions, checks Bluetooth and searches for boards. */
  const startScan = useCallback(async () => {
    const manager = getBleManager();
    activeScan.current += 1;
    const scanId = activeScan.current;
    const isCurrentScan = () => scanId === activeScan.current;
    update({
      ...CLEAR_ERROR,
      step: 'scanning',
      boards: [],
      selectedBoard: null,
      boardInfo: null,
      boardStatus: null,
      registration: null,
    });
    try {
      if (!(await requestBlePermissions())) {
        if (isCurrentScan()) {
          fail('scan', toProvisioningError(null, 'permission_denied'));
        }
        return;
      }
      await ensureBluetoothOn(manager);
      const boards = await scanForBoards(manager, {
        onBoardFound: (board) => {
          if (mounted.current && isCurrentScan()) {
            setState((current) => ({
              ...current,
              boards: [
                ...current.boards.filter((known) => known.id !== board.id),
                board,
              ],
            }));
          }
        },
      });
      if (!isCurrentScan()) {
        return;
      }
      update({ step: boards.length > 0 ? 'boardList' : 'noBoards', boards });
    } catch (error) {
      if (isCurrentScan()) {
        fail('scan', error);
      }
    }
  }, [fail, update]);

  /** Screen 2: connects to the board tapped by the user. */
  const selectBoard = useCallback(
    async (board: BleBoard) => {
      const manager = getBleManager();
      // The scan is over for the user: ignore whatever it reports later.
      activeScan.current += 1;
      await stopScan(manager);
      boardRef.current = board;
      update({ ...CLEAR_ERROR, step: 'connecting', selectedBoard: board });
      try {
        const info = await connectToBoard(manager, board.id);
        infoRef.current = info;
        update({ step: 'wifiForm', boardInfo: info });
      } catch (error) {
        fail('connect', error);
      }
    },
    [fail, update],
  );

  /** Saves the board in the backend (also used to retry only this part). */
  const register = useCallback(async () => {
    const info = infoRef.current;
    if (!info) {
      fail('scan', toProvisioningError(null, 'connection_failed'));
      return;
    }
    update({ ...CLEAR_ERROR, step: 'registering' });
    try {
      const registration = await registerBoard(fieldId, info);
      finished.current = true;
      update({ step: 'success', registration });
    } catch (error) {
      fail('register', error);
    }
  }, [fail, fieldId, update]);

  /** Screen 4 → 5: the `onConnect(ssid, password)` of the Wi-Fi form. */
  const submitWifi = useCallback(
    async (ssid: string, password: string) => {
      const board = boardRef.current;
      const manager = getBleManager();
      update({ ...CLEAR_ERROR, step: 'provisioning', boardStatus: null });
      try {
        if (!board) {
          throw toProvisioningError(null, 'connection_failed');
        }
        // After a timeout or a lost link the board may be disconnected.
        if (!(await manager.isDeviceConnected(board.id))) {
          infoRef.current = await connectToBoard(manager, board.id);
        }
        await sendWifiSettings(
          manager,
          board.id,
          { ssid, password, fieldId },
          { onStatus: (status) => update({ boardStatus: status }) },
        );
      } catch (error) {
        fail('wifi', error);
        return;
      }
      // The board saves the settings and reboots: close our side too.
      await disconnectBoard(manager, board.id);
      await register();
    },
    [fail, fieldId, register, update],
  );

  /** Screen 7: "Retry" goes back to the part that failed. */
  const retry = useCallback(async () => {
    switch (failedStage.current) {
      case 'wifi':
        update({ ...CLEAR_ERROR, step: 'wifiForm', boardStatus: null });
        return;
      case 'register':
        await register();
        return;
      default:
        await startScan();
    }
  }, [register, startScan, update]);

  /** Starts again from scratch (e.g. "Add another device"). */
  const reset = useCallback(async () => {
    const manager = getBleManager();
    activeScan.current += 1;
    await stopScan(manager);
    if (boardRef.current) {
      await disconnectBoard(manager, boardRef.current.id);
    }
    boardRef.current = null;
    infoRef.current = null;
    failedStage.current = null;
    finished.current = false;
    update(INITIAL_STATE);
  }, [update]);

  // Leaving the screen stops the scan and frees the board.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const manager = getBleManager();
      void stopScan(manager);
      if (boardRef.current && !finished.current) {
        void disconnectBoard(manager, boardRef.current.id);
      }
    };
  }, []);

  return { ...state, startScan, selectBoard, submitWifi, retry, reset };
}
