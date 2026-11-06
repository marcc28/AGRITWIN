import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useFieldRecommendations } from '@/hooks/use-field-recommendations';
import {
  getFieldRecommendations,
  type Recommendation,
} from '@/services/api_recommendations';
import { getAuth } from '@/services/auth';

jest.mock('@/services/api_recommendations', () => ({
  getFieldRecommendations: jest.fn(),
}));

jest.mock('@/services/auth', () => ({
  getAuth: jest.fn(),
}));

const mockedGetRecommendations = getFieldRecommendations as jest.MockedFunction<
  typeof getFieldRecommendations
>;
const mockedGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;

const recommendation = {
  id: 'rec-1',
  field_id: 4,
} as Recommendation;

describe('useFieldRecommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockResolvedValue({ token: 'user-token' } as Awaited<
      ReturnType<typeof getAuth>
    >);
  });

  it('does not request recommendations when there is no field', async () => {
    const { result } = renderHook(() => useFieldRecommendations(null));

    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'success',
        data: [],
        retry: expect.any(Function),
      });
    });
    expect(mockedGetAuth).not.toHaveBeenCalled();
    expect(mockedGetRecommendations).not.toHaveBeenCalled();
  });

  it('loads recommendations with the current auth token', async () => {
    mockedGetRecommendations.mockResolvedValue([recommendation]);

    const { result } = renderHook(() => useFieldRecommendations(4));

    expect(result.current.status).toBe('loading');
    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'success',
        data: [recommendation],
      });
    });
    expect(mockedGetRecommendations).toHaveBeenCalledWith(4, 'user-token');
  });

  it('sets an error when there is no auth token', async () => {
    mockedGetAuth.mockResolvedValue(
      null as Awaited<ReturnType<typeof getAuth>>,
    );

    const { result } = renderHook(() => useFieldRecommendations(4));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(mockedGetRecommendations).not.toHaveBeenCalled();
  });

  it('sets an error when the request fails and retries successfully', async () => {
    mockedGetRecommendations
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce([recommendation]);

    const { result } = renderHook(() => useFieldRecommendations(4));

    await waitFor(() => expect(result.current.status).toBe('error'));

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current).toMatchObject({
      status: 'success',
      data: [recommendation],
    });
    expect(mockedGetRecommendations).toHaveBeenCalledTimes(2);
  });

  it('fetches again when the selected field changes', async () => {
    mockedGetRecommendations.mockResolvedValue([recommendation]);

    const { result, rerender } = renderHook(
      ({ fieldId }: { fieldId: number }) => useFieldRecommendations(fieldId),
      { initialProps: { fieldId: 4 } },
    );
    await waitFor(() => expect(result.current.status).toBe('success'));

    rerender({ fieldId: 5 });

    await waitFor(() => {
      expect(mockedGetRecommendations).toHaveBeenLastCalledWith(
        5,
        'user-token',
      );
    });
    expect(mockedGetRecommendations).toHaveBeenCalledTimes(2);
  });
});
