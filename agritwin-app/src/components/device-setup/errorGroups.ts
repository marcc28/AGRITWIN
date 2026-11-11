import type { ProvisioningErrorCode } from '@/types/device-setup';

/** Each group has its own message in `addDevice.error.groups.<group>`. */
export type ErrorGroup =
  | 'wifi'
  | 'timeout'
  | 'noInternet'
  | 'bluetoothOff'
  | 'permission'
  | 'link'
  | 'alreadyRegistered'
  | 'sessionExpired'
  | 'saveFailed'
  | 'generic';

// A Record makes TypeScript fail if the Bluetooth branch adds a new error
// code and nobody decides which message it shows.
const GROUP_BY_CODE: Record<ProvisioningErrorCode, ErrorGroup> = {
  wifi_not_found: 'wifi',
  wrong_password: 'wifi',
  wifi_timeout: 'timeout',
  no_answer: 'timeout',
  no_internet: 'noInternet',
  bluetooth_off: 'bluetoothOff',
  permission_denied: 'permission',
  scan_failed: 'link',
  connection_failed: 'link',
  connection_lost: 'link',
  already_registered_elsewhere: 'alreadyRegistered',
  session_expired: 'sessionExpired',
  registration_failed: 'saveFailed',
  invalid_input: 'generic',
  missing_data: 'generic',
  bad_field_id: 'generic',
  unknown: 'generic',
};

export function errorGroup(code: ProvisioningErrorCode | null): ErrorGroup {
  return code ? GROUP_BY_CODE[code] : 'generic';
}

/** Errors the user fixes in the system settings of the phone. */
export function needsSettings(group: ErrorGroup): boolean {
  return group === 'permission';
}
