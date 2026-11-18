import { QueryClient } from '@tanstack/react-query';

/** How long cached data is kept (in memory and on the phone). */
export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Single cache shared by every screen of the app.
 *
 * Screens show the cached copy straight away and the query refreshes it in
 * the background, so changing page never waits for the server. Each query
 * sets its own `staleTime` (see services/queries.ts) depending on how fresh
 * that data has to be.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: CACHE_MAX_AGE_MS,
      // Same as before the cache existed: a failed request is not retried
      // automatically, the screens keep their own "retry" buttons.
      retry: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});
