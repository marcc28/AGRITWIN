import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useFieldDevices } from '@/hooks/use-field-devices';
import { getField, type FieldDetail } from '@/services/api';

// Each time the test raises the counter, the screen "gets focus" again.
let mockFocusCount = 0;

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(callback, [callback, mockFocusCount]);
  },
}));

jest.mock('@/services/api', () => ({
  getField: jest.fn(),
}));

const mockedGetField = getField as jest.MockedFunction<typeof getField>;

function field(devices: FieldDetail['devices']): FieldDetail {
  return {
    id: 3,
    name: 'Hort',
    location: null,
    field_type: null,
    soil_type: null,
    size_m2: null,
    device_count: devices.length,
    devices,
  };
}

const online = { id: 'dev-1', battery_status: true };
const offline = { id: 'dev-2', battery_status: false };

describe('useFieldDevices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocusCount = 0;
  });

  it('loads the devices of the field with their status', async () => {
    mockedGetField.mockResolvedValue(field([online, offline]));

    const { result } = renderHook(() => useFieldDevices(3));
    expect(result.current.state).toEqual({ status: 'loading' });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: 'ready',
        devices: [online, offline],
      });
    });
    expect(mockedGetField).toHaveBeenCalledWith(3);
  });

  it('is ready with no devices when the field has none', async () => {
    mockedGetField.mockResolvedValue(field([]));

    const { result } = renderHook(() => useFieldDevices(3));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'ready', devices: [] });
    });
  });

  it('does not ask for anything without a field', () => {
    const { result } = renderHook(() => useFieldDevices(null));

    expect(mockedGetField).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('reports an error and can try again', async () => {
    mockedGetField.mockRejectedValueOnce(new Error('offline'));
    mockedGetField.mockResolvedValueOnce(field([online]));

    const { result } = renderHook(() => useFieldDevices(3));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'error' });
    });

    act(() => {
      result.current.retry();
    });
    expect(result.current.state).toEqual({ status: 'loading' });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: 'ready',
        devices: [online],
      });
    });
  });

  it('loads again when the field changes', async () => {
    mockedGetField.mockResolvedValueOnce(field([online]));
    mockedGetField.mockResolvedValueOnce(field([offline]));

    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useFieldDevices(id),
      { initialProps: { id: 3 } },
    );
    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: 'ready',
        devices: [online],
      });
    });

    rerender({ id: 4 });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: 'ready',
        devices: [offline],
      });
    });
    expect(mockedGetField).toHaveBeenLastCalledWith(4);
  });

  it('ignores an answer that arrives after the screen is gone', async () => {
    let resolve: (value: FieldDetail) => void = () => undefined;
    mockedGetField.mockReturnValue(
      new Promise<FieldDetail>((done) => {
        resolve = done;
      }),
    );

    const { result, unmount } = renderHook(() => useFieldDevices(3));
    unmount();
    await act(async () => {
      resolve(field([online]));
    });

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('ignores a failure that arrives after the screen is gone', async () => {
    let reject: (reason: Error) => void = () => undefined;
    mockedGetField.mockReturnValue(
      new Promise<FieldDetail>((_resolve, fail) => {
        reject = fail;
      }),
    );

    const { result, unmount } = renderHook(() => useFieldDevices(3));
    unmount();
    await act(async () => {
      reject(new Error('late'));
    });

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('refreshes the devices when the screen gets focus again', async () => {
    mockedGetField.mockResolvedValueOnce(field([online]));
    mockedGetField.mockResolvedValueOnce(field([online, offline]));

    const { result, rerender } = renderHook(() => useFieldDevices(3));
    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    mockFocusCount += 1;
    rerender({});

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: 'ready',
        devices: [online, offline],
      });
    });
  });

  it('keeps the devices on screen when only a refresh fails', async () => {
    mockedGetField.mockResolvedValueOnce(field([online]));
    mockedGetField.mockRejectedValueOnce(new Error('offline'));

    const { result, rerender } = renderHook(() => useFieldDevices(3));
    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    mockFocusCount += 1;
    rerender({});
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.state).toEqual({
      status: 'ready',
      devices: [online],
    });
  });
});
