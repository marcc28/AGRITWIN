import {
  getGardenPicker,
  setGardenPicker,
  subscribeGardenPicker,
} from '../../../src/services/gardenPicker';

describe('gardenPicker', () => {
  beforeEach(() => {
    setGardenPicker({ open: false, fields: [], currentId: null });
  });

  it('starts closed with no fields', () => {
    expect(getGardenPicker()).toEqual({
      open: false,
      fields: [],
      currentId: null,
    });
  });

  it('updates state and notifies subscribers', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeGardenPicker(listener);

    setGardenPicker({
      open: true,
      currentId: 3,
      fields: [
        {
          id: 3,
          name: 'Hort',
          location: null,
          field_type: null,
          soil_type: null,
          size_m2: null,
          device_count: 0,
        },
      ],
    });

    expect(getGardenPicker().open).toBe(true);
    expect(getGardenPicker().currentId).toBe(3);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
