import { type FieldDevice } from '@/services/api';
import { fieldDetailQuery } from '@/services/queries';
import {
  useCachedQuery,
  useRefreshOnFocus,
  useRetry,
} from './use-cached-query';

export type FieldDevicesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; devices: FieldDevice[] };

/**
 * Devices of a field with their status. The last known list is shown at
 * once from the cache and it loads again every time the screen comes back
 * into focus, so a board added or removed elsewhere shows up.
 */
export function useFieldDevices(fieldId: number | null) {
  const query = useCachedQuery({
    ...fieldDetailQuery(fieldId ?? -1),
    enabled: fieldId != null,
  });

  useRefreshOnFocus(query, fieldId != null, 'always');

  const { data, isError, isFetching, refetch } = query;
  const { retrying, retry: retryQuery } = useRetry(refetch);

  let state: FieldDevicesState;
  if (data) {
    // Keep what is already on screen if only a refresh fails.
    state = { status: 'ready', devices: data.devices };
  } else if (isError && !isFetching && !retrying) {
    state = { status: 'error' };
  } else {
    state = { status: 'loading' };
  }

  return { state, retry: retryQuery };
}
