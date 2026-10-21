import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import EditFieldScreen from '../../../src/app/edit-field';
import {
  createDevice,
  deleteDevice,
  getField,
  updateDevice,
  updateField,
} from '../../../src/services/api';
import { clearAuth } from '../../../src/services/auth';
import { router } from 'expo-router';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockUseLocalSearchParams = jest.fn(() => ({ id: '3' }));
const mockIsAuthError = jest.fn(() => false);

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('../../../src/services/api', () => ({
  getField: jest.fn(),
  updateField: jest.fn(),
  createDevice: jest.fn(),
  updateDevice: jest.fn(),
  deleteDevice: jest.fn(),
  isAuthError: (error: unknown) => mockIsAuthError(error),
}));

jest.mock('../../../src/services/auth', () => ({
  clearAuth: jest.fn(),
}));

jest.mock('../../../src/services/currentField', () => ({
  getCurrentField: jest.fn(async () => ({ id: 3, name: 'Hort' })),
  setCurrentField: jest.fn(),
}));

jest.mock('../../../src/services/fieldPhoto', () => ({
  getFieldPhotoIndex: jest.fn(async () => 1),
  setFieldPhotoIndex: jest.fn(),
}));

const mockedGetField = getField as jest.MockedFunction<typeof getField>;
const mockedUpdateField = updateField as jest.MockedFunction<
  typeof updateField
>;
const mockedCreateDevice = createDevice as jest.MockedFunction<
  typeof createDevice
>;
const mockedUpdateDevice = updateDevice as jest.MockedFunction<
  typeof updateDevice
>;
const mockedDeleteDevice = deleteDevice as jest.MockedFunction<
  typeof deleteDevice
>;

describe('EditFieldScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: '3' });
    mockIsAuthError.mockReturnValue(false);
    mockedGetField.mockResolvedValue({
      id: 3,
      name: 'Hort',
      location: 'Andorra',
      field_type: 'home_garden',
      soil_type: 'loam',
      size_m2: 40,
      device_count: 1,
      devices: [
        {
          id: 'dev-1',
          battery_status: true,
          brand: 'ESP32',
          serial_number: 'SN-1',
        },
      ],
    });
  });

  it('loads the garden to edit', async () => {
    render(<EditFieldScreen />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Hort')).toBeTruthy();
    });
    expect(screen.getByDisplayValue('Andorra')).toBeTruthy();
  });

  it('saves the garden', async () => {
    mockedUpdateField.mockResolvedValue({
      id: 3,
      name: 'Hort nou',
      location: 'Andorra',
      field_type: 'home_garden',
      soil_type: 'loam',
      size_m2: 40,
      device_count: 0,
    });

    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Hort')).toBeTruthy();
    });
    fireEvent.changeText(screen.getByDisplayValue('Hort'), 'Hort nou');
    fireEvent.press(screen.getByText('settings.accept'));

    await waitFor(() => {
      expect(mockedUpdateField).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ name: 'Hort nou' }),
      );
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/field-detail',
        params: { id: '3' },
      });
    });
  });

  it('rejects an empty name', async () => {
    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Hort')).toBeTruthy();
    });
    fireEvent.changeText(screen.getByDisplayValue('Hort'), '  ');
    fireEvent.press(screen.getByText('settings.accept'));
    expect(screen.getByText('settings.errors.nameRequired')).toBeTruthy();
  });

  it('goes back without saving', async () => {
    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(screen.getByText('settings.cancel')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('settings.cancel'));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/field-detail',
      params: { id: '3' },
    });
  });

  it('rejects an invalid size', async () => {
    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('40')).toBeTruthy();
    });
    fireEvent.changeText(screen.getByDisplayValue('40'), 'nope');
    fireEvent.press(screen.getByText('settings.accept'));
    expect(screen.getByText('settings.errors.sizeNumber')).toBeTruthy();
  });

  it('rejects an incomplete new Arduino', async () => {
    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(screen.getByText('settings.createField.addAnother')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('settings.createField.addAnother'));
    const ids = screen.getAllByPlaceholderText(
      'settings.createField.deviceIdPlaceholder',
    );
    fireEvent.changeText(ids[ids.length - 1], 'esp32_sim_09');
    fireEvent.press(screen.getByText('settings.accept'));
    expect(
      screen.getByText('settings.createField.errors.deviceIdRequired'),
    ).toBeTruthy();
  });

  it('updates existing devices and creates a new one', async () => {
    mockedUpdateField.mockResolvedValue({
      id: 3,
      name: 'Hort',
      location: 'Andorra',
      field_type: 'home_garden',
      soil_type: 'loam',
      size_m2: 40,
      device_count: 2,
    });
    mockedCreateDevice.mockResolvedValue({
      id: 'esp32_sim_09',
      battery_status: false,
      brand: 'ESP32',
      serial_number: 'SN-9',
    });

    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(screen.getByText('settings.createField.addAnother')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('settings.fieldTypes.open_field'));
    fireEvent.press(screen.getByText('settings.soilTypes.sandy'));
    fireEvent.press(screen.getByText('settings.createField.addAnother'));
    const ids = screen.getAllByPlaceholderText(
      'settings.createField.deviceIdPlaceholder',
    );
    const brands = screen.getAllByPlaceholderText(
      'settings.createField.deviceBrandPlaceholder',
    );
    const serials = screen.getAllByPlaceholderText(
      'settings.createField.deviceSerialPlaceholder',
    );
    fireEvent.changeText(ids[ids.length - 1], 'esp32_sim_09');
    fireEvent.changeText(brands[brands.length - 1], 'ESP32');
    fireEvent.changeText(serials[serials.length - 1], 'SN-9');
    fireEvent.press(screen.getByText('settings.accept'));

    await waitFor(() => {
      expect(mockedUpdateDevice).toHaveBeenCalledWith(
        3,
        'dev-1',
        expect.objectContaining({ brand: 'ESP32', serial_number: 'SN-1' }),
      );
      expect(mockedCreateDevice).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ id: 'esp32_sim_09' }),
      );
    });
  });

  it('removes an existing Arduino', async () => {
    mockedDeleteDevice.mockResolvedValue(undefined);
    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(
        screen.getByText('settings.createField.removeDevice'),
      ).toBeTruthy();
    });
    fireEvent.press(screen.getByText('settings.createField.removeDevice'));
    await waitFor(() => {
      expect(mockedDeleteDevice).toHaveBeenCalledWith(3, 'dev-1');
    });
  });

  it('shows when removing a device fails', async () => {
    mockedDeleteDevice.mockRejectedValue(new Error('cannot delete'));
    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(
        screen.getByText('settings.createField.removeDevice'),
      ).toBeTruthy();
    });
    fireEvent.press(screen.getByText('settings.createField.removeDevice'));
    await waitFor(() => {
      expect(screen.getByText('cannot delete')).toBeTruthy();
    });
  });

  it('shows when saving fails', async () => {
    mockedUpdateField.mockRejectedValue(new Error('cannot save'));
    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Hort')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('settings.accept'));
    await waitFor(() => {
      expect(screen.getByText('cannot save')).toBeTruthy();
    });
  });

  it('redirects when loading the garden is unauthorized', async () => {
    mockIsAuthError.mockReturnValue(true);
    mockedGetField.mockRejectedValue(new Error('Not authenticated'));
    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('shows an invalid id', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: 'nope' });
    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(screen.getByText('settings.errors.invalidId')).toBeTruthy();
    });
  });

  it('shows when the garden cannot be loaded', async () => {
    mockedGetField.mockRejectedValue(new Error('missing garden'));
    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(screen.getByText('missing garden')).toBeTruthy();
    });
  });
});
