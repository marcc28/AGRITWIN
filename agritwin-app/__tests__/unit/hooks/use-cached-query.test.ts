import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  useCachedQuery,
  useRefreshOnFocus,
  useRetry,
} from '@/hooks/use-cached-query';

let mockFocusCount = 0;

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(callback, [callback, mockFocusCount]);
  },
}));

function focusAgain(rerender: (props: object) => void) {
  mockFocusCount += 1;
  rerender({});
}

describe('use-cached-query', () => {
  beforeEach(() => {
    mockFocusCount = 0;
  });

  it('reads from the shared cache without a provider', async () => {
    const queryFn = jest.fn().mockResolvedValue('value');

    const { result } = renderHook(() =>
      useCachedQuery({ queryKey: ['test', 'value'], queryFn }),
    );

    await waitFor(() => expect(result.current.data).toBe('value'));
  });

  it('refreshes stale data when the screen gets focus again', () => {
    const refetch = jest.fn();
    const { rerender } = renderHook(() =>
      useRefreshOnFocus({ isStale: true, refetch }),
    );

    expect(refetch).not.toHaveBeenCalled();
    focusAgain(rerender);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps fresh data unless asked to refresh always', () => {
    const fresh = jest.fn();
    const always = jest.fn();
    const { rerender } = renderHook(() => {
      useRefreshOnFocus({ isStale: false, refetch: fresh });
      useRefreshOnFocus({ isStale: false, refetch: always }, true, 'always');
    });

    focusAgain(rerender);

    expect(fresh).not.toHaveBeenCalled();
    expect(always).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled', () => {
    const refetch = jest.fn();
    const { rerender } = renderHook(() =>
      useRefreshOnFocus({ isStale: true, refetch }, false),
    );

    focusAgain(rerender);

    expect(refetch).not.toHaveBeenCalled();
  });

  it('reports retrying until the new request ends, even if it fails', async () => {
    let finish: () => void = () => undefined;
    const refetch = jest.fn(
      () =>
        new Promise<never>((_resolve, reject) => {
          finish = () => reject(new Error('offline'));
        }),
    );

    const { result } = renderHook(() => useRetry(refetch));

    act(() => result.current.retry());
    expect(result.current.retrying).toBe(true);

    await act(async () => finish());
    expect(result.current.retrying).toBe(false);
  });
});
