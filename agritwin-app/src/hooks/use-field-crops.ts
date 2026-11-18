import { useCallback } from 'react';

import { type FieldCrop } from '@/services/api_fieldCrops';
import { NOT_AUTHENTICATED, fieldCropsQuery } from '@/services/queries';
import { useCachedQuery } from './use-cached-query';

type State = {
  status: 'loading' | 'success' | 'error';
  data: FieldCrop[];
  error?: string;
};

/**
 * Crops planted in a field. The cached list is shown at once and refreshed
 * in the background; it is reloaded right after a crop is added or removed.
 */
export function useFieldCrops(fieldId: number | null) {
  const { data, error, isError, isFetching, refetch } = useCachedQuery({
    ...fieldCropsQuery(fieldId ?? -1),
    enabled: !!fieldId,
  });

  // Without a session there is simply nothing to list (as before the cache).
  const loggedOut =
    error instanceof Error && error.message === NOT_AUTHENTICATED;

  let state: State;
  if (!fieldId || loggedOut) {
    state = { status: 'success', data: [] };
  } else if (data) {
    // A failed background refresh keeps the list already on screen.
    state = { status: 'success', data };
  } else if (isError && !isFetching) {
    state = {
      status: 'error',
      data: data ?? [],
      error:
        error instanceof Error ? error.message : 'Error carregant els cultius',
    };
  } else {
    state = { status: 'loading', data: data ?? [] };
  }

  const retry = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    ...state,
    retry,
  };
}
