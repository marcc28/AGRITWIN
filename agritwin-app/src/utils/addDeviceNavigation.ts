import { router } from 'expo-router';

/** The screen the user comes from, so "done" can take them back there. */
export type AddDeviceOrigin = 'field-detail' | 'edit-field' | 'home';

const ORIGINS: AddDeviceOrigin[] = ['field-detail', 'edit-field', 'home'];

/** Reads the `from` param of the route. Anything unknown means the field. */
export function parseOrigin(
  value: string | string[] | undefined,
): AddDeviceOrigin {
  const first = Array.isArray(value) ? value[0] : value;
  return ORIGINS.find((origin) => origin === first) ?? 'field-detail';
}

/** Leaves the "Add device" flow and goes back to where it was opened. */
export function leaveAddDevice(fieldId: number, origin: AddDeviceOrigin) {
  if (origin === 'home') {
    router.replace('/app/home');
    return;
  }
  if (origin === 'edit-field') {
    // Going back keeps what the user already typed in the form.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({
        pathname: '/edit-field',
        params: { id: String(fieldId) },
      });
    }
    return;
  }
  router.replace({
    pathname: '/field-detail',
    params: { id: String(fieldId) },
  });
}
