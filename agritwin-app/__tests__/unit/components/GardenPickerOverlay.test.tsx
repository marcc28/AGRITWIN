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

function field(id: number, name: string): Field {
  return {
    id,
    name,
    location: null,
    field_type: null,
    soil_type: null,
    size_m2: null,
    device_count: 0,
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
});
