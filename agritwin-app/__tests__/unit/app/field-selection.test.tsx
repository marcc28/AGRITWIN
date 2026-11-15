import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';

import FieldSelectionScreen from '../../../src/app/field-selection';
import { getFields, isAuthError } from '../../../src/services/api';
import { clearAuth } from '../../../src/services/auth';
import {
  getCurrentField,
  setCurrentField,
} from '../../../src/services/currentField';
import { DEVICE_HEALTH_COLOR } from '../../../src/services/deviceHealth';

jest.mock('react-i18next', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
    },
    useFocusEffect: (effect: () => void | (() => void)) => {
      useEffect(effect, [effect]);
    },
  };
});

jest.mock('../../../src/services/api', () => ({
  getFields: jest.fn(),
  isAuthError: jest.fn(() => false),
}));

jest.mock('../../../src/services/auth', () => ({
  clearAuth: jest.fn(),
}));

jest.mock('../../../src/services/currentField', () => ({
  getCurrentField: jest.fn(),
  setCurrentField: jest.fn(),
  subscribeCurrentField: () => () => undefined,
}));

jest.mock('../../../src/components/FieldPhoto', () => ({
  FieldPhoto: () => null,
}));

jest.mock('../../../src/components/AppHeader', () => () => null);

jest.mock('../../../src/components/GardenPickerOverlay', () => () => null);

const mockedGetFields = getFields as jest.MockedFunction<typeof getFields>;
const mockedIsAuthError = isAuthError as jest.MockedFunction<
  typeof isAuthError
>;
const mockedGetCurrentField = getCurrentField as jest.MockedFunction<
  typeof getCurrentField
>;

const fields = [
  {
    id: 3,
    name: 'Hort',
    location: null,
    field_type: null,
    soil_type: null,
    size_m2: null,
    device_count: 2,
    devices_online: 2,
  },
  {
    id: 4,
    name: 'Camp',
    location: null,
    field_type: null,
    soil_type: null,
    size_m2: null,
    device_count: 2,
    devices_online: 1,
  },
  {
    id: 5,
    name: 'Terrassa',
    location: null,
    field_type: null,
    soil_type: null,
    size_m2: null,
    device_count: 1,
    devices_online: 0,
  },
];

function frameColor(id: number) {
  const [frame] = screen
    .getByTestId(`field-tile-${id}`)
    .findAll(
      (node: { type: unknown; props: { style?: StyleProp<ViewStyle> } }) =>
        typeof node.type === 'string' &&
        StyleSheet.flatten(node.props.style)?.borderWidth === 4,
    );
  return StyleSheet.flatten(frame.props.style).borderColor;
}

describe('FieldSelectionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetFields.mockResolvedValue(fields);
    mockedGetCurrentField.mockResolvedValue({ id: 3, name: 'Hort' });
    mockedIsAuthError.mockReturnValue(false);
  });

  it('frames each garden with the colour of its sensors', async () => {
    render(<FieldSelectionScreen />);

    await waitFor(() => {
      expect(screen.getByText('Terrassa')).toBeTruthy();
    });
    expect(frameColor(3)).toBe(DEVICE_HEALTH_COLOR.ok);
    expect(frameColor(4)).toBe(DEVICE_HEALTH_COLOR.partial);
    expect(frameColor(5)).toBe(DEVICE_HEALTH_COLOR.down);
    expect(screen.getByText('fieldSelection.legendTitle')).toBeTruthy();
  });

  it('opens home with the chosen garden', async () => {
    render(<FieldSelectionScreen />);

    await waitFor(() => {
      expect(screen.getByText('Camp')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('field-tile-4'));

    await waitFor(() => {
      expect(setCurrentField).toHaveBeenCalledWith({ id: 4, name: 'Camp' });
      expect(router.push).toHaveBeenCalledWith('/app/home');
    });
  });

  it('opens the garden editor in edit mode', async () => {
    render(<FieldSelectionScreen />);

    await waitFor(() => {
      expect(screen.getByText('Hort')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('field-selection-manage'));
    fireEvent.press(screen.getByTestId('field-tile-3'));

    expect(setCurrentField).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/edit-field',
      params: { id: '3', from: 'field-selection' },
    });
  });

  it('opens the form to add a garden', async () => {
    render(<FieldSelectionScreen />);

    await waitFor(() => {
      expect(screen.getByText('Hort')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('field-selection-add'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/create-field',
      params: { from: 'field-selection' },
    });
  });

  it('asks for confirmation before deleting a garden', async () => {
    render(<FieldSelectionScreen />);

    await waitFor(() => {
      expect(screen.getByText('Hort')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('field-selection-manage'));
    fireEvent.press(screen.getByTestId('field-delete-3'));
    expect(screen.getByText('fieldSelection.deleteMessage')).toBeTruthy();

    fireEvent.press(screen.getByTestId('field-delete-confirm'));
    expect(screen.queryByText('fieldSelection.deleteMessage')).toBeNull();
  });

  it('redirects to login when the session is not valid', async () => {
    mockedGetFields.mockRejectedValue(new Error('Not authenticated'));
    mockedIsAuthError.mockReturnValue(true);

    render(<FieldSelectionScreen />);

    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
    });
  });
});
