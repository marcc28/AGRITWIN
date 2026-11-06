import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useFieldCrops } from '@/hooks/use-field-crops';
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
const crop = {
  id: 15,
  field_id: 7,
  crop_id: 3,
  crop_name: 'Tomàquet',
  status: 'planted',
} as FieldCrop;

describe('useFieldCrops', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockResolvedValue({ token: 'field-token' } as Awaited<
      ReturnType<typeof getAuth>
    >);
  });

  it('returns an empty list when the field id is null', async () => {
    const { result } = renderHook(() => useFieldCrops(null));

    await waitFor(() => {
      expect(result.current).toMatchObject({ status: 'success', data: [] });
    });
    expect(mockedGetFieldCrops).not.toHaveBeenCalled();
  });

  it('returns an empty list when there is no auth token', async () => {
    mockedGetAuth.mockResolvedValue(
      null as Awaited<ReturnType<typeof getAuth>>,
    );

    const { result } = renderHook(() => useFieldCrops(7));

    await waitFor(() => {
      expect(result.current).toMatchObject({ status: 'success', data: [] });
    });
    expect(mockedGetFieldCrops).not.toHaveBeenCalled();
  });

  it('loads crops for the selected field', async () => {
    mockedGetFieldCrops.mockResolvedValue([crop]);

    const { result } = renderHook(() => useFieldCrops(7));

    expect(result.current.status).toBe('loading');
    await waitFor(() => {
      expect(result.current).toMatchObject({ status: 'success', data: [crop] });
    });
    expect(mockedGetFieldCrops).toHaveBeenCalledWith(0, 100, 'field-token', {
      field_id: 7,
    });
  });

  it('shows API errors and retries', async () => {
    mockedGetFieldCrops
      .mockRejectedValueOnce(new Error('Crop list unavailable'))
      .mockResolvedValueOnce([crop]);
    const { result } = renderHook(() => useFieldCrops(7));

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'error',
        error: 'Crop list unavailable',
      });
    });

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current).toMatchObject({ status: 'success', data: [crop] });
    expect(mockedGetFieldCrops).toHaveBeenCalledTimes(2);
  });

  it('reloads when the field id changes', async () => {
    mockedGetFieldCrops.mockResolvedValue([crop]);
    const { result, rerender } = renderHook(
      ({ fieldId }: { fieldId: number }) => useFieldCrops(fieldId),
      { initialProps: { fieldId: 7 } },
    );

    await waitFor(() => expect(result.current.status).toBe('success'));
    rerender({ fieldId: 8 });

    await waitFor(() => {
      expect(mockedGetFieldCrops).toHaveBeenLastCalledWith(
        0,
        100,
        'field-token',
        {
          field_id: 8,
        },
      );
    });
    expect(mockedGetFieldCrops).toHaveBeenCalledTimes(2);
  });
});
