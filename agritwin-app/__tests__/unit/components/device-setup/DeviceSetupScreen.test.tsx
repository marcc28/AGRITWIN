import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { DeviceSetupScreen } from '@/components/device-setup/DeviceSetupScreen';
import type {
  DeviceSetup,
  DeviceSetupState,
  ProvisioningErrorCode,
} from '@/types/device-setup';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) =>
      options?.name ? `${key}:${options.name}` : key,
  }),
}));

const board = { id: 'ble-1', name: 'AgriTwin-AB12' };

function makeSetup(patch: Partial<DeviceSetupState> = {}): DeviceSetup {
  return {
    step: 'idle',
    boards: [],
    selectedBoard: null,
    boardInfo: null,
    boardStatus: null,
    registration: null,
    errorCode: null,
    errorMessageKey: null,
    startScan: jest.fn(async () => undefined),
    selectBoard: jest.fn(),
    submitWifi: jest.fn(),
    retry: jest.fn(),
    reset: jest.fn(),
    ...patch,
  } as DeviceSetup;
}

function renderScreen(setup: DeviceSetup) {
  const onClose = jest.fn();
  const onOpenSettings = jest.fn();
  render(
    <DeviceSetupScreen
      setup={setup}
      onClose={onClose}
      onOpenSettings={onOpenSettings}
    />,
  );
  return { onClose, onOpenSettings };
}

describe('DeviceSetupScreen', () => {
  describe('search', () => {
    it('shows the instructions and a loading state while searching', () => {
      renderScreen(makeSetup({ step: 'scanning' }));

      expect(screen.getByText('addDevice.scan.instructions')).toBeTruthy();
      expect(screen.getByTestId('device-setup-searching')).toBeTruthy();
      expect(screen.queryByText('addDevice.scan.searchAgain')).toBeNull();
    });

    it('treats idle as searching', () => {
      renderScreen(makeSetup({ step: 'idle' }));
      expect(screen.getByTestId('device-setup-searching')).toBeTruthy();
    });

    it('lists the boards found while it keeps searching', () => {
      const setup = makeSetup({ step: 'scanning', boards: [board] });
      renderScreen(setup);

      expect(screen.getByTestId('device-setup-searching')).toBeTruthy();
      fireEvent.press(screen.getByText('AgriTwin-AB12'));
      expect(setup.selectBoard).toHaveBeenCalledWith(board);
    });

    it('selects a board and can search again', () => {
      const setup = makeSetup({ step: 'boardList', boards: [board] });
      renderScreen(setup);

      expect(screen.queryByTestId('device-setup-searching')).toBeNull();
      fireEvent.press(screen.getByText('AgriTwin-AB12'));
      expect(setup.selectBoard).toHaveBeenCalledWith(board);

      fireEvent.press(screen.getByText('addDevice.scan.searchAgain'));
      expect(setup.startScan).toHaveBeenCalled();
    });

    it('shows the BOOT tip and retries when there are no boards', () => {
      const setup = makeSetup({ step: 'noBoards' });
      renderScreen(setup);

      expect(screen.getByText('addDevice.noBoards.tip')).toBeTruthy();
      fireEvent.press(screen.getByText('addDevice.noBoards.retry'));
      expect(setup.startScan).toHaveBeenCalled();
    });
  });

  describe('Wi-Fi form', () => {
    function renderForm() {
      const setup = makeSetup({ step: 'wifiForm', selectedBoard: board });
      renderScreen(setup);
      return setup;
    }

    it('shows the board and warns about 2.4 GHz and privacy', () => {
      renderForm();

      expect(
        screen.getByText('addDevice.wifi.board:AgriTwin-AB12'),
      ).toBeTruthy();
      expect(screen.getByText('addDevice.wifi.hint24')).toBeTruthy();
      expect(screen.getByText('addDevice.wifi.privacy')).toBeTruthy();
    });

    it('does not let the user connect without a Wi-Fi name', () => {
      const setup = renderForm();

      fireEvent.press(screen.getByText('addDevice.wifi.connect'));
      expect(setup.submitWifi).not.toHaveBeenCalled();

      fireEvent.changeText(
        screen.getByPlaceholderText('addDevice.wifi.ssidPlaceholder'),
        '   ',
      );
      fireEvent.press(screen.getByText('addDevice.wifi.connect'));
      expect(setup.submitWifi).not.toHaveBeenCalled();
    });

    it('sends the trimmed name and the password as typed', () => {
      const setup = renderForm();

      fireEvent.changeText(
        screen.getByPlaceholderText('addDevice.wifi.ssidPlaceholder'),
        '  Casa  ',
      );
      fireEvent.changeText(
        screen.getByPlaceholderText('addDevice.wifi.passwordPlaceholder'),
        ' secreta ',
      );
      fireEvent.press(screen.getByText('addDevice.wifi.connect'));

      expect(setup.submitWifi).toHaveBeenCalledWith('Casa', ' secreta ');
    });

    it('shows and hides the password', () => {
      renderForm();
      const input = screen.getByPlaceholderText(
        'addDevice.wifi.passwordPlaceholder',
      );

      expect(input.props.secureTextEntry).toBe(true);
      fireEvent.press(screen.getByLabelText('addDevice.wifi.showPassword'));
      expect(
        screen.getByPlaceholderText('addDevice.wifi.passwordPlaceholder').props
          .secureTextEntry,
      ).toBe(false);
      fireEvent.press(screen.getByLabelText('addDevice.wifi.hidePassword'));
      expect(
        screen.getByPlaceholderText('addDevice.wifi.passwordPlaceholder').props
          .secureTextEntry,
      ).toBe(true);
    });

    it('keeps what was typed when the step changes and comes back', () => {
      const wifi = makeSetup({ step: 'wifiForm', selectedBoard: board });
      const { rerender } = render(
        <DeviceSetupScreen
          setup={wifi}
          onClose={jest.fn()}
          onOpenSettings={jest.fn()}
        />,
      );
      fireEvent.changeText(
        screen.getByPlaceholderText('addDevice.wifi.ssidPlaceholder'),
        'Casa',
      );
      fireEvent.changeText(
        screen.getByPlaceholderText('addDevice.wifi.passwordPlaceholder'),
        'secreta',
      );

      const failed = (code: ProvisioningErrorCode) =>
        makeSetup({ step: 'error', errorCode: code, selectedBoard: board });
      rerender(
        <DeviceSetupScreen
          setup={failed('wrong_password')}
          onClose={jest.fn()}
          onOpenSettings={jest.fn()}
        />,
      );
      rerender(
        <DeviceSetupScreen
          setup={wifi}
          onClose={jest.fn()}
          onOpenSettings={jest.fn()}
        />,
      );

      expect(screen.getByDisplayValue('Casa')).toBeTruthy();
      expect(screen.getByDisplayValue('secreta')).toBeTruthy();
    });

    it('clears the password once the board is connected', () => {
      const wifi = makeSetup({ step: 'wifiForm', selectedBoard: board });
      const { rerender } = render(
        <DeviceSetupScreen
          setup={wifi}
          onClose={jest.fn()}
          onOpenSettings={jest.fn()}
        />,
      );
      fireEvent.changeText(
        screen.getByPlaceholderText('addDevice.wifi.passwordPlaceholder'),
        'secreta',
      );
      rerender(
        <DeviceSetupScreen
          setup={makeSetup({ step: 'success', registration: 'created' })}
          onClose={jest.fn()}
          onOpenSettings={jest.fn()}
        />,
      );
      rerender(
        <DeviceSetupScreen
          setup={wifi}
          onClose={jest.fn()}
          onOpenSettings={jest.fn()}
        />,
      );

      expect(screen.queryByDisplayValue('secreta')).toBeNull();
    });
  });

  describe('progress', () => {
    it('shows the connection to the board', () => {
      renderScreen(makeSetup({ step: 'connecting' }));

      expect(screen.getByTestId('device-setup-progress')).toBeTruthy();
      expect(
        screen.getByText('addDevice.progress.connectingBoard'),
      ).toBeTruthy();
    });

    it('warns that connecting takes about 20 seconds', () => {
      renderScreen(makeSetup({ step: 'provisioning' }));

      expect(screen.getByText('addDevice.progress.connecting')).toBeTruthy();
      expect(
        screen.getByText('addDevice.progress.connectingHint'),
      ).toBeTruthy();
    });

    it('shows that the board is being saved', () => {
      renderScreen(makeSetup({ step: 'registering' }));
      expect(screen.getByText('addDevice.progress.saving')).toBeTruthy();
    });

    it('does not let the user leave while connecting or saving', () => {
      for (const step of ['provisioning', 'registering'] as const) {
        const { onClose } = renderScreen(makeSetup({ step }));
        fireEvent.press(screen.getByText('addDevice.back'));
        expect(onClose).not.toHaveBeenCalled();
        screen.unmount();
      }
    });
  });

  describe('result', () => {
    it('shows the success and goes back to the field', () => {
      const { onClose } = renderScreen(
        makeSetup({ step: 'success', registration: 'created' }),
      );

      expect(screen.getByText('addDevice.success.title')).toBeTruthy();
      expect(screen.getByText('addDevice.success.hint')).toBeTruthy();
      fireEvent.press(screen.getByText('addDevice.success.done'));
      expect(onClose).toHaveBeenCalled();
    });

    it('tells when the board was already linked', () => {
      renderScreen(
        makeSetup({ step: 'success', registration: 'already_linked' }),
      );
      expect(screen.getByText('addDevice.success.alreadyLinked')).toBeTruthy();
    });

    it('shows the Wi-Fi error and retries', () => {
      const setup = makeSetup({ step: 'error', errorCode: 'wifi_not_found' });
      renderScreen(setup);

      expect(
        screen.getByText('addDevice.error.groups.wifi.title'),
      ).toBeTruthy();
      expect(screen.getByText('addDevice.error.groups.wifi.hint')).toBeTruthy();
      expect(screen.queryByText('addDevice.error.openSettings')).toBeNull();
      fireEvent.press(screen.getByText('addDevice.error.retry'));
      expect(setup.retry).toHaveBeenCalled();
    });

    it('leaves the flow from an error', () => {
      const { onClose } = renderScreen(
        makeSetup({ step: 'error', errorCode: 'wifi_timeout' }),
      );

      expect(
        screen.getByText('addDevice.error.groups.timeout.title'),
      ).toBeTruthy();
      fireEvent.press(screen.getByText('addDevice.error.back'));
      expect(onClose).toHaveBeenCalled();
    });

    it('opens the settings when the Bluetooth permission is missing', () => {
      const { onOpenSettings } = renderScreen(
        makeSetup({ step: 'error', errorCode: 'permission_denied' }),
      );

      fireEvent.press(screen.getByText('addDevice.error.openSettings'));
      expect(onOpenSettings).toHaveBeenCalled();
    });

    it('uses the generic message without an error code', () => {
      renderScreen(makeSetup({ step: 'error', errorCode: null }));
      expect(
        screen.getByText('addDevice.error.groups.generic.title'),
      ).toBeTruthy();
    });
  });

  it('goes back to the field from the back row', () => {
    const { onClose } = renderScreen(makeSetup({ step: 'boardList' }));

    fireEvent.press(screen.getByText('addDevice.back'));
    expect(onClose).toHaveBeenCalled();
  });
});
