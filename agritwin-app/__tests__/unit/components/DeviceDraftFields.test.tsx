import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  DeviceDraftFields,
  emptyDeviceDraft,
  filledDevices,
  hasIncompleteDevices,
} from '../../../src/components/DeviceDraftFields';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('filledDevices', () => {
  it('keeps only drafts with an id', () => {
    expect(
      filledDevices([
        { key: '1', id: 'esp32_sim_01', brand: 'ESP32', serial: 'SN-1' },
        { key: '2', id: '  ', brand: 'Nope', serial: '' },
      ]),
    ).toEqual([
      {
        id: 'esp32_sim_01',
        brand: 'ESP32',
        serial_number: 'SN-1',
      },
    ]);
  });
});

describe('hasIncompleteDevices', () => {
  it('requires id, brand and serial on filled drafts', () => {
    expect(
      hasIncompleteDevices([
        { key: '1', id: 'esp32_sim_01', brand: 'ESP32', serial: '' },
      ]),
    ).toBe(true);
    expect(
      hasIncompleteDevices([
        { key: '1', id: 'esp32_sim_01', brand: 'ESP32', serial: 'SN-1' },
      ]),
    ).toBe(false);
  });

  it('ignores a fully empty draft', () => {
    expect(
      hasIncompleteDevices([{ key: '1', id: '', brand: '', serial: '' }]),
    ).toBe(false);
  });

  it('flags an existing device without brand or serial', () => {
    expect(
      hasIncompleteDevices([], [{ brand: '', serial_number: 'SN-1' }]),
    ).toBe(true);
    expect(
      hasIncompleteDevices([], [{ brand: 'ESP32', serial_number: 'SN-1' }]),
    ).toBe(false);
  });
});

describe('emptyDeviceDraft', () => {
  it('starts with empty fields', () => {
    const draft = emptyDeviceDraft();
    expect(draft.id).toBe('');
    expect(draft.brand).toBe('');
    expect(draft.serial).toBe('');
    expect(draft.key).toBeTruthy();
  });
});

describe('DeviceDraftFields', () => {
  it('can add, edit and remove a draft', () => {
    const onChange = jest.fn();
    const onLaterChange = jest.fn();
    const draft = {
      key: 'k1',
      id: '',
      brand: '',
      serial: '',
    };

    const { rerender } = render(
      <DeviceDraftFields
        later={false}
        onLaterChange={onLaterChange}
        drafts={[draft]}
        onChange={onChange}
        disabled={false}
      />,
    );

    fireEvent.changeText(
      screen.getByPlaceholderText('settings.createField.deviceIdPlaceholder'),
      'esp32_sim_01',
    );
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'esp32_sim_01' }),
    ]);

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
    fireEvent.press(screen.getByText('settings.createField.addAnother'));
    expect(onChange).toHaveBeenCalledWith([
      draft,
      expect.objectContaining({ id: '' }),
    ]);

    fireEvent.press(screen.getByText('settings.createField.removeDevice'));
    expect(onChange).toHaveBeenCalledWith([]);

    fireEvent.press(screen.getByText('settings.createField.configureLater'));
    expect(onLaterChange).toHaveBeenCalledWith(true);

    rerender(
      <DeviceDraftFields
        later
        onLaterChange={onLaterChange}
        drafts={[]}
        onChange={onChange}
        disabled={false}
      />,
    );
    expect(screen.getByText('settings.createField.arduinosHint')).toBeTruthy();
  });

  it('starts a draft when adding now with an empty list', () => {
    const onChange = jest.fn();
    const onLaterChange = jest.fn();
    render(
      <DeviceDraftFields
        later
        onLaterChange={onLaterChange}
        drafts={[]}
        onChange={onChange}
        disabled={false}
      />,
    );
    fireEvent.press(screen.getByText('settings.createField.addNow'));
    expect(onLaterChange).toHaveBeenCalledWith(false);
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: '', brand: '', serial: '' }),
    ]);
  });

  it('edits and removes an existing device in manage mode', () => {
    const onExistingChange = jest.fn();
    const onRemoveExisting = jest.fn();
    const onSave = jest.fn();

    render(
      <DeviceDraftFields
        mode="manage"
        later={false}
        onLaterChange={() => undefined}
        drafts={[]}
        onChange={jest.fn()}
        existing={[
          {
            id: 'dev-1',
            battery_status: true,
            brand: 'ESP32',
            serial_number: 'SN-1',
          },
        ]}
        onExistingChange={onExistingChange}
        onRemoveExisting={onRemoveExisting}
        onSave={onSave}
        disabled={false}
      />,
    );

    fireEvent.changeText(
      screen.getByPlaceholderText(
        'settings.createField.deviceBrandPlaceholder',
      ),
      'ESP32-S3',
    );
    expect(onExistingChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'dev-1', brand: 'ESP32-S3' }),
    ]);
    fireEvent.changeText(
      screen.getByPlaceholderText(
        'settings.createField.deviceSerialPlaceholder',
      ),
      'SN-9',
    );
    fireEvent.press(screen.getByText('settings.createField.removeDevice'));
    expect(onRemoveExisting).toHaveBeenCalledWith('dev-1');
    fireEvent.press(screen.getByText('settings.createField.saveDevices'));
    expect(onSave).toHaveBeenCalled();
  });
});
