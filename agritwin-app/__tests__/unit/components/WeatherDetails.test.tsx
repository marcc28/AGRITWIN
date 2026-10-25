import React from 'react';

import { render, screen } from '@testing-library/react-native';

import { WeatherDetails } from '../../../src/components/WeatherDetails';
import type { FieldWeather } from '../../../src/services/api';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'weather.weekdays') {
        return ['dg.', 'dl.', 'dt.', 'dc.', 'dj.', 'dv.', 'ds.'];
      }
      if (key === 'weather.compass') {
        return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
      }
      if (options) {
        return `${key} ${Object.values(options).join(' ')}`;
      }
      return key;
    },
  }),
}));

function condition(main: string, description: string, icon = '01d') {
  return { code: null, main, description, icon };
}

function day(date: string, max: number, main: string, description: string) {
  return {
    date,
    temp_min: 8,
    temp_max: max,
    rain_probability: 20,
    rain_mm: 1.2,
    condition: condition(main, description),
    wind: { speed: 3, direction_deg: 45, gust: null },
    uv_index_max: 3,
    sunrise: `${date}T08:19`,
    sunset: `${date}T19:02`,
  };
}

const weather: FieldWeather = {
  units: 'metric',
  lang: 'ca',
  temperature_unit: '°C',
  wind_speed_unit: 'km/h',
  fetched_at: null,
  location: {
    field_id: 1,
    name: 'Lleida',
    country: 'ES',
    latitude: 41.61,
    longitude: 0.62,
    timezone_offset: 7200,
  },
  current: {
    observed_at: '2026-10-24T13:00',
    temperature: 17.4,
    feels_like: 16.2,
    humidity: 64,
    pressure: 1015,
    clouds: 80,
    rain_last_hour_mm: 0,
    condition: condition('Clouds', 'cobert'),
    wind: { speed: 9.6, direction_deg: 90, gust: null },
    rain_probability: 35,
    uv_index: 6.2,
    is_day: true,
  },
  hourly: [
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
    '21:00',
    '22:00',
    '23:00',
    '24:00',
  ].map((hour, index) => ({
    time: `2026-10-24T${hour}`,
    temperature: 20 - index,
    rain_probability: 0,
    condition: condition('Clear', 'serè', index > 4 ? '01n' : '01d'),
  })),
  daily: [
    day('2026-10-24', 18, 'Clouds', 'cobert'),
    day('2026-10-25', 22, 'Clear', 'cel serè'),
    day('2026-10-26', 21, 'Rain', 'pluja feble'),
    day('2026-10-27', 30, 'Snow', 'neu'),
  ],
};

describe('WeatherDetails', () => {
  it('shows the weather of today', () => {
    render(<WeatherDetails weather={weather} />);

    expect(screen.getByTestId('weather-details')).toBeTruthy();
    expect(screen.getByText('Lleida')).toBeTruthy();
    expect(screen.getByText('17°')).toBeTruthy();
    expect(screen.getByText('weather.today · Cobert')).toBeTruthy();
    expect(screen.getByText('weather.feelsLike 16°')).toBeTruthy();
    expect(screen.getByText('weather.highLow 18° 8°')).toBeTruthy();
    expect(screen.getByText('weather.temperaturesIn °C')).toBeTruthy();
  });

  it('shows one hour out of two', () => {
    render(<WeatherDetails weather={weather} />);

    expect(screen.getByText('weather.now')).toBeTruthy();
    expect(screen.getByText('15:00')).toBeTruthy();
    expect(screen.getByText('21:00')).toBeTruthy();
    expect(screen.queryByText('14:00')).toBeNull();
    expect(screen.queryByText('23:00')).toBeNull();
    expect(screen.getAllByText('moon-outline')).toHaveLength(3);
  });

  it('shows rain, wind, humidity and uv', () => {
    render(<WeatherDetails weather={weather} />);

    expect(screen.getByText('35% · 1.2 mm')).toBeTruthy();
    expect(screen.getByText('10 km/h · E')).toBeTruthy();
    expect(screen.getByText('64%')).toBeTruthy();
    expect(screen.getByText('6 · weather.uvLevels.high')).toBeTruthy();
    expect(screen.getByText('weather.sunrise 08:19')).toBeTruthy();
    expect(screen.getByText('weather.sunset 19:02')).toBeTruthy();
  });

  it('shows the forecast of three days', () => {
    render(<WeatherDetails weather={weather} />);

    expect(screen.getByText('weather.threeDayForecast')).toBeTruthy();
    expect(screen.getByText('Dg.')).toBeTruthy();
    expect(screen.getByText('Dl.')).toBeTruthy();
    expect(screen.getByText('Cel serè')).toBeTruthy();
    expect(screen.getByText('Pluja feble')).toBeTruthy();
    expect(screen.queryByText('Neu')).toBeNull();
    expect(screen.queryByText('30°')).toBeNull();
  });

  it('shows dashes when some data is missing', () => {
    render(
      <WeatherDetails
        weather={{
          ...weather,
          location: { ...weather.location, name: null },
          current: {
            ...weather.current,
            rain_probability: null,
            uv_index: null,
            wind: { speed: 4, direction_deg: null, gust: null },
          },
          hourly: [],
          daily: [{ ...weather.daily[0], sunrise: null, sunset: null }],
        }}
      />,
    );

    expect(screen.getByText('weather.myField')).toBeTruthy();
    expect(screen.getByText('-- · 1.2 mm')).toBeTruthy();
    expect(screen.getByText('4 km/h')).toBeTruthy();
    expect(screen.getByText('--')).toBeTruthy();
    expect(screen.getByText('weather.sunrise --:--')).toBeTruthy();
    expect(screen.queryByText('weather.todaysOutlook')).toBeNull();
  });

  it('shows the current weather without a daily forecast', () => {
    render(<WeatherDetails weather={{ ...weather, daily: [] }} />);

    expect(screen.getByText('17°')).toBeTruthy();
    expect(screen.getByText('35%')).toBeTruthy();
    expect(screen.queryByText('weather.sunrise 08:19')).toBeNull();
  });
});
