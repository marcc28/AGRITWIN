import { FIELD_TYPES } from '../constants/fieldOptions';
import { isMapPoint, type MapPoint } from '../components/field-location/types';
import { MAX_FIELD_AREA } from './fieldGeometry';

export const FIELD_FORM_STEPS = {
  name: 0,
  location: 1,
  fieldType: 2,
  area: 2,
} as const;
export type FieldFormKey = keyof typeof FIELD_FORM_STEPS;

export function fieldFormErrors(values: {
  name: string;
  location: string;
  point: MapPoint | null;
  fieldType: string;
  areaM2: number | null;
}): Partial<Record<FieldFormKey, string>> {
  const errors: Partial<Record<FieldFormKey, string>> = {};
  if (!values.name.trim()) errors.name = 'settings.errors.nameRequired';
  else if (values.name.trim().length > 100)
    errors.name = 'settings.fieldForm.errors.nameTooLong';
  if (!values.location.trim() && !isMapPoint(values.point))
    errors.location = 'settings.fieldForm.errors.locationRequired';
  if (!FIELD_TYPES.some((type) => type === values.fieldType))
    errors.fieldType = 'settings.fieldForm.errors.typeRequired';
  if (values.areaM2 === null)
    errors.area = 'settings.fieldForm.errors.areaRequired';
  else if (
    !Number.isFinite(values.areaM2) ||
    values.areaM2 < 0.01 ||
    values.areaM2 > MAX_FIELD_AREA
  )
    errors.area = 'settings.errors.sizeNumber';
  return errors;
}

export function firstFieldError(
  errors: Partial<Record<FieldFormKey, string>>,
  through: number,
) {
  return (Object.keys(FIELD_FORM_STEPS) as FieldFormKey[]).find(
    (key) => errors[key] && FIELD_FORM_STEPS[key] <= through,
  );
}
