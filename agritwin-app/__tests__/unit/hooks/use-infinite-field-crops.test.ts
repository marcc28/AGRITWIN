import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useInfiniteFieldCrops } from '@/hooks/use-infinite-field-crops';
import { getFieldCrops, type FieldCrop } from '@/services/api_fieldCrops';
import { getAuth } from '@/services/auth';

jest.mock('@/services/api_fieldCrops', () => ({
  getFieldCrops: jest.fn(),
}));

jest.mock('@/services/auth', () => ({
  getAuth: jest.fn(),
}));

const mockedGetFieldCrops = getFieldCrops as jest.MockedFunction<
  typeof getFieldCrops
>;
const mockedGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;

function makeCrops(start: number, count: number): FieldCrop[] {
  return Array.from({ length: count }, (_, index) => ({
    id: start + index,
    field_id: 7,
    crop_id: start + index,
    crop_name: `Crop ${start + index}`,
    field_name: 'Field 7',
    status: 'planted',
  }));
}

describe('useInfiniteFieldCrops', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockResolvedValue({
      token: 'field-token',
      refreshToken: null,
      username: 'cinta',
    });
  });

  it('does not request crops when there is no field selected', async () => {
    const { result } = renderHook(() => useInfiniteFieldCrops(null));

    expect(result.current).toMatchObject({ status: 'success', data: [] });
    expect(mockedGetFieldCrops).not.toHaveBeenCalled();
  });

  it('loads the first page and reports whether more pages are available', async () => {
    const firstPage = makeCrops(1, 20);
    mockedGetFieldCrops.mockResolvedValue(firstPage);

    const { result } = renderHook(() => useInfiniteFieldCrops(7));

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'success',
        data: firstPage,
        hasMore: true,
      });
    });
    expect(mockedGetFieldCrops).toHaveBeenCalledWith(0, 20, 'field-token', {
      field_id: 7,
    });
  });

  it('appends the next page and stops when the last page is short', async () => {
    const firstPage = makeCrops(1, 20);
    const secondPage = makeCrops(21, 2);
    mockedGetFieldCrops
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    const { result } = renderHook(() => useInfiniteFieldCrops(7));
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.data).toEqual([...firstPage, ...secondPage]);
    expect(result.current.hasMore).toBe(false);
    expect(mockedGetFieldCrops).toHaveBeenLastCalledWith(
      20,
      20,
      'field-token',
      { field_id: 7 },
    );
  });

  it('does not make a request without an auth token', async () => {
    mockedGetAuth.mockResolvedValue(null);

    const { result } = renderHook(() => useInfiniteFieldCrops(7));

    await waitFor(() => {
      expect(result.current).toMatchObject({ status: 'success', data: [] });
    });
    expect(mockedGetFieldCrops).not.toHaveBeenCalled();
  });

  it('shows the first-page error and retries successfully', async () => {
    const crops = makeCrops(1, 1);
    mockedGetFieldCrops
      .mockRejectedValueOnce(new Error('Crop list unavailable'))
      .mockResolvedValueOnce(crops);

    const { result } = renderHook(() => useInfiniteFieldCrops(7));
    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'error',
        error: 'Crop list unavailable',
      });
    });

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current).toMatchObject({ status: 'success', data: crops });
  });

  it('uses a fallback message for non-Error failures', async () => {
    mockedGetFieldCrops.mockRejectedValue('offline');

    const { result } = renderHook(() => useInfiniteFieldCrops(7));

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'error',
        error: 'Error carregant els cultius',
      });
    });
  });
});
