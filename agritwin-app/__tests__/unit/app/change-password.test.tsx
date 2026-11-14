import React from 'react';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';

import ChangePasswordScreen from '../../../src/app/change-password';
import { updateMyPassword } from '../../../src/services/api';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock('../../../src/services/api', () => ({
  updateMyPassword: jest.fn(),
}));

const mockedUpdateMyPassword = updateMyPassword as jest.MockedFunction<
  typeof updateMyPassword
>;

function fillValidPasswords() {
  fireEvent.changeText(
    screen.getByPlaceholderText('settings.passwordScreen.currentPlaceholder'),
    'OldPass12',
  );
  fireEvent.changeText(
    screen.getByPlaceholderText('settings.passwordScreen.newPlaceholder'),
    'NewPass12',
  );
  fireEvent.changeText(
    screen.getByPlaceholderText('settings.passwordScreen.confirmPlaceholder'),
    'NewPass12',
  );
}

describe('ChangePasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asks for the current password', () => {
    render(<ChangePasswordScreen />);
    fireEvent.press(screen.getByText('settings.passwordScreen.save'));
    expect(
      screen.getByText('settings.passwordScreen.errors.currentRequired'),
    ).toBeTruthy();
  });

  it('asks for the new password', () => {
    render(<ChangePasswordScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.passwordScreen.currentPlaceholder'),
      'OldPass12',
    );
    fireEvent.press(screen.getByText('settings.passwordScreen.save'));
    expect(
      screen.getByText('settings.passwordScreen.errors.newRequired'),
    ).toBeTruthy();
  });

  it('asks to confirm the new password', () => {
    render(<ChangePasswordScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.passwordScreen.currentPlaceholder'),
      'OldPass12',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.passwordScreen.newPlaceholder'),
      'NewPass12',
    );
    fireEvent.press(screen.getByText('settings.passwordScreen.save'));
    expect(
      screen.getByText('settings.passwordScreen.errors.confirmRequired'),
    ).toBeTruthy();
  });

  it('rejects a short password', () => {
    render(<ChangePasswordScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.passwordScreen.currentPlaceholder'),
      'OldPass12',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.passwordScreen.newPlaceholder'),
      'short',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.passwordScreen.confirmPlaceholder'),
      'short',
    );
    fireEvent.press(screen.getByText('settings.passwordScreen.save'));
    expect(
      screen.getByText('settings.passwordScreen.errors.tooShort'),
    ).toBeTruthy();
  });

  it('rejects a mismatch', () => {
    render(<ChangePasswordScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.passwordScreen.currentPlaceholder'),
      'OldPass12',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.passwordScreen.newPlaceholder'),
      'NewPass12',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.passwordScreen.confirmPlaceholder'),
      'OtherPass',
    );
    fireEvent.press(screen.getByText('settings.passwordScreen.save'));
    expect(
      screen.getByText('settings.passwordScreen.errors.mismatch'),
    ).toBeTruthy();
  });

  it('rejects the same password', () => {
    render(<ChangePasswordScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.passwordScreen.currentPlaceholder'),
      'SamePass1',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.passwordScreen.newPlaceholder'),
      'SamePass1',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.passwordScreen.confirmPlaceholder'),
      'SamePass1',
    );
    fireEvent.press(screen.getByText('settings.passwordScreen.save'));
    expect(
      screen.getByText('settings.passwordScreen.errors.sameAsCurrent'),
    ).toBeTruthy();
  });

  it('saves and goes back to profile', async () => {
    mockedUpdateMyPassword.mockResolvedValue();
    render(<ChangePasswordScreen />);
    fillValidPasswords();
    fireEvent.press(screen.getByText('settings.passwordScreen.save'));

    await waitFor(() => {
      expect(mockedUpdateMyPassword).toHaveBeenCalledWith(
        'OldPass12',
        'NewPass12',
        'NewPass12',
      );
      expect(
        screen.getByText('settings.passwordScreen.successTitle'),
      ).toBeTruthy();
    });
    fireEvent.press(screen.getByText('settings.passwordScreen.backToAccount'));
    expect(router.replace).toHaveBeenCalledWith('/app/settings');
  });

  it('maps api errors', async () => {
    mockedUpdateMyPassword.mockRejectedValue(
      new Error('Incorrect current password'),
    );
    render(<ChangePasswordScreen />);
    fillValidPasswords();
    fireEvent.press(screen.getByText('settings.passwordScreen.save'));

    await waitFor(() => {
      expect(
        screen.getByText('settings.passwordScreen.errors.incorrectCurrent'),
      ).toBeTruthy();
    });
  });

  it('goes back from cancel', () => {
    render(<ChangePasswordScreen />);
    fireEvent.press(screen.getByText('settings.passwordScreen.cancel'));
    expect(router.replace).toHaveBeenCalledWith('/app/settings');
  });

  // --------------------------------------------------
  // MAPATGE D'ERRORS DE L'API
  // --------------------------------------------------

  it.each([
    ['Passwords do not match', 'settings.passwordScreen.errors.mismatch'],
    [
      'Password must be at least 8 characters',
      'settings.passwordScreen.errors.tooShort',
    ],
    ['Not authenticated', 'settings.passwordScreen.errors.unauthenticated'],
    [
      'Could not validate credentials',
      'settings.passwordScreen.errors.unauthenticated',
    ],
  ])('maps API error: %s', async (apiError, expectedMessage) => {
    mockedUpdateMyPassword.mockRejectedValueOnce(new Error(apiError));

    render(<ChangePasswordScreen />);
    fillValidPasswords();

    fireEvent.press(screen.getByText('settings.passwordScreen.save'));

    await waitFor(() => {
      expect(screen.getByText(expectedMessage)).toBeTruthy();
    });
  });

  it('shows an unknown API error message directly', async () => {
    mockedUpdateMyPassword.mockRejectedValueOnce(
      new Error('Unexpected server error'),
    );

    render(<ChangePasswordScreen />);
    fillValidPasswords();

    fireEvent.press(screen.getByText('settings.passwordScreen.save'));

    await waitFor(() => {
      expect(screen.getByText('Unexpected server error')).toBeTruthy();
    });
  });

  it('shows the default error when the API error message is empty', async () => {
    mockedUpdateMyPassword.mockRejectedValueOnce(new Error(''));

    render(<ChangePasswordScreen />);
    fillValidPasswords();

    fireEvent.press(screen.getByText('settings.passwordScreen.save'));

    await waitFor(() => {
      expect(
        screen.getByText('settings.passwordScreen.errors.saveFailed'),
      ).toBeTruthy();
    });
  });

  it('shows the default error when the API rejects with a non-Error value', async () => {
    mockedUpdateMyPassword.mockRejectedValueOnce('unexpected failure');

    render(<ChangePasswordScreen />);
    fillValidPasswords();

    fireEvent.press(screen.getByText('settings.passwordScreen.save'));

    await waitFor(() => {
      expect(
        screen.getByText('settings.passwordScreen.errors.saveFailed'),
      ).toBeTruthy();
    });
  });

  // --------------------------------------------------
  // VISIBILITAT DELS CAMPS
  // --------------------------------------------------
  it.each([
    ['current-password-toggle', 'currentPlaceholder'],
    ['new-password-toggle', 'newPlaceholder'],
    ['confirm-password-toggle', 'confirmPlaceholder'],
  ])('toggles password visibility for %s', (toggleId, placeholder) => {
    render(<ChangePasswordScreen />);

    const input = screen.getByPlaceholderText(
      `settings.passwordScreen.${placeholder}`,
    );

    expect(input.props.secureTextEntry).toBe(true);

    fireEvent.press(screen.getByTestId(toggleId));

    expect(input.props.secureTextEntry).toBe(false);

    fireEvent.press(screen.getByTestId(toggleId));

    expect(input.props.secureTextEntry).toBe(true);
  });

  // --------------------------------------------------
  // ESTAT DE CÀRREGA
  // --------------------------------------------------

  it('shows saving state and disables the form while the request is pending', async () => {
    let resolveUpdate!: () => void;

    mockedUpdateMyPassword.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    render(<ChangePasswordScreen />);
    fillValidPasswords();

    fireEvent.press(screen.getByText('settings.passwordScreen.save'));

    await waitFor(() => {
      expect(screen.getByText('settings.passwordScreen.saving')).toBeTruthy();
    });

    const currentInput = screen.getByPlaceholderText(
      'settings.passwordScreen.currentPlaceholder',
    );

    const newInput = screen.getByPlaceholderText(
      'settings.passwordScreen.newPlaceholder',
    );

    const confirmInput = screen.getByPlaceholderText(
      'settings.passwordScreen.confirmPlaceholder',
    );

    expect(currentInput.props.editable).toBe(false);
    expect(newInput.props.editable).toBe(false);
    expect(confirmInput.props.editable).toBe(false);
    const saveButton = screen.getByTestId('change-password-save-button');

    expect(saveButton.props.accessibilityState?.disabled).toBe(true);

    // No s'ha de fer una segona petició mentre la primera està pendent.
    fireEvent.press(screen.getByText('settings.passwordScreen.saving'));

    expect(mockedUpdateMyPassword).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate();
    });

    await waitFor(() => {
      expect(
        screen.getByText('settings.passwordScreen.successTitle'),
      ).toBeTruthy();
    });
  });

  it('clears the previous error when a new save attempt starts', async () => {
    mockedUpdateMyPassword
      .mockRejectedValueOnce(new Error('Incorrect current password'))
      .mockResolvedValueOnce();

    render(<ChangePasswordScreen />);
    fillValidPasswords();

    fireEvent.press(screen.getByText('settings.passwordScreen.save'));

    await waitFor(() => {
      expect(
        screen.getByText('settings.passwordScreen.errors.incorrectCurrent'),
      ).toBeTruthy();
    });

    fireEvent.press(screen.getByText('settings.passwordScreen.save'));

    await waitFor(() => {
      expect(
        screen.getByText('settings.passwordScreen.successTitle'),
      ).toBeTruthy();
    });

    expect(
      screen.queryByText('settings.passwordScreen.errors.incorrectCurrent'),
    ).toBeNull();

    expect(mockedUpdateMyPassword).toHaveBeenCalledTimes(2);
  });

  // --------------------------------------------------
  // NAVEGACIÓ I PANTALLA D'ÈXIT
  // --------------------------------------------------

  it('navigates back using the header back button', () => {
    render(<ChangePasswordScreen />);

    fireEvent.press(screen.getByText('settings.passwordScreen.back'));

    expect(router.replace).toHaveBeenCalledWith('/app/settings');
  });

  it('does not display the form after a successful password change', async () => {
    mockedUpdateMyPassword.mockResolvedValue();

    render(<ChangePasswordScreen />);
    fillValidPasswords();

    fireEvent.press(screen.getByText('settings.passwordScreen.save'));

    await waitFor(() => {
      expect(
        screen.getByText('settings.passwordScreen.successTitle'),
      ).toBeTruthy();
    });

    expect(screen.queryByText('settings.passwordScreen.save')).toBeNull();

    expect(screen.queryByText('settings.passwordScreen.cancel')).toBeNull();

    expect(
      screen.getByText('settings.passwordScreen.backToAccount'),
    ).toBeTruthy();
  });
});
