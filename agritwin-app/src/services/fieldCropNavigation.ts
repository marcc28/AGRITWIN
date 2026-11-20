type FieldReference = { id: string | number } | null | undefined;

type AddCropRoute = {
  pathname: '/editar_crops';
  params: { id: string };
};

type Navigate = (route: AddCropRoute) => void;

export function createAddCropHandler(
  field: FieldReference,
  navigate: Navigate,
): () => void {
  if (!field) return () => undefined;

  const route: AddCropRoute = {
    pathname: '/editar_crops',
    params: { id: String(field.id) },
  };
  return () => navigate(route);
}
