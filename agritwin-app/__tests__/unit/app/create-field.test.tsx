import React from 'react';
import { Platform } from 'react-native';

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
import { loadGardenPickerFields } from '../../../src/services/gardenPicker';
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

jest.mock('../../../src/services/gardenPicker', () => ({
  loadGardenPickerFields: jest.fn(),
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

function goToStep(target: number) {
  const current =
    screen.getByRole('progressbar').props.accessibilityValue.now - 1;
  for (let index = current; index < target; index++) {
    if (index === 0) {
      const input = screen.getByPlaceholderText(
        'settings.createField.namePlaceholder',
      );
      if (!input.props.value.trim()) fireEvent.changeText(input, 'Hort nou');
    }
    if (index === 1) {
      const input = screen.getByPlaceholderText(
        'settings.createField.locationPlaceholder',
      );
      if (
        !input.props.value.trim() &&
        screen.queryByText('settings.createField.coordsHint')
      )
        fireEvent.changeText(input, 'Lleida');
    }
    if (index === 2) {
      if (
        screen.queryAllByRole('button', {
          selected: true,
          name: /settings.fieldTypes\./,
        }).length === 0
      )
        fireEvent.press(screen.getByText('settings.fieldTypes.home_garden'));
      const input = screen.getByPlaceholderText(
        'settings.createField.sizePlaceholder',
      );
      if (!input.props.value.trim()) fireEvent.changeText(input, '40');
    }
    fireEvent.press(screen.getByText('settings.fieldForm.next'));
  }
  for (let index = current; index > target; index--)
    fireEvent.press(screen.getByText('settings.fieldForm.previous'));
}

function onStep<T>(step: number, find: () => T): T {
  goToStep(step);
  return find();
}

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

  it('navigates one section at a time and preserves entered values without saving', () => {
    render(<CreateFieldScreen />);
    expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', {
      min: 1,
      max: 4,
      now: 1,
    });
    expect(
      screen.queryByPlaceholderText('settings.createField.locationPlaceholder'),
    ).toBeNull();
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      'My field',
    );
    fireEvent.press(screen.getByText('settings.fieldForm.next'));
    expect(
      screen.queryByPlaceholderText('settings.createField.namePlaceholder'),
    ).toBeNull();
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      'Carrer Major, Lleida',
    );
    fireEvent.press(screen.getByText('settings.fieldForm.next'));
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.sizePlaceholder'),
      '250',
    );
    fireEvent.press(screen.getByText('settings.fieldTypes.home_garden'));
    fireEvent.press(screen.getByText('settings.fieldForm.next'));
    expect(screen.queryByText('settings.fieldForm.next')).toBeNull();
    expect(screen.getByText('settings.createField.submitNext')).toBeTruthy();
    fireEvent.press(screen.getByText('settings.fieldForm.previous'));
    expect(screen.getByDisplayValue('250')).toBeTruthy();
    fireEvent.press(screen.getByText('settings.fieldForm.previous'));
    expect(screen.getByDisplayValue('Carrer Major, Lleida')).toBeTruthy();
    fireEvent.press(screen.getByText('settings.fieldForm.previous'));
    expect(screen.getByDisplayValue('My field')).toBeTruthy();
    expect(mockedCreateField).not.toHaveBeenCalled();
    expect(mockedGeocode).not.toHaveBeenCalled();
  });

  it('retries a failed address lookup for the same selected point', async () => {
    jest
      .mocked(reverseGeocodeLocation)
      .mockRejectedValueOnce(new Error('provider unavailable'));
    render(<CreateFieldScreen />);
    goToStep(1);
    fireEvent.press(screen.getByLabelText('settings.createField.map.open'));
    fireEvent.press(screen.getByText('Select test point'));
    fireEvent.press(screen.getByText('settings.createField.map.confirm'));
    await waitFor(() =>
      expect(
        screen.getByText('settings.createField.errors.addressUnavailable'),
      ).toBeTruthy(),
    );
    expect(screen.getByText('settings.createField.coords')).toBeTruthy();
    fireEvent.press(screen.getByText('settings.createField.retryAddress'));
    await screen.findByDisplayValue('Field address');
    expect(reverseGeocodeLocation).toHaveBeenNthCalledWith(2, 42.5, 1.5);
  });

  it('requires each mandatory section and leaves unknown soil empty', async () => {
    render(<CreateFieldScreen />);
    fireEvent.press(screen.getByText('settings.fieldForm.next'));
    expect(screen.getByText('settings.errors.nameRequired')).toBeTruthy();
    fireEvent.changeText(
      screen.getByLabelText('settings.name'),
      'Required field',
    );
    fireEvent.press(screen.getByText('settings.fieldForm.next'));
    fireEvent.press(screen.getByText('settings.fieldForm.next'));
    expect(
      screen.getByText('settings.fieldForm.errors.locationRequired'),
    ).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('settings.location'), 'Lleida');
    fireEvent.press(screen.getByText('settings.fieldForm.next'));
    fireEvent.press(screen.getByText('settings.fieldForm.next'));
    expect(
      screen.getByText('settings.fieldForm.errors.typeRequired'),
    ).toBeTruthy();
    expect(
      screen.getByText('settings.fieldForm.errors.areaRequired'),
    ).toBeTruthy();
    expect(mockedCreateField).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('settings.fieldTypes.orchard'));
    fireEvent.changeText(
      screen.getByLabelText('settings.createField.areaLabel'),
      '250',
    );
    fireEvent.press(screen.getByText('settings.fieldForm.next'));
    fireEvent.press(screen.getByText('settings.createField.submitNext'));
    await waitFor(() =>
      expect(mockedCreateField).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Required field',
          location: 'Lleida',
          field_type: 'orchard',
          size_m2: 250,
          soil_type: null,
        }),
      ),
    );
  });

  it('creates a garden from the profile form', async () => {
    render(<CreateFieldScreen />);

    fireEvent.changeText(
      onStep(0, () =>
        screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      ),
      'Hort nou',
    );
    fireEvent.press(
      onStep(2, () => screen.getByText('settings.fieldTypes.open_field')),
    );
    fireEvent.press(
      onStep(2, () => screen.getByText('settings.soilTypes.clay')),
    );
    fireEvent.press(
      onStep(3, () => screen.getByText('settings.createField.submitNext')),
    );

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
      onStep(0, () =>
        screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      ),
      'Hort nou',
    );
    fireEvent.press(
      onStep(3, () => screen.getByText('settings.createField.submitFirst')),
    );

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/app/home');
    });
  });

  it('accepts from=profile as an array', async () => {
    mockUseLocalSearchParams.mockReturnValue({ from: ['profile'] });
    render(<CreateFieldScreen />);

    fireEvent.changeText(
      onStep(0, () =>
        screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      ),
      'Hort nou',
    );
    fireEvent.press(
      onStep(3, () => screen.getByText('settings.createField.submitNext')),
    );

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/field-detail',
        params: { id: '8' },
      });
    });
  });

  it('rejects an empty name', () => {
    render(<CreateFieldScreen />);
    fireEvent.press(screen.getByText('settings.fieldForm.next'));
    expect(screen.getByText('settings.errors.nameRequired')).toBeTruthy();
  });

  it('rejects an invalid size', () => {
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      onStep(0, () =>
        screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      ),
      'Hort nou',
    );
    fireEvent.changeText(
      onStep(2, () =>
        screen.getByPlaceholderText('settings.createField.sizePlaceholder'),
      ),
      '-4',
    );
    fireEvent.press(screen.getByText('settings.fieldTypes.home_garden'));
    fireEvent.press(screen.getByText('settings.fieldForm.next'));
    expect(screen.getByText('settings.errors.sizeNumber')).toBeTruthy();
  });

  it('asks for a location before geocoding', () => {
    render(<CreateFieldScreen />);
    fireEvent.press(
      onStep(1, () => screen.getByText('settings.createField.lookupAddress')),
    );
    expect(
      screen.getByText('settings.createField.errors.locationRequired'),
    ).toBeTruthy();
  });

  it('creates a field with a confirmed map point', async () => {
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      onStep(0, () =>
        screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      ),
      'Hort nou',
    );
    fireEvent.changeText(
      onStep(1, () =>
        screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      ),
      'Old address',
    );
    fireEvent.press(
      onStep(1, () => screen.getByLabelText('settings.createField.map.open')),
    );
    expect(screen.getByText('settings.createField.map.confirm')).toBeDisabled();
    fireEvent.press(screen.getByText('Select test point'));
    fireEvent.press(screen.getByText('settings.createField.map.confirm'));
    await waitFor(() =>
      expect(
        onStep(1, () => screen.getByDisplayValue('Field address')),
      ).toBeTruthy(),
    );
    expect(screen.queryByText('settings.createField.map.title')).toBeNull();
    fireEvent.press(
      onStep(3, () => screen.getByText('settings.createField.submitNext')),
    );
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
      onStep(0, () =>
        screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      ),
      'Hort nou',
    );
    fireEvent.changeText(
      onStep(1, () =>
        screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      ),
      'Andorra',
    );
    fireEvent.press(
      onStep(1, () => screen.getByLabelText('settings.createField.map.open')),
    );
    fireEvent.press(screen.getByText('Select test point'));
    fireEvent.press(screen.getByText('settings.createField.map.cancel'));
    fireEvent.press(
      onStep(1, () => screen.getByLabelText('settings.createField.map.open')),
    );
    expect(screen.getByText('settings.createField.map.confirm')).toBeDisabled();
    fireEvent.press(screen.getByText('settings.createField.map.cancel'));
    fireEvent.press(
      onStep(3, () => screen.getByText('settings.createField.submitNext')),
    );
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
      onStep(0, () =>
        screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      ),
      'Hort nou',
    );
    fireEvent.press(
      onStep(1, () => screen.getByLabelText('settings.createField.map.open')),
    );
    fireEvent.press(screen.getByText('Select test point'));
    fireEvent.press(screen.getByText('settings.createField.map.confirm'));
    await waitFor(() =>
      expect(
        onStep(1, () => screen.getByDisplayValue('Field address')),
      ).toBeTruthy(),
    );
    fireEvent.press(
      onStep(1, () => screen.getByLabelText('settings.createField.map.open')),
    );
    expect(screen.getByText('settings.createField.map.confirm')).toBeEnabled();
    fireEvent.press(screen.getByText('settings.createField.map.cancel'));
    fireEvent.changeText(
      onStep(1, () =>
        screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      ),
      'La Massana',
    );
    fireEvent.press(
      onStep(3, () => screen.getByText('settings.createField.submitNext')),
    );
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
      onStep(1, () =>
        screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      ),
      'Andorra',
    );
    fireEvent.press(
      onStep(1, () => screen.getByText('settings.createField.lookupAddress')),
    );

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
      onStep(1, () =>
        screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      ),
      'Andorra',
    );
    fireEvent.press(
      onStep(1, () => screen.getByText('settings.createField.lookupAddress')),
    );
    await waitFor(() => {
      expect(screen.getByText(/settings.createField.coords/)).toBeTruthy();
    });
    fireEvent.changeText(
      onStep(1, () =>
        screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      ),
      'La Massana',
    );
    expect(screen.getByText('settings.createField.coordsHint')).toBeTruthy();
  });

  it('shows a geocode error', async () => {
    mockedGeocode.mockRejectedValue(new Error('not found'));
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      onStep(1, () =>
        screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      ),
      'xxxx',
    );
    fireEvent.press(
      onStep(1, () => screen.getByText('settings.createField.lookupAddress')),
    );

    await waitFor(() => {
      expect(screen.getByText('not found')).toBeTruthy();
    });
  });

  it('logs out when geocode is unauthorized', async () => {
    mockIsAuthError.mockReturnValue(true);
    mockedGeocode.mockRejectedValue(new Error('Not authenticated'));
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      onStep(1, () =>
        screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      ),
      'Andorra',
    );
    fireEvent.press(
      onStep(1, () => screen.getByText('settings.createField.lookupAddress')),
    );

    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('offers to link devices, but creating without them links none', async () => {
    render(<CreateFieldScreen />);
    expect(
      onStep(3, () => screen.getByText('addDevice.section.title')),
    ).toBeTruthy();
    expect(
      onStep(3, () => screen.getByText('addDevice.section.createHint')),
    ).toBeTruthy();
    expect(
      onStep(3, () => screen.getByText('addDevice.section.saveAndAdd')),
    ).toBeTruthy();
    // Without a board the new field shows simulated data (#286).
    expect(
      onStep(3, () => screen.getByText('simulatedData.createField')),
    ).toBeTruthy();

    fireEvent.changeText(
      onStep(0, () =>
        screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      ),
      'Hort nou',
    );
    fireEvent.press(
      onStep(3, () => screen.getByText('settings.createField.submitNext')),
    );

    await waitFor(() => {
      expect(mockedCreateField).toHaveBeenCalled();
    });
    expect(mockedCreateDevice).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/add-device' }),
    );
  });

  it.each<[string, Record<string, string>, string]>([
    ['from the profile', { from: 'profile' }, 'field-detail'],
    ['for the first garden', {}, 'home'],
    ['from the field selection', { from: 'field-selection' }, 'home'],
  ])(
    'saves the garden and opens "Add device" %s',
    async (_name, params, destination) => {
      mockUseLocalSearchParams.mockReturnValue(params);
      render(<CreateFieldScreen />);

      fireEvent.changeText(
        onStep(0, () =>
          screen.getByPlaceholderText('settings.createField.namePlaceholder'),
        ),
        'Hort nou',
      );
      fireEvent.press(onStep(3, () => screen.getByTestId('field-devices-add')));

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith({
          pathname: '/add-device',
          params: { id: '8', from: destination },
        });
      });
      expect(mockedCreateField).toHaveBeenCalledTimes(1);
      if (params.from === 'field-selection') {
        expect(loadGardenPickerFields).toHaveBeenCalledWith(true);
      }
    },
  );

  it('does not open "Add device" when the garden cannot be saved', async () => {
    render(<CreateFieldScreen />);

    fireEvent.press(screen.getByText('settings.fieldForm.next'));

    expect(screen.getByText('settings.errors.nameRequired')).toBeTruthy();
    expect(mockedCreateField).not.toHaveBeenCalled();

    fireEvent.changeText(
      onStep(0, () =>
        screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      ),
      'Hort nou',
    );
    mockedCreateField.mockRejectedValue(new Error('server down'));
    fireEvent.press(onStep(3, () => screen.getByTestId('field-devices-add')));

    await waitFor(() => {
      expect(screen.getByText('server down')).toBeTruthy();
    });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('explains that devices are added from the phone when on the web', () => {
    const web = jest.replaceProperty(Platform, 'OS', 'web');
    try {
      render(<CreateFieldScreen />);

      expect(
        onStep(3, () => screen.getByText('addDevice.web.hint')),
      ).toBeTruthy();
      expect(screen.queryByTestId('field-devices-add')).toBeNull();
    } finally {
      web.restore();
    }
  });

  it('shows a generic geocode error', async () => {
    mockedGeocode.mockRejectedValue('offline');
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      onStep(1, () =>
        screen.getByPlaceholderText('settings.createField.locationPlaceholder'),
      ),
      'Andorra',
    );
    fireEvent.press(
      onStep(1, () => screen.getByText('settings.createField.lookupAddress')),
    );

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
      onStep(0, () =>
        screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      ),
      'Hort nou',
    );
    fireEvent.press(
      onStep(3, () => screen.getByText('settings.createField.submitNext')),
    );

    await waitFor(() => {
      expect(screen.getByText('create failed')).toBeTruthy();
    });
  });

  it('shows a generic create error', async () => {
    mockedCreateField.mockRejectedValue('offline');
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      onStep(0, () =>
        screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      ),
      'Hort nou',
    );
    fireEvent.press(
      onStep(3, () => screen.getByText('settings.createField.submitNext')),
    );

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
      onStep(0, () =>
        screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      ),
      'Hort nou',
    );
    fireEvent.press(
      onStep(3, () => screen.getByText('settings.createField.submitNext')),
    );

    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('goes back to my gardens from profile', () => {
    render(<CreateFieldScreen />);
    fireEvent.press(screen.getByText('settings.myGardens'));
    expect(router.replace).toHaveBeenCalledWith('/profile');
  });

  it('goes back to the field selection', () => {
    mockUseLocalSearchParams.mockReturnValue({ from: 'field-selection' });
    render(<CreateFieldScreen />);
    fireEvent.press(screen.getByText('fieldSelection.back'));
    expect(router.replace).toHaveBeenCalledWith('/field-selection');
  });

  it('opens home with the new garden from the field selection', async () => {
    mockUseLocalSearchParams.mockReturnValue({ from: 'field-selection' });
    render(<CreateFieldScreen />);

    fireEvent.changeText(
      onStep(0, () =>
        screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      ),
      'Hort nou',
    );
    fireEvent.press(
      onStep(3, () => screen.getByText('settings.createField.submitNext')),
    );

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/app/home');
    });
    expect(loadGardenPickerFields).toHaveBeenCalledWith(true);
  });

  it('logs out from the first-garden screen', async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    render(<CreateFieldScreen />);
    fireEvent.press(onStep(3, () => screen.getByText('settings.logout')));
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
      fireEvent.press(
        onStep(2, () => screen.getByText(`settings.fieldTypes.${type}`)),
      );
      expect(
        onStep(2, () => screen.getByText('settings.createField.boundary.draw')),
      ).toBeTruthy();
    }
  });
  it('converts manually entered hectares to square metres', async () => {
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      onStep(0, () =>
        screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      ),
      'New field',
    );
    fireEvent.press(
      onStep(2, () => screen.getByText('settings.createField.areaUnits.ha')),
    );
    fireEvent.changeText(
      onStep(2, () =>
        screen.getByPlaceholderText('settings.createField.sizePlaceholder'),
      ),
      '2,5',
    );
    fireEvent.press(
      onStep(3, () => screen.getByText('settings.createField.submitNext')),
    );
    await waitFor(() =>
      expect(mockedCreateField).toHaveBeenCalledWith(
        expect.objectContaining({ size_m2: 25000 }),
      ),
    );
  });
  it('calculates a boundary area, fills its address and submits its corners', async () => {
    render(<CreateFieldScreen />);
    fireEvent.changeText(
      onStep(0, () =>
        screen.getByPlaceholderText('settings.createField.namePlaceholder'),
      ),
      'New field',
    );
    fireEvent.press(
      onStep(2, () => screen.getByText('settings.fieldTypes.open_field')),
    );
    fireEvent.press(
      onStep(2, () => screen.getByText('settings.createField.boundary.draw')),
    );
    expect(
      screen.getByText('settings.createField.boundary.confirm'),
    ).toBeDisabled();
    for (let i = 0; i < 4; i++)
      fireEvent.press(screen.getByText('Add test corner'));
    fireEvent.press(screen.getByText('settings.createField.boundary.confirm'));
    await waitFor(() =>
      expect(
        onStep(1, () => screen.getByDisplayValue('Field road')),
      ).toBeTruthy(),
    );
    expect(
      onStep(2, () =>
        screen.getByPlaceholderText('settings.createField.sizePlaceholder'),
      ),
    ).toHaveProp('editable', false);
    fireEvent.press(
      onStep(2, () => screen.getByText('settings.createField.areaUnits.ha')),
    );
    fireEvent.press(
      onStep(3, () => screen.getByText('settings.createField.submitNext')),
    );
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
