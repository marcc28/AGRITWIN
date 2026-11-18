import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { defaultShouldDehydrateQuery, type Query } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

import { CACHE_MAX_AGE_MS, queryClient } from './queryClient';

/** Change it when the shape of the cached data changes, to drop old copies. */
export const CACHE_BUSTER = 'agritwin-cache-v1';

const STORAGE_KEY = 'agritwin_query_cache';

/**
 * Saves the cache on the phone so that, when the app is opened again, every
 * screen can show the last known data at once while it is refreshed.
 * Only successful responses are saved; login tokens are never part of it
 * (they stay in the secure store).
 */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: STORAGE_KEY,
  throttleTime: 1000,
});

export function shouldPersistQuery(query: Query): boolean {
  return defaultShouldDehydrateQuery(query) && query.meta?.persist !== false;
}

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: queryPersister,
  maxAge: CACHE_MAX_AGE_MS,
  buster: CACHE_BUSTER,
  dehydrateOptions: {
    shouldDehydrateQuery: shouldPersistQuery,
  },
};

/**
 * Forgets every cached response, in memory and on the phone.
 * Used on logout and when another user logs in.
 */
export async function clearQueryCache(): Promise<void> {
  queryClient.cancelQueries().catch(() => undefined);
  queryClient.clear();
  try {
    await queryPersister.removeClient();
  } catch {
    // Nothing else to do: the cache in memory is already empty.
  }
}
