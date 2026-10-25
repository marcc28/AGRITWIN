import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

import type { WeatherCondition } from '@/services/api';

export type WeatherIcon = ComponentProps<typeof Ionicons>['name'];

export type UvLevel = 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme';

const PARTLY_CLOUDY_CODES = new Set([1, 2]);

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
