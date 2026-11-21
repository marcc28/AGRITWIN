import { isMapPoint, type MapPoint } from '../components/field-location/types';

export const MAX_FIELD_AREA = 99999999.99;
export const BORDER_FIELD_TYPES = ['open_field', 'greenhouse', 'orchard'];
const RADIUS = 6371008.8;
const RAD = Math.PI / 180;
const EPS = 1e-14;

function turn(a: MapPoint, b: MapPoint, c: MapPoint) {
  return (b.lon - a.lon) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lon - a.lon);
}
function onSegment(a: MapPoint, b: MapPoint, c: MapPoint) {
  return (
    Math.abs(turn(a, b, c)) < EPS &&
    c.lon >= Math.min(a.lon, b.lon) - EPS &&
    c.lon <= Math.max(a.lon, b.lon) + EPS &&
    c.lat >= Math.min(a.lat, b.lat) - EPS &&
    c.lat <= Math.max(a.lat, b.lat) + EPS
  );
}
function intersects(a: MapPoint, b: MapPoint, c: MapPoint, d: MapPoint) {
  return (
    (turn(a, b, c) * turn(a, b, d) < 0 && turn(c, d, a) * turn(c, d, b) < 0) ||
    onSegment(a, b, c) ||
    onSegment(a, b, d) ||
    onSegment(c, d, a) ||
    onSegment(c, d, b)
  );
}
function ringGeometry(points: MapPoint[]) {
  if (points.length < 3) throw new Error('tooFew');
  if (points.length > 200) throw new Error('tooMany');
  if (!points.every(isMapPoint)) throw new Error('invalid');
  if (new Set(points.map((p) => `${p.lat},${p.lon}`)).size !== points.length)
    throw new Error('duplicate');
  if (
    Math.max(...points.map((p) => p.lon)) -
      Math.min(...points.map((p) => p.lon)) >
    180
  )
    throw new Error('invalid');
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
      if (
        intersects(
          points[i],
          points[(i + 1) % points.length],
          points[j],
          points[(j + 1) % points.length],
        )
      )
        throw new Error('crossing');
    }
  }
  const origin = points[0];
  let spherical = 0,
    crossSum = 0,
    centerX = 0,
    centerY = 0;
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length];
    spherical +=
      (b.lon - a.lon) * RAD * (Math.sin(a.lat * RAD) + Math.sin(b.lat * RAD));
    const ax = a.lon - origin.lon,
      ay = a.lat - origin.lat;
    const bx = b.lon - origin.lon,
      by = b.lat - origin.lat;
    const cross = ax * by - bx * ay;
    crossSum += cross;
    centerX += (ax + bx) * cross;
    centerY += (ay + by) * cross;
  });
  const areaM2 =
    Math.round(((Math.abs(spherical) * RADIUS * RADIUS) / 2) * 100) / 100;
  if (areaM2 < 0.01 || Math.abs(crossSum) < EPS) throw new Error('empty');
  if (areaM2 > MAX_FIELD_AREA) throw new Error('tooLarge');
  return {
    areaM2,
    center: {
      lat: origin.lat + centerY / (3 * crossSum),
      lon: origin.lon + centerX / (3 * crossSum),
    },
  };
}

function contains(point: MapPoint, ring: MapPoint[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j],
      b = ring[i];
    if (onSegment(a, b, point)) return false;
    if (
      a.lat > point.lat !== b.lat > point.lat &&
      point.lon <
        ((b.lon - a.lon) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lon
    )
      inside = !inside;
  }
  return inside;
}
function ringsIntersect(a: MapPoint[], b: MapPoint[]) {
  return a.some((p, i) =>
    b.some((q, j) =>
      intersects(p, a[(i + 1) % a.length], q, b[(j + 1) % b.length]),
    ),
  );
}
export function fieldGeometry(
  points: MapPoint[],
  excludedZones: MapPoint[][] = [],
) {
  const outer = ringGeometry(points);
  if (
    excludedZones.length > 20 ||
    points.length + excludedZones.reduce((n, p) => n + p.length, 0) > 1000
  )
    throw new Error('tooManyZones');
  let excludedAreaM2 = 0,
    latWeight = outer.center.lat * outer.areaM2,
    lonWeight = outer.center.lon * outer.areaM2;
  excludedZones.forEach((zone, i) => {
    const hole = ringGeometry(zone);
    if (zone.some((p) => !contains(p, points)) || ringsIntersect(zone, points))
      throw new Error('outside');
    for (const previous of excludedZones.slice(0, i)) {
      if (
        ringsIntersect(zone, previous) ||
        contains(zone[0], previous) ||
        contains(previous[0], zone)
      )
        throw new Error('overlap');
    }
    excludedAreaM2 += hole.areaM2;
    latWeight -= hole.center.lat * hole.areaM2;
    lonWeight -= hole.center.lon * hole.areaM2;
  });
  excludedAreaM2 = Math.round(excludedAreaM2 * 100) / 100;
  const areaM2 = Math.round((outer.areaM2 - excludedAreaM2) * 100) / 100;
  if (areaM2 < 0.01) throw new Error('empty');
  return {
    areaM2,
    grossAreaM2: outer.areaM2,
    excludedAreaM2,
    center: { lat: latWeight / areaM2, lon: lonWeight / areaM2 },
  };
}

export const AREA_UNITS = {
  m2: 1,
  ha: 10000,
  acre: 4046.8564224,
  km2: 1000000,
  ft2: 0.09290304,
};
export type AreaUnit = keyof typeof AREA_UNITS;
export function parseArea(text: string, unit: AreaUnit) {
  return text.trim() === ''
    ? null
    : Number(text.trim().replace(',', '.')) * AREA_UNITS[unit];
}
export function displayArea(m2: number, unit: AreaUnit) {
  return String(Number((m2 / AREA_UNITS[unit]).toPrecision(10)));
}
