// Contract of the "Add device" flow.
//
// These types copy the ones of the Bluetooth logic (branch
// 160-back-register-the-device-in-the-field: `bleProvisioning.ts` and
// `use-ble-provisioning.ts`). The screens only depend on this file, so they
// work before that branch is in `dev`.
//
// When the Bluetooth branch is merged, replace the content of this file with
// `export type { ... } from` those two modules (see `use-device-setup.ts`).

/** A board found during the scan, shown in the list. */
export type BleBoard = {
  /** Bluetooth id used to connect (MAC on Android, UUID on iOS). */
  id: string;
  /** Name shown to the user, e.g. "AgriTwin-E5F6". */
  name: string;
};

/** Identity read from the board. */
export type BoardInfo = {
  deviceId: string;
  serialNumber: string;
  firmwareVersion: string;
  model: string;
};

/** Last status sent by the board, e.g. "connecting". */
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

export type DeviceSetupStep =
  /** Nothing started yet. */
  | 'idle'
  /** Searching for boards; `boards` fills up live. */
  | 'scanning'
  /** Boards found, the user taps one. */
  | 'boardList'
  /** No board found. */
  | 'noBoards'
  /** Connecting to the chosen board (short loading). */
  | 'connecting'
  /** Wi-Fi name + password form. */
  | 'wifiForm'
  /** The board is testing the Wi-Fi (up to ~25 s). */
  | 'provisioning'
  /** Saving the board in the backend. */
  | 'registering'
  /** Board connected and linked to the field. */
  | 'success'
  /** Something failed, see `errorCode`. */
  | 'error';

export type DeviceSetupState = {
  step: DeviceSetupStep;
  boards: BleBoard[];
  selectedBoard: BleBoard | null;
  boardInfo: BoardInfo | null;
  boardStatus: BoardStatus | null;
  registration: RegistrationResult | null;
  errorCode: ProvisioningErrorCode | null;
  /** i18n key of the message of the Bluetooth branch (not used by the UI). */
  errorMessageKey: string | null;
};

export type DeviceSetupActions = {
  /** Asks permissions, checks Bluetooth and searches for boards. */
  startScan: () => Promise<void>;
  /** Connects to the board tapped by the user. */
  selectBoard: (board: BleBoard) => Promise<void>;
  /** The `onConnect(name, password)` of the Wi-Fi form. */
  submitWifi: (ssid: string, password: string) => Promise<void>;
  /** Goes back to the part that failed. */
  retry: () => Promise<void>;
  /** Starts again from scratch. */
  reset: () => Promise<void>;
};

export type DeviceSetup = DeviceSetupState & DeviceSetupActions;
