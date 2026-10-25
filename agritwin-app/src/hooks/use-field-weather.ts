import { useCallback, useEffect, useState } from 'react';

import {
  FieldWeather,
  WeatherRequestError,
  getFieldWeather,
} from '@/services/api';

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
    return NO_LOCATION_ERRORS.has(error.message)
      ? { status: 'no-location' }
      : { status: 'no-data' };
  }
  return { status: 'error' };
}

export function useFieldWeather(fieldId: number | null, lang: string) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    state: FieldWeatherState;
  } | null>(null);

  const requestKey = fieldId === null ? null : `${fieldId}:${lang}:${attempt}`;

  useEffect(() => {
    if (fieldId === null || requestKey === null) {
      return;
    }

    let active = true;

    getFieldWeather(fieldId, lang)
      .then((weather) => {
        if (active) {
          setResult({
            key: requestKey,
            state:
              weather.daily.length > 0
                ? { status: 'ready', weather }
                : { status: 'no-data' },
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setResult({ key: requestKey, state: stateForError(error) });
        }
      });

    return () => {
      active = false;
    };
  }, [fieldId, lang, requestKey]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  let state: FieldWeatherState;
  if (fieldId === null) {
    state = { status: 'no-field' };
  } else if (result?.key !== requestKey) {
    state = { status: 'loading' };
  } else {
    state = result.state;
  }

  return { state, retry };
}
