import React from 'react';

import {
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
});
