import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import CreateFieldScreen from '../../../src/app/create-field';
import {
  createDevice,
  createField,
  geocodeLocation,
  reverseGeocodeLocation,
} from '../../../src/services/api';
import { clearAuth } from '../../../src/services/auth';
import { router } from 'expo-router';

const mockUseLocalSearchParams = jest.fn();
const mockIsAuthError = jest.fn((_error?: unknown) => false);

jest.mock('../../../src/components/field-location/MapCanvas', () => {
  const { Pressable, Text } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return function MockMap({
    onSelect,
    boundary,
    onBoundaryChange,
  }: {
    onSelect: (point: { lat: number; lon: number }) => void;
    boundary?: { lat: number; lon: number }[];
    onBoundaryChange?: (points: { lat: number; lon: number }[]) => void;
  }) {
    if (onBoundaryChange)
      return (
        <Pressable
          onPress={() =>
            onBoundaryChange([
              ...(boundary ?? []),
              [
                { lat: 0, lon: 0 },
                { lat: 0, lon: 0.001 },
                { lat: 0.001, lon: 0.001 },
                { lat: 0.001, lon: 0 },
              ][boundary?.length ?? 0],
            ])
          }
        >
          <Text>Add test corner</Text>
        </Pressable>
      );
    return (
      <Pressable onPress={() => onSelect({ lat: 42.5, lon: 1.5 })}>
        <Text>Select test point</Text>
      </Pressable>
    );
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('../../../src/services/api', () => ({
  createField: jest.fn(),
  createDevice: jest.fn(),
  geocodeLocation: jest.fn(),
  reverseGeocodeLocation: jest.fn(),
  isAuthError: (error?: unknown) => mockIsAuthError(error),
}));

jest.mock('../../../src/services/auth', () => ({
  clearAuth: jest.fn(),
}));

jest.mock('../../../src/services/currentField', () => ({
  setCurrentField: jest.fn(),
}));

jest.mock('../../../src/services/fieldPhoto', () => ({
  setFieldPhotoIndex: jest.fn(),
}));

const mockedCreateField = createField as jest.MockedFunction<
  typeof createField
>;
const mockedCreateDevice = createDevice as jest.MockedFunction<
  typeof createDevice
>;
const mockedGeocode = geocodeLocation as jest.MockedFunction<
  typeof geocodeLocation
>;

const created = {
  id: 8,
  name: 'Hort nou',
  location: 'Andorra',
  field_type: 'home_garden',
  soil_type: 'loam',
  size_m2: 20,
  device_count: 0,
};

describe('CreateFieldScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ from: 'profile' });
    mockIsAuthError.mockReturnValue(false);
    mockedCreateField.mockResolvedValue(created);
    jest
      .mocked(reverseGeocodeLocation)
      .mockResolvedValue({ lat: 42.5, lon: 1.5, label: 'Field address' });
  });

  it('creates a garden from the profile form', async () => {
    render(<CreateFieldScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'Hort nou',
    );
    fireEvent.press(screen.getByText('settings.fieldTypes.open_field'));
    fireEvent.press(screen.getByText('settings.soilTypes.clay'));
    fireEvent.press(screen.getByText('settings.createField.submitNext'));

    await waitFor(() => {
      expect(mockedCreateField).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Hort nou',
          field_type: 'open_field',
          soil_type: 'clay',
        }),
      );
    });
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/field-detail',
      params: { id: '8' },
    });
  });

  it('goes home after the first garden', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    render(<CreateFieldScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'Hort nou',
    );
    fireEvent.press(screen.getByText('settings.createField.submitFirst'));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/app/home');
    });
  });

  it('accepts from=profile as an array', async () => {
    mockUseLocalSearchParams.mockReturnValue({ from: ['profile'] });
    render(<CreateFieldScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'Hort nou',
    );
    fireEvent.press(screen.getByText('settings.createField.submitNext'));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/field-detail',
        params: { id: '8' },
      });
    });
  });

  it('rejects an empty name', () => {
    render(<CreateFieldScreen />);
    fireEvent.press(screen.getByText('settings.createField.submitNext'));
    expect(screen.getByText('settings.errors.nameRequired')).toBeTruthy();
  });

  it('rejects an invalid size', () => {
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'Hort nou',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.sizePlaceholder'),
      '-4',
    );
    fireEvent.press(screen.getByText('settings.createField.submitNext'));
    expect(screen.getByText('settings.errors.sizeNumber')).toBeTruthy();
  });

  it('asks for a location before geocoding', () => {
    render(<CreateFieldScreen />);
    fireEvent.press(screen.getByText('settings.createField.lookupAddress'));
    expect(
      screen.getByText('settings.createField.errors.locationRequired'),
    ).toBeTruthy();
  });

  it('creates a field with a confirmed map point', async () => {
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'Hort nou',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      'Old address',
    );
    fireEvent.press(screen.getByLabelText('settings.createField.map.open'));
    expect(screen.getByText('settings.createField.map.confirm')).toBeDisabled();
    fireEvent.press(screen.getByText('Select test point'));
    fireEvent.press(screen.getByText('settings.createField.map.confirm'));
    await waitFor(() =>
      expect(screen.getByDisplayValue('Field address')).toBeTruthy(),
    );
    expect(screen.queryByText('settings.createField.map.title')).toBeNull();
    fireEvent.press(screen.getByText('settings.createField.submitNext'));
    await waitFor(() =>
      expect(mockedCreateField).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: 42.5,
          lon: 1.5,
          location: 'Field address',
        }),
      ),
    );
    expect(mockedGeocode).not.toHaveBeenCalled();
  });

  it('discards an unconfirmed point and keeps the manual address', async () => {
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'Hort nou',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      'Andorra',
    );
    fireEvent.press(screen.getByLabelText('settings.createField.map.open'));
    fireEvent.press(screen.getByText('Select test point'));
    fireEvent.press(screen.getByText('settings.createField.map.cancel'));
    fireEvent.press(screen.getByLabelText('settings.createField.map.open'));
    expect(screen.getByText('settings.createField.map.confirm')).toBeDisabled();
    fireEvent.press(screen.getByText('settings.createField.map.cancel'));
    fireEvent.press(screen.getByText('settings.createField.submitNext'));
    await waitFor(() =>
      expect(mockedCreateField).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: null,
          lon: null,
          location: 'Andorra',
        }),
      ),
    );
  });

  it('reopens the saved point and clears it after editing the address', async () => {
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'Hort nou',
    );
    fireEvent.press(screen.getByLabelText('settings.createField.map.open'));
    fireEvent.press(screen.getByText('Select test point'));
    fireEvent.press(screen.getByText('settings.createField.map.confirm'));
    await waitFor(() =>
      expect(screen.getByDisplayValue('Field address')).toBeTruthy(),
    );
    fireEvent.press(screen.getByLabelText('settings.createField.map.open'));
    expect(screen.getByText('settings.createField.map.confirm')).toBeEnabled();
    fireEvent.press(screen.getByText('settings.createField.map.cancel'));
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      'La Massana',
    );
    fireEvent.press(screen.getByText('settings.createField.submitNext'));
    await waitFor(() =>
      expect(mockedCreateField).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: null,
          lon: null,
          location: 'La Massana',
        }),
      ),
    );
  });

  it('geocodes a location', async () => {
    mockedGeocode.mockResolvedValue({
      lat: 42.5,
      lon: 1.5,
      label: 'Andorra la Vella',
    });
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      'Andorra',
    );
    fireEvent.press(screen.getByText('settings.createField.lookupAddress'));

    await waitFor(() => {
      expect(mockedGeocode).toHaveBeenCalledWith('Andorra');
      expect(screen.getByText(/settings.createField.coords/)).toBeTruthy();
    });
  });

  it('clears coords when the location text changes', async () => {
    mockedGeocode.mockResolvedValue({
      lat: 42.5,
      lon: 1.5,
      label: 'Andorra',
    });
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      'Andorra',
    );
    fireEvent.press(screen.getByText('settings.createField.lookupAddress'));
    await waitFor(() => {
      expect(screen.getByText(/settings.createField.coords/)).toBeTruthy();
    });
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      'La Massana',
    );
    expect(screen.getByText('settings.createField.coordsHint')).toBeTruthy();
  });

  it('shows a geocode error', async () => {
    mockedGeocode.mockRejectedValue(new Error('not found'));
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      'xxxx',
    );
    fireEvent.press(screen.getByText('settings.createField.lookupAddress'));

    await waitFor(() => {
      expect(screen.getByText('not found')).toBeTruthy();
    });
  });

  it('logs out when geocode is unauthorized', async () => {
    mockIsAuthError.mockReturnValue(true);
    mockedGeocode.mockRejectedValue(new Error('Not authenticated'));
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      'Andorra',
    );
    fireEvent.press(screen.getByText('settings.createField.lookupAddress'));

    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('can switch back to configure later', () => {
    render(<CreateFieldScreen />);
    fireEvent.press(screen.getByText('settings.createField.addNow'));
    fireEvent.press(screen.getByText('settings.createField.configureLater'));
    expect(screen.getByText('settings.createField.arduinosHint')).toBeTruthy();
  });

  it('rejects an incomplete Arduino', () => {
    render(<CreateFieldScreen />);
    fireEvent.press(screen.getByText('settings.createField.addNow'));
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.deviceIdPlaceholder'),
      'esp32_sim_01',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'Hort nou',
    );
    fireEvent.press(screen.getByText('settings.createField.submitNext'));
    expect(
      screen.getByText('settings.createField.errors.deviceIdRequired'),
    ).toBeTruthy();
  });

  it('links an Arduino when creating the garden', async () => {
    mockedCreateDevice.mockResolvedValue({
      id: 'esp32_sim_01',
      battery_status: false,
      brand: 'ESP32',
      serial_number: 'SN-1',
    });
    render(<CreateFieldScreen />);
    fireEvent.press(screen.getByText('settings.createField.addNow'));
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.deviceIdPlaceholder'),
      'esp32_sim_01',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(
        'settings.createField.deviceBrandPlaceholder',
      ),
      'ESP32',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(
        'settings.createField.deviceSerialPlaceholder',
      ),
      'SN-1',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'Hort nou',
    );
    fireEvent.press(screen.getByText('settings.createField.submitNext'));

    await waitFor(() => {
      expect(mockedCreateDevice).toHaveBeenCalledWith(
        8,
        expect.objectContaining({ id: 'esp32_sim_01', brand: 'ESP32' }),
      );
    });
  });

  it('shows a generic geocode error', async () => {
    mockedGeocode.mockRejectedValue('offline');
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      'Andorra',
    );
    fireEvent.press(screen.getByText('settings.createField.lookupAddress'));

    await waitFor(() => {
      expect(
        screen.getByText('settings.createField.errors.locationNotFound'),
      ).toBeTruthy();
    });
  });

  it('shows a create error', async () => {
    mockedCreateField.mockRejectedValue(new Error('create failed'));
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'Hort nou',
    );
    fireEvent.press(screen.getByText('settings.createField.submitNext'));

    await waitFor(() => {
      expect(screen.getByText('create failed')).toBeTruthy();
    });
  });

  it('shows a generic create error', async () => {
    mockedCreateField.mockRejectedValue('offline');
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'Hort nou',
    );
    fireEvent.press(screen.getByText('settings.createField.submitNext'));

    await waitFor(() => {
      expect(
        screen.getByText('settings.createField.errors.createFailed'),
      ).toBeTruthy();
    });
  });

  it('logs out when create is unauthorized', async () => {
    mockIsAuthError.mockReturnValue(true);
    mockedCreateField.mockRejectedValue(new Error('Not authenticated'));
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'Hort nou',
    );
    fireEvent.press(screen.getByText('settings.createField.submitNext'));

    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('goes back to my gardens from profile', () => {
    render(<CreateFieldScreen />);
    fireEvent.press(screen.getByText('settings.myGardens'));
    expect(router.replace).toHaveBeenCalledWith('/app/settings');
  });

  it('logs out from the first-garden screen', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    render(<CreateFieldScreen />);
    fireEvent.press(screen.getByText('settings.logout'));
    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
    });
  });
});

describe('Field area and boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ from: 'profile' });
    mockIsAuthError.mockReturnValue(false);
    mockedCreateField.mockResolvedValue(created);
    jest
      .mocked(reverseGeocodeLocation)
      .mockResolvedValue({ lat: 0.0005, lon: 0.0005, label: 'Field road' });
  });
  it('shows the boundary option only for supported field types', () => {
    render(<CreateFieldScreen />);
    expect(screen.queryByText('settings.createField.boundary.draw')).toBeNull();
    for (const type of ['open_field', 'greenhouse', 'orchard']) {
      fireEvent.press(screen.getByText(`settings.fieldTypes.${type}`));
      expect(
        screen.getByText('settings.createField.boundary.draw'),
      ).toBeTruthy();
    }
  });
  it('converts manually entered hectares to square metres', async () => {
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'New field',
    );
    fireEvent.press(screen.getByText('settings.createField.areaUnits.ha'));
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.sizePlaceholder'),
      '2,5',
    );
    fireEvent.press(screen.getByText('settings.createField.submitNext'));
    await waitFor(() =>
      expect(mockedCreateField).toHaveBeenCalledWith(
        expect.objectContaining({ size_m2: 25000 }),
      ),
    );
  });
  it('calculates a boundary area, fills its address and submits its corners', async () => {
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'New field',
    );
    fireEvent.press(screen.getByText('settings.fieldTypes.open_field'));
    fireEvent.press(screen.getByText('settings.createField.boundary.draw'));
    expect(
      screen.getByText('settings.createField.boundary.confirm'),
    ).toBeDisabled();
    for (let i = 0; i < 4; i++)
      fireEvent.press(screen.getByText('Add test corner'));
    fireEvent.press(screen.getByText('settings.createField.boundary.confirm'));
    await waitFor(() =>
      expect(screen.getByDisplayValue('Field road')).toBeTruthy(),
    );
    expect(
      screen.getByPlaceholderText('settings.createField.sizePlaceholder'),
    ).toHaveProp('editable', false);
    fireEvent.press(screen.getByText('settings.createField.areaUnits.ha'));
    fireEvent.press(screen.getByText('settings.createField.submitNext'));
    await waitFor(() =>
      expect(mockedCreateField).toHaveBeenCalledWith(
        expect.objectContaining({
          size_m2: 12364.35,
          location: 'Field road',
          boundary: expect.arrayContaining([{ lat: 0, lon: 0 }]),
          lat: expect.closeTo(0.0005, 8),
          lon: expect.closeTo(0.0005, 8),
        }),
      ),
    );
  });
});
