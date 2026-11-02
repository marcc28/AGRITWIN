import React from 'react';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import AppHeader from '../../../src/components/AppHeader';
import { getFields, isAuthError } from '../../../src/services/api';
import { clearAuth, getAuth } from '../../../src/services/auth';
import {
  getCurrentField,
  setCurrentField,
  subscribeCurrentField,
} from '../../../src/services/currentField';
import {
  getGardenPicker,
  setGardenPicker,
  subscribeGardenPicker,
} from '../../../src/services/gardenPicker';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../../../src/services/api', () => ({
  getFields: jest.fn(),
  isAuthError: jest.fn(() => false),
}));

jest.mock('../../../src/services/auth', () => ({
  getAuth: jest.fn(),
  clearAuth: jest.fn(),
}));

jest.mock('../../../src/services/currentField', () => ({
  getCurrentField: jest.fn(),
  setCurrentField: jest.fn(),
  subscribeCurrentField: jest.fn(() => () => undefined),
}));

jest.mock('../../../src/services/gardenPicker', () => ({
  getGardenPicker: jest.fn(() => ({
    open: false,
    fields: [],
    currentId: null,
  })),
  setGardenPicker: jest.fn(),
  subscribeGardenPicker: jest.fn(() => () => undefined),
}));

const mockedGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockedGetFields = getFields as jest.MockedFunction<typeof getFields>;
const mockedGetCurrentField = getCurrentField as jest.MockedFunction<
  typeof getCurrentField
>;
const mockedIsAuthError = isAuthError as jest.MockedFunction<typeof isAuthError>;

describe('AppHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsAuthError.mockReturnValue(false);
    (getGardenPicker as jest.Mock).mockReturnValue({
      open: false,
      fields: [],
      currentId: null,
    });
    mockedGetAuth.mockResolvedValue({
      token: 'token',
      refreshToken: null,
      username: 'ainhoa',
    });
    mockedGetCurrentField.mockResolvedValue({ id: 3, name: 'Hort' });
    mockedGetFields.mockResolvedValue([
      {
        id: 3,
        name: 'Hort',
        location: null,
        field_type: null,
        soil_type: null,
        size_m2: null,
        device_count: 0,
      },
      {
        id: 4,
        name: 'Camp',
        location: null,
        field_type: null,
        soil_type: null,
        size_m2: null,
        device_count: 0,
      },
    ]);
  });

  it('shows AGRITWIN and the current garden', async () => {
    render(<AppHeader />);

    expect(screen.getByText('AGRITWIN')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('Hort')).toBeTruthy();
    });
  });

  it('opens the garden picker when there are several gardens', async () => {
    render(<AppHeader />);

    await waitFor(() => {
      expect(screen.getByLabelText('Hort')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('Hort'));
    await waitFor(() => {
      expect(setGardenPicker).toHaveBeenCalledWith(
        expect.objectContaining({ open: true, currentId: 3 }),
      );
    });
  });

  it('hides the garden button when there is no session', async () => {
    mockedGetAuth.mockResolvedValue(null);
    render(<AppHeader />);
    expect(screen.getByText('AGRITWIN')).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByText('Hort')).toBeNull();
    });
  });

  it('uses the first garden when the stored one is gone', async () => {
    mockedGetCurrentField.mockResolvedValue({ id: 99, name: 'Old' });
    render(<AppHeader />);
    await waitFor(() => {
      expect(screen.getByText('Hort')).toBeTruthy();
    });
  });

  it('keeps the stored garden when it is still in the account', async () => {
    mockedGetCurrentField.mockResolvedValue({ id: 4, name: 'Camp' });

    render(<AppHeader />);

    await waitFor(() => expect(screen.getByText('Camp')).toBeTruthy());
    expect(setCurrentField).not.toHaveBeenCalled();
  });

  it('shows no garden button when the account has no gardens', async () => {
    mockedGetCurrentField.mockResolvedValue(null);
    mockedGetFields.mockResolvedValue([]);

    render(<AppHeader />);

    await waitFor(() => expect(getFields).toHaveBeenCalled());
    expect(screen.queryByLabelText('Hort')).toBeNull();
    expect(screen.getByText('AGRITWIN')).toBeTruthy();
  });

  it('closes the garden picker when the current garden button is pressed again', async () => {
    render(<AppHeader />);
    await waitFor(() => expect(screen.getByLabelText('Hort')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Hort'));
    await waitFor(() => expect(setGardenPicker).toHaveBeenCalledWith(
      expect.objectContaining({ open: true }),
    ));

    fireEvent.press(screen.getByLabelText('Hort'));
    expect(setGardenPicker).toHaveBeenLastCalledWith({ open: false });
  });

  it('does not open a picker for a single garden', async () => {
    mockedGetFields.mockResolvedValue([
      {
        id: 3,
        name: 'Hort',
        location: null,
        field_type: null,
        soil_type: null,
        size_m2: null,
        device_count: 0,
      },
    ]);
    render(<AppHeader />);
    await waitFor(() => expect(screen.getByLabelText('Hort')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Hort'));

    await waitFor(() => expect(setGardenPicker).toHaveBeenLastCalledWith(
      expect.objectContaining({ open: false, currentId: 3 }),
    ));
  });

  it('clears an expired session and routes to login on an auth error', async () => {
    mockedGetFields.mockRejectedValueOnce(new Error('expired'));
    mockedIsAuthError.mockReturnValue(true);

    render(<AppHeader />);

    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('refreshes the current garden from its subscription', async () => {
    let notifyCurrentField: (() => void) | undefined;
    (subscribeCurrentField as jest.Mock).mockImplementationOnce(
      (listener: () => void) => {
        notifyCurrentField = listener;
        return () => undefined;
      },
    );
    render(<AppHeader />);
    await waitFor(() => expect(screen.getByText('Hort')).toBeTruthy());

    mockedGetCurrentField.mockResolvedValueOnce({ id: 4, name: 'Camp' });
    await act(async () => notifyCurrentField?.());

    expect(screen.getByText('Camp')).toBeTruthy();
  });

  it('updates picker state when the picker subscription changes', async () => {
    let notifyPicker: (() => void) | undefined;
    (subscribeGardenPicker as jest.Mock).mockImplementationOnce(
      (listener: () => void) => {
        notifyPicker = listener;
        return () => undefined;
      },
    );
    render(<AppHeader />);
    await waitFor(() => expect(screen.getByLabelText('Hort')).toBeTruthy());

    (getGardenPicker as jest.Mock).mockReturnValueOnce({
      open: true,
      fields: [],
      currentId: 3,
    });
    await act(async () => notifyPicker?.());

    expect(screen.getByLabelText('Hort')).toBeTruthy();
  });

  it('routes to login if switching gardens discovers an expired session', async () => {
    render(<AppHeader />);
    await waitFor(() => expect(screen.getByLabelText('Hort')).toBeTruthy());
    mockedGetFields.mockRejectedValueOnce(new Error('expired'));
    mockedIsAuthError.mockReturnValue(true);

    fireEvent.press(screen.getByLabelText('Hort'));

    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('ignores a pending auth response after unmount', async () => {
    let resolveAuth: ((value: Awaited<ReturnType<typeof getAuth>>) => void) | undefined;
    mockedGetAuth.mockImplementationOnce(
      () => new Promise((resolve) => { resolveAuth = resolve; }),
    );
    const screenResult = render(<AppHeader />);
    screenResult.unmount();

    await act(async () => {
      resolveAuth?.({ token: 'late-token', refreshToken: null, username: 'late' });
    });

    expect(getFields).not.toHaveBeenCalled();
  });

  it('ignores a pending stored garden response after unmount', async () => {
    let resolveStored:
      | ((value: Awaited<ReturnType<typeof getCurrentField>>) => void)
      | undefined;
    mockedGetCurrentField.mockImplementationOnce(
      () => new Promise((resolve) => { resolveStored = resolve; }),
    );
    const screenResult = render(<AppHeader />);

    await waitFor(() => expect(getCurrentField).toHaveBeenCalledTimes(1));
    screenResult.unmount();
    await act(async () => {
      resolveStored?.(null);
    });

    expect(getFields).toHaveBeenCalledTimes(1);
    expect(getCurrentField).toHaveBeenCalledTimes(1);
  });

  it('ignores a pending garden response after unmount', async () => {
    let resolveFields:
      | ((value: Awaited<ReturnType<typeof getFields>>) => void)
      | undefined;
    mockedGetFields.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFields = resolve; }),
    );
    const screenResult = render(<AppHeader />);

    await waitFor(() => expect(getFields).toHaveBeenCalledTimes(1));
    screenResult.unmount();
    await act(async () => {
      resolveFields?.([]);
    });

    expect(setCurrentField).not.toHaveBeenCalled();
  });

  it('ignores a garden loading error after unmount', async () => {
    let rejectFields: ((error: Error) => void) | undefined;
    mockedGetFields.mockImplementationOnce(
      () => new Promise((_resolve, reject) => { rejectFields = reject; }),
    );
    const screenResult = render(<AppHeader />);

    await waitFor(() => expect(getFields).toHaveBeenCalledTimes(1));
    screenResult.unmount();
    await act(async () => {
      rejectFields?.(new Error('late error'));
    });

    expect(clearAuth).not.toHaveBeenCalled();
  });

  it('cleans up subscriptions when unmounted', async () => {
    const unsubscribeField = jest.fn();
    const unsubscribePicker = jest.fn();
    (subscribeCurrentField as jest.Mock).mockReturnValueOnce(unsubscribeField);
    (subscribeGardenPicker as jest.Mock).mockReturnValueOnce(unsubscribePicker);

    const screenResult = render(<AppHeader />);
    await waitFor(() => expect(getFields).toHaveBeenCalled());
    screenResult.unmount();

    expect(unsubscribeField).toHaveBeenCalled();
    expect(unsubscribePicker).toHaveBeenCalled();
    expect(setGardenPicker).toHaveBeenLastCalledWith({ open: false });
  });
});
