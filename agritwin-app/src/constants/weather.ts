import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

import type {
  FieldWeather,
  WeatherAlert,
  WeatherCondition,
} from '@/services/api';

export type WeatherIcon = ComponentProps<typeof Ionicons>['name'];

export type UvLevel = 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme';

const PARTLY_CLOUDY_CODES = new Set([1, 2]);

const ALERT_ICONS: Record<string, WeatherIcon> = {
  hail: 'thunderstorm-outline',
  storm: 'flash-outline',
  snow: 'snow-outline',
  frost: 'thermometer-outline',
  wind: 'flag-outline',
  heat: 'sunny-outline',
  rain: 'rainy-outline',
};

export function weatherIcon(
  condition: WeatherCondition,
  isDay = true,
): WeatherIcon {
  switch (condition.main) {
    case 'Clear':
      return isDay ? 'sunny-outline' : 'moon-outline';
    case 'Clouds':
      if (PARTLY_CLOUDY_CODES.has(condition.code ?? -1)) {
        return isDay ? 'partly-sunny-outline' : 'cloudy-night-outline';
      }
      return 'cloudy-outline';
    case 'Drizzle':
    case 'Rain':
      return 'rainy-outline';
    case 'Snow':
      return 'snow-outline';
    case 'Thunderstorm':
      return 'thunderstorm-outline';
    default:
      return 'cloudy-outline';
  }
}

export function alertIcon(type: string): WeatherIcon {
  return ALERT_ICONS[type] ?? 'warning-outline';
}

const HOUR_MS = 60 * 60 * 1000;

function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isActiveAlert(alert: WeatherAlert, now = new Date()): boolean {
  if (alert.starts_at) {
    return new Date(alert.starts_at).getTime() + HOUR_MS > now.getTime();
  }
  if (alert.day) {
    return alert.day >= localDate(now);
  }
  return true;
}

export function activeAlerts(weather: FieldWeather, now = new Date()) {
  return {
    currentAlerts: (weather.current_alerts ?? []).filter((alert) =>
      isActiveAlert(alert, now),
    ),
    alerts: (weather.alerts ?? []).filter((alert) => isActiveAlert(alert, now)),
  };
}

export function formatTemperature(value: number): string {
  return `${Math.round(value)}°`;
}

export function localTime(isoDateTime: string | null): string {
  return isoDateTime ? isoDateTime.slice(11, 16) : '--:--';
}

export function compassIndex(degrees: number): number {
  return Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
}

export function uvLevel(uvIndex: number): UvLevel {
  if (uvIndex < 3) return 'low';
  if (uvIndex < 6) return 'moderate';
  if (uvIndex < 8) return 'high';
  if (uvIndex < 11) return 'veryHigh';
  return 'extreme';
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function dayLabel(t: TFunction, isoDate: string, position: number) {
  if (position === 0) {
    return t('weather.today');
  }

  const [year, month, day] = isoDate.split('-').map(Number);
  const weekdays = t('weather.weekdays', { returnObjects: true }) as string[];
  const weekday = weekdays[new Date(year, month - 1, day).getDay()];

  return capitalize(weekday ?? isoDate);
}
