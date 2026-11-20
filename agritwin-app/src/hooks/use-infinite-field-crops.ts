import { useCallback, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { getAuth } from '@/services/auth';
import { getFieldCrops, type FieldCrop } from '@/services/api_fieldCrops';
import { NOT_AUTHENTICATED } from '@/services/queries';
import { queryClient } from '@/services/queryClient';
import { queryKeys } from '@/services/queryKeys';

const PAGE_SIZE = 20;

/** Paginated crop list for the crops screen. */
export function useInfiniteFieldCrops(fieldId: number | null) {
  const query = useInfiniteQuery(
    {
      queryKey: [
        ...queryKeys.fieldCrops(fieldId ?? -1),
        'infinite',
        PAGE_SIZE,
      ],
      enabled: fieldId != null && Number.isFinite(fieldId),
      initialPageParam: 0,
      queryFn: async ({ pageParam }) => {
        const auth = await getAuth();
        if (!auth?.token) throw new Error(NOT_AUTHENTICATED);

        return getFieldCrops(pageParam, PAGE_SIZE, auth.token, {
          field_id: fieldId!,
        });
      },
      getNextPageParam: (lastPage, pages) =>
        lastPage.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE,
      staleTime: 30_000,
    },
    queryClient,
  );

  const loadingNextPage = useRef(false);
  const loadMore = useCallback(async () => {
    if (
      loadingNextPage.current ||
      !query.hasNextPage ||
      query.isFetchingNextPage
    ) {
      return;
    }

    loadingNextPage.current = true;
    try {
      await query.fetchNextPage();
    } finally {
      loadingNextPage.current = false;
    }
  }, [query.fetchNextPage, query.hasNextPage, query.isFetchingNextPage]);

  const data: FieldCrop[] = query.data?.pages.flat() ?? [];
  const loggedOut =
    query.error instanceof Error && query.error.message === NOT_AUTHENTICATED;

  if (!fieldId || loggedOut) {
    return {
      status: 'success' as const,
      data: [] as FieldCrop[],
      retry: query.refetch,
      loadMore,
      hasMore: false,
      loadingMore: false,
    };
  }

  if (data.length > 0 || query.isSuccess) {
    return {
      status: 'success' as const,
      data,
      retry: query.refetch,
      loadMore,
      hasMore: query.hasNextPage ?? false,
      loadingMore: query.isFetchingNextPage,
    };
  }

  if (query.isError && !query.isFetching) {
    return {
      status: 'error' as const,
      data,
      error:
        query.error instanceof Error
          ? query.error.message
          : 'Error carregant els cultius',
      retry: query.refetch,
      loadMore,
      hasMore: false,
      loadingMore: false,
    };
  }

  return {
    status: 'loading' as const,
    data,
    retry: query.refetch,
    loadMore,
    hasMore: false,
    loadingMore: false,
  };
}
