import { parseIsoDate } from '@/utils/tasks';

export const MOON_PHASES = [
  'new',
  'waxingCrescent',
  'firstQuarter',
  'waxingGibbous',
  'full',
  'waningGibbous',
  'lastQuarter',
  'waningCrescent',
] as const;

export type MoonPhase = (typeof MOON_PHASES)[number];

// The average time between two new moons, in days.
const SYNODIC_MONTH = 29.530588853;
// A real new moon: 6 January 2000, 18:14 UTC.
const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 24 * 60 * 60 * 1000;

/** Days since the last new moon, from 0 to about 29.5. */
export function moonAge(day: string): number {
  const days = (parseIsoDate(day).getTime() - REFERENCE_NEW_MOON) / DAY_MS;
  return ((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
}

/**
 * The phase of the moon on a day (YYYY-MM-DD), worked out with the average
 * lunar month. It can be off by about a day, which is fine for a calendar.
 */
export function moonPhase(day: string): MoonPhase {
  const index = Math.floor((moonAge(day) / SYNODIC_MONTH) * 8 + 0.5) % 8;
  return MOON_PHASES[index];
}
