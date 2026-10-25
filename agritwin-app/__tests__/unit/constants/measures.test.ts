import {
  MEASURES,
  formatDateTime,
  formatValue,
  getMeasureValue,
} from '../../../src/constants/measures';

const light = MEASURES.find((item) => item.key === 'light');
const temperature = MEASURES.find((item) => item.key === 'temperature');

describe('measures', () => {
  it('reads the value for a measure', () => {
    expect(
      getMeasureValue(
        {
          timestamp: '2026-01-01T00:00:00Z',
          temperature: 21.4,
          air_humidity: 40,
          soil_humidity: 30,
          light: 100,
        },
        temperature!,
      ),
    ).toBe(21.4);
  });

  it('formats lux in thousands when the value is large', () => {
    const formatted = formatValue(84799.4, light!);
    expect(formatted.endsWith('k')).toBe(true);
    expect(formatted).toMatch(/84/);
  });

  it('formats small lux without the thousands suffix', () => {
    expect(formatValue(500, light!)).toBe('500');
  });

  it('keeps one decimal for temperature', () => {
    const formatted = formatValue(25.9, temperature!);
    expect(formatted).toMatch(/25/);
  });

  it('formats a timestamp in Catalan', () => {
    const formatted = formatDateTime('2026-10-22T14:45:00');
    expect(formatted).toMatch(/22|oct|14|45/i);
  });
});
