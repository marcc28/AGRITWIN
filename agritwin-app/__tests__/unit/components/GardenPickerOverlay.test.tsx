import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import GardenPickerOverlay from '../../../src/components/GardenPickerOverlay';
import { setCurrentField } from '../../../src/services/currentField';
import { setGardenPicker } from '../../../src/services/gardenPicker';
import type { Field } from '../../../src/services/api';

jest.mock('../../../src/services/currentField', () => ({
  setCurrentField: jest.fn(async () => undefined),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function field(
  id: number,
  name: string,
  devicesOnline?: number,
  deviceCount = 0,
): Field {
  return {
    id,
    name,
    location: null,
    field_type: null,
    soil_type: null,
    size_m2: null,
    device_count: deviceCount,
    ...(devicesOnline == null ? {} : { devices_online: devicesOnline }),
  };
}

describe('GardenPickerOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setGardenPicker({ open: false, fields: [], currentId: null });
  });

  it('renders nothing when closed', () => {
    setGardenPicker({
      open: false,
      fields: [field(1, 'Hort'), field(2, 'Camp')],
      currentId: 1,
    });
    const { toJSON } = render(<GardenPickerOverlay />);
    expect(toJSON()).toBeNull();
  });

  it('hides the selector when only one garden exists', () => {
    setGardenPicker({ open: true, fields: [field(1, 'Hort')], currentId: 1 });
    expect(render(<GardenPickerOverlay />).toJSON()).toBeNull();
  });

  it('shows an Arduino dot on each garden from the cached list', () => {
    setGardenPicker({
      open: true,
      fields: [
        field(1, 'Hort', 2, 2),
        field(2, 'Camp', 0, 1),
      ],
      currentId: 1,
    });
    render(<GardenPickerOverlay />);

    expect(screen.getByTestId('device-health-ok')).toBeTruthy();
    expect(screen.getByTestId('device-health-down')).toBeTruthy();
  });

  it('shows an orange Arduino dot when only some boards are online', () => {
    setGardenPicker({
      open: true,
      fields: [field(1, 'Hort', 1, 2), field(2, 'Camp', 2, 2)],
      currentId: 1,
    });
    render(<GardenPickerOverlay />);

    expect(screen.getByTestId('device-health-partial')).toBeTruthy();
    expect(screen.getByLabelText('settings.deviceHealth.partial')).toBeTruthy();
  });

  it('hides the Arduino dot when devices_online is missing from cache', () => {
    setGardenPicker({
      open: true,
      fields: [field(1, 'Hort'), field(2, 'Camp')],
      currentId: 1,
    });
    render(<GardenPickerOverlay />);

    expect(screen.queryByTestId('device-health-ok')).toBeNull();
    expect(screen.queryByTestId('device-health-partial')).toBeNull();
    expect(screen.queryByTestId('device-health-down')).toBeNull();
  });

  it('lists gardens and selects one', async () => {
    setGardenPicker({
      open: true,
      fields: [field(1, 'Hort'), field(2, 'Camp')],
      currentId: 1,
    });
    render(<GardenPickerOverlay />);

    expect(screen.getByText('Hort')).toBeTruthy();
    fireEvent.press(screen.getByText('Camp'));
    await waitFor(() => {
      expect(setCurrentField).toHaveBeenCalledWith({ id: 2, name: 'Camp' });
    });
  });

  it('closes the selector from the backdrop', () => {
    setGardenPicker({
      open: true,
      fields: [field(1, 'Hort'), field(2, 'Camp')],
      currentId: 1,
    });
    render(<GardenPickerOverlay />);
    fireEvent.press(screen.getByTestId('garden-picker-backdrop'));
    expect(screen.queryByText('Hort')).toBeNull();
  });

  it('logs a selection save error', async () => {
    setGardenPicker({
      open: true,
      fields: [field(1, 'Hort'), field(2, 'Camp')],
      currentId: 1,
    });
    const log = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    (setCurrentField as jest.Mock).mockRejectedValueOnce(
      new Error('storage failed'),
    );
    render(<GardenPickerOverlay />);
    fireEvent.press(screen.getByText('Camp'));
    await waitFor(() =>
      expect(log).toHaveBeenCalledWith(
        'Error seleccionant el camp:',
        expect.any(Error),
      ),
    );
    log.mockRestore();
  });
});
