import {
  createFieldCropDraft,
  validateFieldCropDates,
} from '@/utils/fieldCropDraft';

describe('field crop draft helpers', () => {
  it('accepts optional or chronologically valid dates', () => {
    expect(validateFieldCropDates('', '')).toBeNull();
    expect(validateFieldCropDates('2026-02-28', '2026-03-01')).toBeNull();
  });

  it('rejects impossible dates and harvest before planting', () => {
    expect(validateFieldCropDates('2026-02-30', '')).toBe('invalidDate');
    expect(validateFieldCropDates('2026-04-01', '2026-03-31')).toBe(
      'harvestBeforePlanting',
    );
  });

  it('normalizes the form values for the create API', () => {
    expect(
      createFieldCropDraft(4, {
        cropId: '12',
        plantedAt: '',
        expectedHarvestAt: '2026-09-15',
        notes: '  rainy season  ',
      }),
    ).toEqual({
      field_id: 4,
      crop_id: 12,
      planted_at: null,
      expected_harvest_at: '2026-09-15',
      status: 'planted',
      notes: 'rainy season',
    });
  });
});
