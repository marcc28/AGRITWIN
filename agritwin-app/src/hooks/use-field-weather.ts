import { FieldWeather, WeatherRequestError } from '@/services/api';
import { weatherQuery } from '@/services/queries';
import { useCachedQuery, useRetry } from './use-cached-query';

export type FieldWeatherState =
  | { status: 'loading' }
  | { status: 'no-field' }
  | { status: 'ready'; weather: FieldWeather }
  | { status: 'no-location' }
  | { status: 'no-data' }
  | { status: 'error' };

const NO_LOCATION_ERRORS = new Set([
  'Field has no location',
  'Field not found',
  'City not found',
]);

function stateForError(error: unknown): FieldWeatherState {
  if (error instanceof WeatherRequestError && error.status === 404) {
    if (error.message === 'Not Found') {
      return { status: 'error' };
    }
    return NO_LOCATION_ERRORS.has(error.message)
      ? { status: 'no-location' }
      : { status: 'no-data' };
  }
  return { status: 'error' };
}

/**
 * Forecast and alerts of a field. The last forecast is shown at once from
 * the cache and it is always revalidated (and every 10 minutes while the
 * screen is open), so alerts are never out of date.
 */
export function useFieldWeather(fieldId: number | null, lang: string) {
  const query = useCachedQuery({
    ...weatherQuery(fieldId ?? -1, lang),
    enabled: fieldId !== null,
  });
  const { data, error, isError, isFetching, refetch } = query;
  const { retrying, retry } = useRetry(refetch);

  let state: FieldWeatherState;
  if (fieldId === null) {
    state = { status: 'no-field' };
  } else if (data && !retrying) {
    // A failed background refresh keeps the forecast already on screen.
    state =
      data.daily.length > 0
        ? { status: 'ready', weather: data }
        : { status: 'no-data' };
  } else if (isError && !isFetching && !retrying) {
    state = stateForError(error);
  } else {
    state = { status: 'loading' };
  }

  return { state, retry };
}
