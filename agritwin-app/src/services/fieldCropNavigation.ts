type FieldReference = { id: string | number } | null | undefined;

type AddCropRoute = {
  pathname: '/edit-field';
  params: { id: string; addCrop: 'true' };
};

type Navigate = (route: AddCropRoute) => void;

export function createAddCropHandler(
  field: FieldReference,
  navigate: Navigate,
): () => void {
  if (!field) return () => undefined;

  const route: AddCropRoute = {
    pathname: '/edit-field',
    params: { id: String(field.id), addCrop: 'true' },
  };
  return () => navigate(route);
}
