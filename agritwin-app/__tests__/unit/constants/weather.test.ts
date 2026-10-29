import type { TFunction } from 'i18next';

import {
  activeAlerts,
  alertIcon,
  capitalize,
  compassIndex,
  dayLabel,
  formatTemperature,
  localTime,
  uvLevel,
  weatherIcon,
} from '../../../src/constants/weather';
import type { FieldWeather, WeatherAlert } from '../../../src/services/api';

const weekdays = ['dg.', 'dl.', 'dt.', 'dc.', 'dj.', 'dv.', 'ds.'];

const t = ((key: string) =>
  key === 'weather.weekdays' ? weekdays : key) as unknown as TFunction;

function alert(
  type: string,
  startsAt: string | null,
  day: string | null = null,
): WeatherAlert {
  return {
    type,
    message: type,
    starts_at: startsAt,
    day,
    rain_probability: null,
    rain_mm: null,
    temperature: null,
    wind_speed: null,
  };
}

function condition(main: string, code: number | null = null) {
  return { code, main, description: main, icon: '01d' };
}

describe('weather constants', () => {
  it('chooses the icon for each condition', () => {
    expect(weatherIcon(condition('Clear'))).toBe('sunny-outline');
    expect(weatherIcon(condition('Clear'), false)).toBe('moon-outline');
    expect(weatherIcon(condition('Clouds', 2))).toBe('partly-sunny-outline');
    expect(weatherIcon(condition('Clouds', 1), false)).toBe(
      'cloudy-night-outline',
    );
    expect(weatherIcon(condition('Clouds', 3))).toBe('cloudy-outline');
    expect(weatherIcon(condition('Clouds'))).toBe('cloudy-outline');
    expect(weatherIcon(condition('Drizzle'))).toBe('rainy-outline');
    expect(weatherIcon(condition('Rain'))).toBe('rainy-outline');
    expect(weatherIcon(condition('Snow'))).toBe('snow-outline');
    expect(weatherIcon(condition('Thunderstorm'))).toBe('thunderstorm-outline');
    expect(weatherIcon(condition('Fog'))).toBe('cloudy-outline');
  });

  it('rounds the temperature', () => {
    expect(formatTemperature(21.4)).toBe('21°');
    expect(formatTemperature(-0.6)).toBe('-1°');
  });

  it('reads the local time of a date', () => {
    expect(localTime('2026-10-24T08:19:00')).toBe('08:19');
    expect(localTime(null)).toBe('--:--');
  });

  it('converts degrees to a compass point', () => {
    expect(compassIndex(0)).toBe(0);
    expect(compassIndex(44)).toBe(1);
    expect(compassIndex(180)).toBe(4);
    expect(compassIndex(350)).toBe(0);
    expect(compassIndex(-90)).toBe(6);
  });

  it('classifies the uv index', () => {
    expect(uvLevel(0)).toBe('low');
    expect(uvLevel(3)).toBe('moderate');
    expect(uvLevel(6)).toBe('high');
    expect(uvLevel(8)).toBe('veryHigh');
    expect(uvLevel(11)).toBe('extreme');
  });

  it('capitalizes a text', () => {
    expect(capitalize('pluja feble')).toBe('Pluja feble');
    expect(capitalize('')).toBe('');
  });

  it('labels the forecast days', () => {
    expect(dayLabel(t, '2026-10-24', 0)).toBe('weather.today');
    expect(dayLabel(t, '2026-10-25', 1)).toBe('Dg.');
    expect(dayLabel(t, '2026-10-26', 2)).toBe('Dl.');
  });

  it('chooses the icon of each alert', () => {
    expect(alertIcon('hail')).toBe('thunderstorm-outline');
    expect(alertIcon('rain')).toBe('rainy-outline');
    expect(alertIcon('other')).toBe('warning-outline');
  });

  it('removes the alerts that have already passed', () => {
    const now = new Date(2026, 9, 29, 15, 30);
    const weather = {
      current_alerts: [alert('wind', '2026-10-29T15:00:00')],
      alerts: [
        alert('storm', '2026-10-29T14:00:00'),
        alert('hail', null, '2026-10-28'),
        alert('frost', null, '2026-10-29'),
        alert('rain', null),
      ],
    } as unknown as FieldWeather;

    const { currentAlerts, alerts } = activeAlerts(weather, now);

    expect(currentAlerts.map((item) => item.type)).toEqual(['wind']);
    expect(alerts.map((item) => item.type)).toEqual(['frost', 'rain']);
    expect(activeAlerts({} as FieldWeather, now)).toEqual({
      currentAlerts: [],
      alerts: [],
    });
  });
});
