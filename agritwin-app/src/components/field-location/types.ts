export type MapPoint = { lat: number; lon: number };

export type MapCanvasProps = {
  point: MapPoint | null;
  onSelect: (point: MapPoint) => void;
  boundary?: MapPoint[];
  excludedZones?: MapPoint[][];
  activeZone?: number | null;
  readOnly?: boolean;
  onBoundaryChange?: (points: MapPoint[]) => void;
};

export const DEFAULT_CENTER: MapPoint = { lat: 41.3874, lon: 2.1686 };

export function isMapPoint(value: unknown): value is MapPoint {
  if (!value || typeof value !== 'object') return false;
  const point = value as Partial<MapPoint>;
  return (
    typeof point.lat === 'number' &&
    Number.isFinite(point.lat) &&
    typeof point.lon === 'number' &&
    Number.isFinite(point.lon) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lon) <= 180
  );
}
