// Contract of the "Add device" flow: the types of the Bluetooth logic.
import type {
  DeviceSetupState,
  useBleProvisioning,
} from '@/hooks/use-ble-provisioning';

export type {
  BleBoard,
  BoardInfo,
  BoardStatus,
  ProvisioningErrorCode,
  RegistrationResult,
} from '@/services/bleProvisioning';
export type {
  DeviceSetupState,
  DeviceSetupStep,
} from '@/hooks/use-ble-provisioning';

/** State + actions returned by useBleProvisioning(). */
export type DeviceSetup = ReturnType<typeof useBleProvisioning>;
export type DeviceSetupActions = Omit<DeviceSetup, keyof DeviceSetupState>;
