import {
  filledDevices,
  hasIncompleteDevices,
} from '../../../src/components/DeviceDraftFields';

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
});
