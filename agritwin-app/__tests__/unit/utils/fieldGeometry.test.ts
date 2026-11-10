import {
  fieldGeometry,
  parseArea,
  displayArea,
} from '../../../src/utils/fieldGeometry';
const square = [
  { lat: 0, lon: 0 },
  { lat: 0, lon: 0.001 },
  { lat: 0.001, lon: 0.001 },
  { lat: 0.001, lon: 0 },
];
describe('Field geometry and area units', () => {
  it('calculates a known equatorial square and its centroid in both winding orders', () => {
    for (const points of [square, [...square].reverse()]) {
      const result = fieldGeometry(points);
      expect(result.areaM2).toBeCloseTo(12364.35, 2);
      expect(result.center.lat).toBeCloseTo(0.0005, 10);
      expect(result.center.lon).toBeCloseTo(0.0005, 10);
    }
  });
  it.each([
    [square.slice(0, 2), 'tooFew'],
    [[square[0], square[2], square[1], square[3]], 'crossing'],
    [[square[0], square[1], square[0]], 'duplicate'],
    [
      [
        { lat: 0, lon: 0 },
        { lat: 0, lon: 1 },
        { lat: 0, lon: 2 },
      ],
      'empty',
    ],
    [[{ lat: NaN, lon: 0 }, square[1], square[2]], 'invalid'],
  ])('rejects an invalid boundary', (points, error) =>
    expect(() => fieldGeometry(points)).toThrow(error),
  );
  it('uses canonical square metres for each supported unit', () => {
    expect(parseArea('2,5', 'ha')).toBe(25000);
    expect(parseArea('1', 'acre')).toBeCloseTo(4046.8564224);
    expect(parseArea('1', 'km2')).toBe(1000000);
    expect(parseArea('1', 'ft2')).toBeCloseTo(0.09290304);
    expect(displayArea(25000, 'ha')).toBe('2.5');
    expect(parseArea('', 'm2')).toBeNull();
  });
});

describe('Excluded zones', () => {
  const hole = [
    { lat: 0.0002, lon: 0.0002 },
    { lat: 0.0002, lon: 0.0004 },
    { lat: 0.0004, lon: 0.0004 },
    { lat: 0.0004, lon: 0.0002 },
  ];
  it('subtracts an interior cabin from the gross area', () => {
    const result = fieldGeometry(square, [hole]);
    expect(result.areaM2).toBeCloseTo(11869.78, 2);
    expect(result.grossAreaM2).toBeCloseTo(12364.35, 2);
    expect(result.excludedAreaM2).toBeCloseTo(494.57, 2);
  });
  it('rejects exclusions outside or touching the field', () => {
    expect(() =>
      fieldGeometry(square, [[{ lat: 0, lon: 0 }, ...hole.slice(1)]]),
    ).toThrow('outside');
  });
  it('rejects overlapping and nested exclusions', () => {
    expect(() => fieldGeometry(square, [hole, hole])).toThrow('overlap');
    const nested = hole.map((p) => ({
      lat: 0.0003 + (p.lat - 0.0003) / 2,
      lon: 0.0003 + (p.lon - 0.0003) / 2,
    }));
    expect(() => fieldGeometry(square, [hole, nested])).toThrow('overlap');
  });
});
