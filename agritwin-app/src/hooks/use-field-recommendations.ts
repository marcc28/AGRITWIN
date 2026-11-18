import { useCallback } from 'react';

import { type Recommendation } from '@/services/api_recommendations';
import { recommendationsQuery } from '@/services/queries';
import { useCachedQuery } from './use-cached-query';

type RecommendationsState = {
  status: 'loading' | 'success' | 'error';
  data: Recommendation[];
};

/** AI crop recommendations of a field, shown from the cache when available. */
export function useFieldRecommendations(fieldId: string | number | null) {
  const { data, isError, isFetching, refetch } = useCachedQuery({
    ...recommendationsQuery(fieldId ?? -1),
    enabled: fieldId != null,
  });

  let state: RecommendationsState;
  if (fieldId == null) {
    state = { status: 'success', data: [] };
  } else if (data) {
    // A failed background refresh keeps the list already on screen.
    state = { status: 'success', data };
  } else if (isError && !isFetching) {
    state = { status: 'error', data: data ?? [] };
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
