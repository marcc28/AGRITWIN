import React from 'react';

import {
  act,
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
  reverseGeocodeLocation,
} from '../../../src/services/api';
import { clearAuth, getAuth } from '../../../src/services/auth';
import {
  createFieldCrop,
  deleteFieldCrop,
  getFieldCrops,
  type FieldCrop,
} from '../../../src/services/api_fieldCrops';
import { getCrops } from '../../../src/services/api_crops';
import { router } from 'expo-router';

jest.mock('react-i18next', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const mockUseLocalSearchParams = jest.fn(
  (): { id: string; addCrop?: string } => ({ id: '3' }),
);
const mockIsAuthError = jest.fn((_error?: unknown) => false);

jest.mock('../../../src/components/field-location/MapCanvas', () => {
  const { View, Text, Pressable } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return function MockMap({
    boundary = [],
    onBoundaryChange,
    readOnly,
  }: {
    boundary?: { lat: number; lon: number }[];
    onBoundaryChange?: (p: { lat: number; lon: number }[]) => void;
    readOnly?: boolean;
  }) {
    const ring = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 0.001 },
      { lat: 0.001, lon: 0.001 },
      { lat: 0.001, lon: 0 },
    ];
    return (
      <View>
        <Text>Stored boundary: {boundary.length}</Text>
        <Pressable
          disabled={readOnly}
          onPress={() =>
            onBoundaryChange?.([...boundary, ring[boundary.length % 4]])
          }
        >
          <Text>Add boundary corner</Text>
        </Pressable>
      </View>
    );
  };
});

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('../../../src/services/api', () => ({
  getField: jest.fn(),
  reverseGeocodeLocation: jest.fn(),
  updateField: jest.fn(),
  createDevice: jest.fn(),
  updateDevice: jest.fn(),
  deleteDevice: jest.fn(),
  isAuthError: (error?: unknown) => mockIsAuthError(error),
}));

jest.mock('../../../src/services/auth', () => ({
  clearAuth: jest.fn(),
  getAuth: jest.fn(async () => ({ token: 'token' })),
}));

jest.mock('../../../src/services/api_fieldCrops', () => ({
  createFieldCrop: jest.fn(),
  deleteFieldCrop: jest.fn(),
  getFieldCrops: jest.fn(async () => []),
}));

jest.mock('../../../src/services/api_crops', () => ({
  getCrops: jest.fn(async () => []),
}));

jest.mock('../../../src/services/currentField', () => ({
  getCurrentField: jest.fn(async () => ({ id: 3, name: 'Hort' })),
  setCurrentField: jest.fn(),
}));

jest.mock('../../../src/services/fieldPhoto', () => ({
  getFieldPhotoIndex: jest.fn(async () => 1),
  setFieldPhotoIndex: jest.fn(),
}));

jest.mock('../../../src/components/DateField', () => ({
  DateField: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  }) => {
    const React = jest.requireActual<typeof import('react')>('react');
    const { TextInput } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return React.createElement(TextInput, {
      value,
      onChangeText: onChange,
      placeholder,
      accessibilityLabel: placeholder,
    });
  },
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
const mockedGetFieldCrops = getFieldCrops as jest.MockedFunction<
  typeof getFieldCrops
>;
const mockedDeleteFieldCrop = deleteFieldCrop as jest.MockedFunction<
  typeof deleteFieldCrop
>;
const mockedCreateFieldCrop = createFieldCrop as jest.MockedFunction<
  typeof createFieldCrop
>;
const mockedGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockedGetCrops = getCrops as jest.MockedFunction<typeof getCrops>;

const fieldCrop: FieldCrop = {
  id: 21,
  field_id: 3,
  crop_id: 4,
  crop_name: 'Ceba',
  status: 'planted',
};

async function waitForCropForm() {
  await waitFor(
    () => {
      expect(screen.getByDisplayValue('Hort')).toBeTruthy();
      expect(screen.getByText('settings.manageCrops.cropType')).toBeTruthy();
    },
    { timeout: 10000 },
  );
}

describe('EditFieldScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: '3' });
    mockIsAuthError.mockReturnValue(false);
    jest.mocked(reverseGeocodeLocation).mockResolvedValue({
      lat: 0.0005,
      lon: 0.0005,
      label: 'Updated field address',
    });
    mockedGetAuth.mockResolvedValue({
      token: 'token',
      refreshToken: null,
      username: 'ainhoa',
    });
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
    mockedGetFieldCrops.mockResolvedValue([]);
    mockedGetCrops.mockResolvedValue([
      {
        id: 4,
        name: 'Ceba',
        scientific_name: 'Allium cepa',
        category: 'vegetable',
      },
      {
        id: 5,
        name: 'Tomàquet',
        scientific_name: 'Solanum lycopersicum',
        category: 'vegetable',
      },
    ]);
  });

  it('loads the garden to edit', async () => {
    render(<EditFieldScreen />);

    await waitFor(
      () => {
        expect(screen.getByDisplayValue('Hort')).toBeTruthy();
      },
      { timeout: 10000 },
    );
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
    fireEvent.press(screen.getAllByText('settings.cancel')[0]);
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

  it('removes an existing field crop', async () => {
    mockedGetFieldCrops.mockResolvedValue([fieldCrop]);
    mockedDeleteFieldCrop.mockResolvedValue(undefined);

    render(<EditFieldScreen />);
    await waitFor(() => {
      expect(screen.getByText('Ceba')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('settings.manageCrops.removeCrop'));

    await waitFor(() => {
      expect(mockedDeleteFieldCrop).toHaveBeenCalledWith(21, 'token');
    });
  });

  it('adds a selected crop with dates and trimmed notes', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: '3', addCrop: 'true' });
    mockedCreateFieldCrop.mockResolvedValue({
      ...fieldCrop,
      id: 50,
      crop_name: 'Tomàquet',
    });
    render(<EditFieldScreen />);
    await waitForCropForm();

    fireEvent.press(screen.getByText('settings.manageCrops.selectCrop'));
    fireEvent.press(screen.getByText('Tomàquet'));
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.manageCrops.notesPlaceholder'),
      '  Reg setmanal  ',
    );
    fireEvent.press(screen.getByText('settings.manageCrops.saveCrop'));

    await waitFor(() => {
      expect(mockedCreateFieldCrop).toHaveBeenCalledWith(
        {
          field_id: 3,
          crop_id: 5,
          planted_at: null,
          expected_harvest_at: null,
          status: 'planted',
          notes: 'Reg setmanal',
        },
        'token',
      );
    });
  }, 20000);

  it('rejects invalid crop dates and harvests before planting', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: '3', addCrop: 'true' });
    render(<EditFieldScreen />);
    await waitForCropForm();
    fireEvent.press(screen.getByText('settings.manageCrops.selectCrop'));
    fireEvent.press(screen.getByText('Tomàquet'));
    const dates = screen.getAllByLabelText('settings.manageCrops.selectDate');
    fireEvent.changeText(dates[0], '2026-02-30');
    fireEvent.press(screen.getByText('settings.manageCrops.saveCrop'));
    expect(
      screen.getByText('settings.manageCrops.errors.invalidDate'),
    ).toBeTruthy();
    expect(mockedCreateFieldCrop).not.toHaveBeenCalled();

    fireEvent.changeText(dates[0], '30/02/2026');
    fireEvent.press(screen.getByText('settings.manageCrops.saveCrop'));
    expect(
      screen.getByText('settings.manageCrops.errors.invalidDate'),
    ).toBeTruthy();

    fireEvent.changeText(dates[0], '2026-04-01');
    fireEvent.changeText(dates[1], '2026-03-31');
    fireEvent.press(screen.getByText('settings.manageCrops.saveCrop'));
    expect(
      screen.getByText('settings.manageCrops.errors.harvestBeforePlanting'),
    ).toBeTruthy();
    expect(mockedCreateFieldCrop).not.toHaveBeenCalled();
  });

  it('loads the next crop page from the selector', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: '3', addCrop: 'true' });
    mockedGetCrops
      .mockResolvedValueOnce(
        Array.from({ length: 50 }, (_, index) => ({
          id: index + 1,
          name: `Crop ${index + 1}`,
          scientific_name: '',
          category: 'cereal',
        })),
      )
      .mockResolvedValueOnce([
        {
          id: 100,
          name: 'Triticale',
          scientific_name: 'x Triticosecale',
          category: 'cereal',
        },
      ]);
    render(<EditFieldScreen />);
    await waitForCropForm();
    fireEvent.press(screen.getByText('settings.manageCrops.selectCrop'));
    const cropList = screen.getByTestId('crop-selector-list');
    await act(async () => cropList.props.onEndReached());
    await waitFor(() =>
      expect(mockedGetCrops).toHaveBeenCalledWith(50, 50, 'token'),
    );
    expect(await screen.findByText('Triticale')).toBeTruthy();
  });

  it('shows an error when the next crop page cannot be loaded', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: '3', addCrop: 'true' });
    mockedGetCrops
      .mockResolvedValueOnce(
        Array.from({ length: 50 }, (_, index) => ({
          id: index + 1,
          name: `Crop ${index + 1}`,
          scientific_name: '',
          category: 'cereal',
        })),
      )
      .mockRejectedValueOnce(new Error('catalog unavailable'));
    render(<EditFieldScreen />);
    await waitForCropForm();
    fireEvent.press(screen.getByText('settings.manageCrops.selectCrop'));
    const cropList = screen.getByTestId('crop-selector-list');
    await act(async () => cropList.props.onEndReached());
    await waitFor(() =>
      expect(screen.getByText('catalog unavailable')).toBeTruthy(),
    );
  });

  it('shows auth failures while loading and adding a crop', async () => {
    mockedGetAuth.mockResolvedValueOnce(null);
    const loadingView = render(<EditFieldScreen />);
    await waitFor(() =>
      expect(
        screen.getByText('No s’ha trobat el token d’autenticació'),
      ).toBeTruthy(),
    );
    expect(mockedGetCrops).not.toHaveBeenCalled();
    loadingView.unmount();

    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: '3', addCrop: 'true' });
    mockedGetField.mockResolvedValue({
      id: 3,
      name: 'Hort',
      location: null,
      field_type: null,
      soil_type: null,
      size_m2: null,
      device_count: 0,
      devices: [],
    });
    mockedGetCrops.mockResolvedValue([
      { id: 5, name: 'Tomàquet', scientific_name: '', category: 'vegetable' },
    ]);
    mockedGetFieldCrops.mockResolvedValue([]);
    render(<EditFieldScreen />);
    await waitForCropForm();
    fireEvent.press(screen.getByText('settings.manageCrops.selectCrop'));
    fireEvent.press(screen.getByText('Tomàquet'));
    mockedGetAuth.mockResolvedValueOnce(null);
    fireEvent.press(screen.getByText('settings.manageCrops.saveCrop'));
    await waitFor(() =>
      expect(screen.getByText('No s’ha trobat el token')).toBeTruthy(),
    );
  });

  it('shows crop add and removal errors', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: '3', addCrop: 'true' });
    mockedGetFieldCrops.mockResolvedValue([fieldCrop]);
    mockedCreateFieldCrop.mockRejectedValueOnce(new Error('add unavailable'));
    mockedDeleteFieldCrop.mockRejectedValueOnce(
      new Error('remove unavailable'),
    );
    render(<EditFieldScreen />);
    await waitForCropForm();

    fireEvent.press(screen.getByText('settings.manageCrops.selectCrop'));
    fireEvent.press(screen.getByText('Tomàquet'));
    fireEvent.press(screen.getByText('settings.manageCrops.saveCrop'));
    await waitFor(() =>
      expect(screen.getByText('add unavailable')).toBeTruthy(),
    );

    fireEvent.press(screen.getByLabelText('settings.manageCrops.removeCrop'));
    await waitFor(() =>
      expect(screen.getByText('remove unavailable')).toBeTruthy(),
    );
  });

  it('closes the crop picker and form, then reopens crop entry', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: '3', addCrop: 'true' });
    render(<EditFieldScreen />);
    await waitForCropForm();
    fireEvent.press(screen.getByText('settings.manageCrops.selectCrop'));
    const modal = screen.getByTestId('crop-selector-modal');
    await act(async () => modal.props.onRequestClose());

    fireEvent.press(screen.getByText('settings.manageCrops.selectCrop'));
    fireEvent.press(screen.getByLabelText('settings.cancel'));
    expect(screen.getByText('settings.manageCrops.selectCrop')).toBeTruthy();

    fireEvent.press(screen.getAllByText('settings.cancel')[0]);
    fireEvent.press(screen.getByText('settings.manageCrops.addCrop'));
    expect(screen.getByText('settings.manageCrops.cropType')).toBeTruthy();
  });

  it('shows a missing-auth error when removing a crop', async () => {
    mockedGetFieldCrops.mockResolvedValue([fieldCrop]);
    render(<EditFieldScreen />);
    await waitFor(() => expect(screen.getByText('Ceba')).toBeTruthy());
    mockedGetAuth.mockResolvedValueOnce(null);
    fireEvent.press(screen.getByLabelText('settings.manageCrops.removeCrop'));
    await waitFor(() =>
      expect(screen.getByText('No s’ha trobat el token')).toBeTruthy(),
    );
    expect(mockedDeleteFieldCrop).not.toHaveBeenCalled();
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

describe('Editing field geometry', () => {
  const border = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: 0.001 },
    { lat: 0.001, lon: 0.001 },
    { lat: 0.001, lon: 0 },
  ];
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: '3' });
    mockIsAuthError.mockReturnValue(false);
    mockedGetField.mockResolvedValue({
      id: 3,
      name: 'Field',
      location: 'Field road',
      field_type: 'open_field',
      soil_type: 'loam',
      size_m2: 12364.35,
      boundary: border,
      excluded_zones: [],
      devices: [],
      device_count: 0,
    });
    mockedGetFieldCrops.mockResolvedValue([]);
    mockedGetCrops.mockResolvedValue([]);
    jest.mocked(reverseGeocodeLocation).mockResolvedValue({
      lat: 0.0005,
      lon: 0.0005,
      label: 'Updated field address',
    });
    mockedUpdateField.mockResolvedValue({
      id: 3,
      name: 'Field',
      location: 'Field road',
      field_type: 'open_field',
      soil_type: 'loam',
      size_m2: 12364.35,
      device_count: 0,
    });
  });
  it('changes display units and saves the canonical area with its boundary', async () => {
    render(<EditFieldScreen />);
    await screen.findByDisplayValue('12364.35');
    fireEvent.press(screen.getByText('settings.createField.areaUnits.ha'));
    expect(screen.getByDisplayValue('1.236435')).toHaveProp('editable', false);
    fireEvent.press(screen.getByText('settings.accept'));
    await waitFor(() =>
      expect(mockedUpdateField).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          size_m2: 12364.35,
          boundary: border,
          excluded_zones: [],
        }),
      ),
    );
  });
  it('displays the stored boundary without permitting edits in view mode', async () => {
    render(<EditFieldScreen />);
    await screen.findByDisplayValue('Field');
    fireEvent.press(screen.getByText('settings.createField.boundary.view'));
    expect(screen.getByText('Stored boundary: 4')).toBeTruthy();
    expect(
      screen.queryByText('settings.createField.boundary.confirm'),
    ).toBeNull();
    fireEvent.press(screen.getByText('settings.createField.boundary.close'));
    expect(mockedUpdateField).not.toHaveBeenCalled();
  });
  it('can cancel a redraw without losing the saved area', async () => {
    render(<EditFieldScreen />);
    await screen.findByDisplayValue('12364.35');
    fireEvent.press(screen.getByText('settings.createField.boundary.redraw'));
    expect(screen.getByText('Stored boundary: 0')).toBeTruthy();
    fireEvent.press(screen.getByText('Add boundary corner'));
    fireEvent.press(screen.getByText('settings.createField.map.cancel'));
    expect(screen.getByDisplayValue('12364.35')).toBeTruthy();
    expect(mockedUpdateField).not.toHaveBeenCalled();
  });
  it('removes the old area when switching to manual entry', async () => {
    render(<EditFieldScreen />);
    await screen.findByDisplayValue('12364.35');
    fireEvent.press(screen.getByText('settings.createField.boundary.remove'));
    const area = screen.getByLabelText('settings.createField.areaLabel');
    expect(area).toHaveProp('editable', true);
    expect(area).toHaveProp('value', '');
    fireEvent.changeText(area, '25');
    fireEvent.press(screen.getByText('settings.accept'));
    await waitFor(() =>
      expect(mockedUpdateField).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          size_m2: 25,
          boundary: null,
          excluded_zones: [],
        }),
      ),
    );
  });
  it('replaces a boundary only after a valid outline is confirmed', async () => {
    render(<EditFieldScreen />);
    await screen.findByDisplayValue('12364.35');
    fireEvent.press(screen.getByText('settings.createField.boundary.redraw'));
    for (let i = 0; i < 3; i++)
      fireEvent.press(screen.getByText('Add boundary corner'));
    fireEvent.press(screen.getByText('settings.createField.boundary.confirm'));
    await screen.findByDisplayValue('Updated field address');
    fireEvent.press(screen.getByText('settings.accept'));
    await waitFor(() =>
      expect(mockedUpdateField).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          boundary: border.slice(0, 3),
          size_m2: 6182.17,
        }),
      ),
    );
  });
});
