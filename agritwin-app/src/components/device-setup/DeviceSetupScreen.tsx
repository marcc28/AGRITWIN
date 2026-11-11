import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { DeviceSetup } from '@/types/device-setup';

import { NoBoardsStep, ScanStep } from './ScanSteps';
import { ErrorStep, SuccessStep } from './ResultSteps';
import { SetupLayout } from './SetupLayout';
import { ProgressStep, WifiFormStep } from './WifiSteps';

type Props = Readonly<{
  /** State and actions of the flow (see `use-device-setup.ts`). */
  setup: DeviceSetup;
  /** Back to the field screen. */
  onClose: () => void;
  /** Opens the system settings of the app (Bluetooth permission). */
  onOpenSettings: () => void;
}>;

/**
 * "Add device" screens. It only draws the current step: all the Bluetooth and
 * backend work is behind `setup`.
 */
export function DeviceSetupScreen({ setup, onClose, onOpenSettings }: Props) {
  const { t } = useTranslation();
  // The Wi-Fi data lives here, not in the form, so it is still there when the
  // user comes back to the form after an error. It is never saved.
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (setup.step === 'success') {
      setPassword('');
    }
  }, [setup.step]);

  const busy = setup.step === 'provisioning' || setup.step === 'registering';

  function renderStep() {
    switch (setup.step) {
      case 'noBoards':
        return <NoBoardsStep onRetry={() => void setup.startScan()} />;
      case 'connecting':
        return <ProgressStep title={t('addDevice.progress.connectingBoard')} />;
      case 'wifiForm':
        return (
          <WifiFormStep
            boardName={setup.selectedBoard?.name ?? ''}
            ssid={ssid}
            password={password}
            onSsidChange={setSsid}
            onPasswordChange={setPassword}
            onConnect={() => void setup.submitWifi(ssid.trim(), password)}
          />
        );
      case 'provisioning':
        return (
          <ProgressStep
            title={t('addDevice.progress.connecting')}
            hint={t('addDevice.progress.connectingHint')}
          />
        );
      case 'registering':
        return <ProgressStep title={t('addDevice.progress.saving')} />;
      case 'success':
        return (
          <SuccessStep
            alreadyLinked={setup.registration === 'already_linked'}
            onDone={onClose}
          />
        );
      case 'error':
        return (
          <ErrorStep
            code={setup.errorCode}
            onRetry={() => void setup.retry()}
            onClose={onClose}
            onOpenSettings={onOpenSettings}
          />
        );
      default:
        // idle, scanning and boardList: the search screen. The boards found
        // are listed while it is still searching.
        return (
          <ScanStep
            boards={setup.boards}
            searching={setup.step !== 'boardList'}
            onSelect={(board) => void setup.selectBoard(board)}
            onSearchAgain={() => void setup.startScan()}
          />
        );
    }
  }

  return (
    <SetupLayout onBack={onClose} backDisabled={busy}>
      {renderStep()}
    </SetupLayout>
  );
}
