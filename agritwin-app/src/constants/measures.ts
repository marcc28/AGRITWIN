import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import type { Reading } from '@/services/api';

export type MeasureKey =
  'temperature' | 'air_humidity' | 'soil_humidity' | 'light';

export type Measure = {
  key: MeasureKey;
  label: string;
  shortLabel: string;
  unit: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  decimals: number;
};

export const MEASURES: Measure[] = [
  {
    key: 'temperature',
    label: 'Temperatura de l’aire',
    shortLabel: 'Temp.',
    unit: '°C',
    icon: 'thermometer-outline',
    decimals: 1,
  },
  {
    key: 'air_humidity',
    label: 'Humitat de l’aire',
    shortLabel: 'Aire',
    unit: '%',
    icon: 'water-outline',
    decimals: 0,
  },
  {
    key: 'soil_humidity',
    label: 'Humitat del sòl',
    shortLabel: 'Sòl',
    unit: '%',
    icon: 'leaf-outline',
    decimals: 0,
  },
  {
    key: 'light',
    label: 'Llum',
    shortLabel: 'Llum',
    unit: 'lux',
    icon: 'sunny-outline',
    decimals: 0,
  },
];

export function getMeasureValue(reading: Reading, measure: Measure): number {
  return reading[measure.key];
}

export function formatValue(value: number, measure: Measure): string {
  return value.toLocaleString('ca', {
    minimumFractionDigits: measure.decimals,
    maximumFractionDigits: measure.decimals,
  });
}

export function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('ca', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
