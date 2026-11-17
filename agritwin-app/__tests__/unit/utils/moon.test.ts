import { MOON_PHASES, moonAge, moonPhase } from '@/utils/moon';

describe('moonPhase', () => {
  it.each([
    ['2000-01-06', 'new'],
    ['2024-04-08', 'new'],
    ['2024-04-11', 'waxingCrescent'],
    ['2024-04-15', 'firstQuarter'],
    ['2024-04-19', 'waxingGibbous'],
    ['2024-04-24', 'full'],
    ['2024-04-27', 'waningGibbous'],
    ['2024-04-30', 'lastQuarter'],
    ['2024-05-04', 'waningCrescent'],
    ['2026-11-24', 'full'],
  ])('on %s it is %s', (day, phase) => {
    expect(moonPhase(day)).toBe(phase);
  });

  it('goes through the eight phases in order, again and again', () => {
    const seen: string[] = [];
    for (let day = 1; day <= 60; day += 1) {
      const date = `2026-${day <= 30 ? '11' : '12'}-${String(
        day <= 30 ? day : day - 30,
      ).padStart(2, '0')}`;
      const phase = moonPhase(date);
      if (seen[seen.length - 1] !== phase) {
        seen.push(phase);
      }
    }

    // Two months hold at least one full cycle, always in the same order.
    expect(seen.length).toBeGreaterThanOrEqual(8);
    seen.slice(1).forEach((phase, index) => {
      const before = MOON_PHASES.indexOf(
        seen[index] as (typeof MOON_PHASES)[number],
      );
      expect(MOON_PHASES[(before + 1) % 8]).toBe(phase);
    });
  });
});

describe('moonAge', () => {
  it('is always between 0 and one lunar month', () => {
    for (const day of [
      '1999-12-01',
      '2000-01-06',
      '2026-11-16',
      '2040-02-29',
    ]) {
      const age = moonAge(day);
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(29.531);
    }
  });

  it('grows one day at a time', () => {
    const step = moonAge('2026-11-11') - moonAge('2026-11-10');
    expect(step).toBeCloseTo(1, 5);
  });
});
