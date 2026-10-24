import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { WeatherCard } from '../../../src/components/WeatherCard';
import type { FieldWeather } from '../../../src/services/api';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === 'weather.weekdays'
        ? ['dg.', 'dl.', 'dt.', 'dc.', 'dj.', 'dv.', 'ds.']
        : key,
  }),
}));

function day(date: string, max: number, main: string) {
  return {
    date,
    temp_min: 8,
    temp_max: max,
    rain_probability: 0,
    rain_mm: 0,
    condition: { code: null, main, description: main, icon: '01d' },
    wind: { speed: 3, direction_deg: 45, gust: null },
    uv_index_max: 3,
    sunrise: null,
    sunset: null,
  };
}

const weather = {
  location: { name: 'Lleida' },
  daily: [
    day('2026-10-24', 17.4, 'Clouds'),
    day('2026-10-25', 22, 'Clear'),
    day('2026-10-26', 20.6, 'Rain'),
    day('2026-10-27', 19, 'Snow'),
  ],
} as unknown as FieldWeather;

describe('WeatherCard', () => {
  it('shows a loading state', () => {
    render(
      <WeatherCard
        state={{ status: 'loading' }}
        onPress={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByTestId('weather-loading')).toBeTruthy();
    expect(screen.getByLabelText('weather.loading')).toBeTruthy();
  });

  it.each([
    ['no-field', 'weather.noField'],
    ['no-location', 'weather.noLocation'],
    ['no-data', 'weather.noData'],
  ] as const)('shows the %s message', (status, message) => {
    render(
      <WeatherCard
        state={{ status }}
        onPress={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByTestId(`weather-${status}`)).toBeTruthy();
    expect(screen.getByText('weather.subtitle')).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByTestId('weather-retry')).toBeNull();
  });

  it('retries after an error', () => {
    const onRetry = jest.fn();
    render(
      <WeatherCard
        state={{ status: 'error' }}
        onPress={jest.fn()}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText('weather.error')).toBeTruthy();
    fireEvent.press(screen.getByTestId('weather-retry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the next three days', () => {
    render(
      <WeatherCard
        state={{ status: 'ready', weather }}
        onPress={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText('Lleida')).toBeTruthy();
    expect(screen.getByText('weather.subtitle')).toBeTruthy();
    expect(screen.getByText('weather.today')).toBeTruthy();
    expect(screen.getByText('Dg.')).toBeTruthy();
    expect(screen.getByText('Dl.')).toBeTruthy();
    expect(screen.getByText('17°')).toBeTruthy();
    expect(screen.getByText('22°')).toBeTruthy();
    expect(screen.queryByText('19°')).toBeNull();
    expect(screen.getByText('cloudy-outline')).toBeTruthy();
    expect(screen.getByText('sunny-outline')).toBeTruthy();
    expect(screen.getByText('rainy-outline')).toBeTruthy();
  });

  it('uses a default title when the place has no name', () => {
    render(
      <WeatherCard
        state={{
          status: 'ready',
          weather: {
            ...weather,
            location: { ...weather.location, name: null },
          },
        }}
        onPress={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText('weather.myField')).toBeTruthy();
  });

  it('opens the weather when pressed', () => {
    const onPress = jest.fn();
    render(
      <WeatherCard
        state={{ status: 'ready', weather }}
        onPress={onPress}
        onRetry={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId('weather-card'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
