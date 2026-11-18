import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  useQuery,
  type DefaultError,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { queryClient } from '@/services/queryClient';

/**
 * `useQuery` bound to the app-wide cache.
 *
 * The client is passed explicitly so hooks and screens also work where no
 * provider is mounted (unit tests, isolated components).
 */
export function useCachedQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>) {
  return useQuery(options, queryClient);
}

/**
 * Refreshes stale data when the user comes back to a screen (stack screens
 * below the current one and tabs stay mounted, so a mount effect would not
 * run again). The first focus is skipped: the query already loads on mount.
 */
export function useRefreshOnFocus(
  query: { isStale: boolean; refetch: () => unknown },
  enabled = true,
  when: 'stale' | 'always' = 'stale',
) {
  const latest = useRef({ query, enabled, when });
  const firstFocus = useRef(true);

  useEffect(() => {
    latest.current = { query, enabled, when };
  });

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      const current = latest.current;
      if (
        current.enabled &&
        (current.when === 'always' || current.query.isStale)
      ) {
        void current.query.refetch();
      }
    }, []),
  );
}

/**
 * "Try again" for screens with a retry button: it reports `retrying`
 * straight away, so the screen shows its loading state at the same moment
 * the button is pressed.
 */
export function useRetry(refetch: () => Promise<unknown>) {
  const [retrying, setRetrying] = useState(false);

  const retry = useCallback((): void => {
    setRetrying(true);
    void refetch()
      .catch(() => undefined)
      .finally(() => setRetrying(false));
  }, [refetch]);

  return { retrying, retry };
}
