import { queryClient } from './queryClient';
import { queryKeys } from './queryKeys';

/*
 * Called by the API functions right after the server accepts a change.
 * Cached copies touched by the change are marked as old: screens on display
 * reload them at once, the others reload them the next time they open.
 * This keeps the cache from ever showing data the user has just changed.
 */

function refresh(queryKey: readonly unknown[]) {
  void queryClient.invalidateQueries({ queryKey });
}

/** A garden was created, edited or got/lost a device. */
export function invalidateField(fieldId?: number) {
  refresh(queryKeys.fields);
  if (fieldId == null) {
    refresh(['field']);
  } else {
    refresh(queryKeys.field(fieldId));
  }
}

/** A garden was deleted: its cached data is dropped, the list refreshed. */
export function forgetField(fieldId: number) {
  queryClient.removeQueries({ queryKey: queryKeys.field(fieldId) });
  refresh(queryKeys.fields);
}

/** A crop was planted, changed or removed in a garden. */
export function invalidateFieldCrops(fieldId?: number) {
  void queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      queryKey[0] === 'field' &&
      (fieldId == null || queryKey[1] === fieldId) &&
      (queryKey[2] === 'crops' || queryKey[2] === 'recommendations'),
  });
}

/** The catalogue of crop types changed. */
export function invalidateCropCatalog() {
  refresh(queryKeys.cropCatalog);
}
