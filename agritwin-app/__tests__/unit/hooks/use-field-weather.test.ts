import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useFieldWeather } from '../../../src/hooks/use-field-weather';
import {
  getFieldWeather,
  WeatherRequestError,
  type FieldWeather,
} from '../../../src/services/api';

jest.mock('../../../src/services/api', () => {
  class MockWeatherRequestError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }

  return {
    getFieldWeather: jest.fn(),
    WeatherRequestError: MockWeatherRequestError,
  };
});

const mockedGetFieldWeather = getFieldWeather as jest.MockedFunction<
  typeof getFieldWeather
>;

const weather = {
  daily: [{ date: '2026-10-24' }],
} as unknown as FieldWeather;

describe('useFieldWeather', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has no field when the id is null', () => {
    const { result } = renderHook(() => useFieldWeather(null, 'ca'));

    expect(result.current.state).toEqual({ status: 'no-field' });
    expect(mockedGetFieldWeather).not.toHaveBeenCalled();
  });

  it('loads the weather of the field', async () => {
    mockedGetFieldWeather.mockResolvedValue(weather);

    const { result } = renderHook(() => useFieldWeather(1, 'ca'));

    expect(result.current.state).toEqual({ status: 'loading' });
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'ready', weather });
    });
    expect(mockedGetFieldWeather).toHaveBeenCalledWith(1, 'ca');
  });

  it('has no data when the forecast has no days', async () => {
    mockedGetFieldWeather.mockResolvedValue({
      daily: [],
    } as unknown as FieldWeather);

    const { result } = renderHook(() => useFieldWeather(1, 'ca'));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'no-data' });
    });
  });

  it.each(['Field has no location', 'Field not found', 'City not found'])(
    'has no location when the api answers %s',
    async (message) => {
      mockedGetFieldWeather.mockRejectedValue(
        new WeatherRequestError(message, 404),
      );

      const { result } = renderHook(() => useFieldWeather(1, 'ca'));

      await waitFor(() => {
        expect(result.current.state).toEqual({ status: 'no-location' });
      });
    },
  );

  it('has no data for any other not found', async () => {
    mockedGetFieldWeather.mockRejectedValue(
      new WeatherRequestError('No forecast', 404),
    );

    const { result } = renderHook(() => useFieldWeather(1, 'ca'));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'no-data' });
    });
  });

  it('fails when the api is not available', async () => {
    mockedGetFieldWeather.mockRejectedValue(
      new WeatherRequestError('Weather service unavailable', 503),
    );

    const { result } = renderHook(() => useFieldWeather(1, 'ca'));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'error' });
    });
  });

  it('fails when the request breaks', async () => {
    mockedGetFieldWeather.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFieldWeather(1, 'ca'));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'error' });
    });
  });

  it('loads again when retrying', async () => {
    mockedGetFieldWeather
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(weather);

    const { result } = renderHook(() => useFieldWeather(1, 'ca'));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'error' });
    });

    act(() => {
      result.current.retry();
    });

    expect(result.current.state).toEqual({ status: 'loading' });
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'ready', weather });
    });
    expect(mockedGetFieldWeather).toHaveBeenCalledTimes(2);
  });

  it('loads again when the field or the language change', async () => {
    mockedGetFieldWeather.mockResolvedValue(weather);

    const { result, rerender } = renderHook(
      ({ id, lang }: { id: number; lang: string }) => useFieldWeather(id, lang),
      { initialProps: { id: 1, lang: 'ca' } },
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    rerender({ id: 2, lang: 'ca' });
    expect(result.current.state).toEqual({ status: 'loading' });
    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    rerender({ id: 2, lang: 'es' });
    await waitFor(() => {
      expect(mockedGetFieldWeather).toHaveBeenLastCalledWith(2, 'es');
    });
  });

  it('ignores an answer that arrives after the field changed', async () => {
    let resolveFirst: (value: FieldWeather) => void = () => undefined;
    const other = {
      daily: [{ date: '2026-10-25' }],
    } as unknown as FieldWeather;
    mockedGetFieldWeather
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(other);

    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useFieldWeather(id, 'ca'),
      { initialProps: { id: 1 } },
    );

    rerender({ id: 2 });
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'ready', weather: other });
    });

    await act(async () => {
      resolveFirst(weather);
    });

    expect(result.current.state).toEqual({ status: 'ready', weather: other });
  });

  it('refreshes the weather every 10 minutes', async () => {
    jest.useFakeTimers();
    const refreshed = {
      daily: [{ date: '2026-10-25' }],
    } as unknown as FieldWeather;
    mockedGetFieldWeather
      .mockResolvedValueOnce(weather)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(refreshed);

    const { result } = renderHook(() => useFieldWeather(1, 'ca'));
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'ready', weather });
    });

    await act(async () => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(result.current.state).toEqual({ status: 'ready', weather });

    await act(async () => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(result.current.state).toEqual({
      status: 'ready',
      weather: refreshed,
    });
    expect(mockedGetFieldWeather).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });
});
