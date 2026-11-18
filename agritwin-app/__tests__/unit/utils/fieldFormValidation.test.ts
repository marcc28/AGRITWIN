import {
  fieldFormErrors,
  firstFieldError,
} from '../../../src/utils/fieldFormValidation';

const valid = {
  name: 'Camp',
  location: 'Lleida',
  point: null,
  fieldType: 'open_field',
  areaM2: 2500,
};

describe('Required field data', () => {
  it('accepts manual locations and map coordinates as alternatives', () => {
    expect(fieldFormErrors(valid)).toEqual({});
    expect(
      fieldFormErrors({
        ...valid,
        location: '',
        point: { lat: 41.6, lon: 0.6 },
      }),
    ).toEqual({});
    expect(
      fieldFormErrors({ ...valid, location: ' ', point: null }).location,
    ).toBeDefined();
    expect(
      fieldFormErrors({ ...valid, location: '', point: { lat: NaN, lon: 0.6 } })
        .location,
    ).toBeDefined();
  });
  it.each([null, 0, -1, NaN, Infinity, 100000000])(
    'rejects absent or invalid area %s',
    (areaM2) => {
      expect(fieldFormErrors({ ...valid, areaM2 }).area).toBeDefined();
    },
  );
  it('requires an explicit valid type and a nonempty name', () => {
    expect(
      fieldFormErrors({ ...valid, fieldType: '' }).fieldType,
    ).toBeDefined();
    expect(
      fieldFormErrors({ ...valid, fieldType: 'invented' }).fieldType,
    ).toBeDefined();
    expect(fieldFormErrors({ ...valid, name: ' ' }).name).toBeDefined();
    expect(
      fieldFormErrors({ ...valid, name: 'a'.repeat(101) }).name,
    ).toBeDefined();
  });
  it('returns the first error only within completed steps', () => {
    const errors = fieldFormErrors({ ...valid, fieldType: '', areaM2: null });
    expect(firstFieldError(errors, 1)).toBeUndefined();
    expect(firstFieldError(errors, 2)).toBe('fieldType');
  });
});
