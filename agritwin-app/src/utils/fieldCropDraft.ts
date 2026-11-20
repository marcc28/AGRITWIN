import type { FieldCropCreate } from '@/services/api_fieldCrops';

export type FieldCropDraft = {
  cropId: string;
  plantedAt: string;
  expectedHarvestAt: string;
  notes: string;
};

export type CropDateError = 'invalidDate' | 'harvestBeforePlanting';

function isValidDate(value: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function validateFieldCropDates(
  plantedAt: string,
  expectedHarvestAt: string,
): CropDateError | null {
  if (!isValidDate(plantedAt) || !isValidDate(expectedHarvestAt)) {
    return 'invalidDate';
  }
  if (plantedAt && expectedHarvestAt && expectedHarvestAt < plantedAt) {
    return 'harvestBeforePlanting';
  }
  return null;
}

export function createFieldCropDraft(
  fieldId: number,
  draft: FieldCropDraft,
): FieldCropCreate {
  return {
    field_id: fieldId,
    crop_id: Number(draft.cropId),
    planted_at: draft.plantedAt || null,
    expected_harvest_at: draft.expectedHarvestAt || null,
    status: 'planted',
    notes: draft.notes.trim() || null,
  };
}
