export const TILE_URL =
  process.env.EXPO_PUBLIC_MAP_TILE_URL ||
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';
export const TILE_ATTRIBUTION = process.env.EXPO_PUBLIC_MAP_TILE_ATTRIBUTION
  ? `${MAP_ATTRIBUTION} | ${process.env.EXPO_PUBLIC_MAP_TILE_ATTRIBUTION}`
  : MAP_ATTRIBUTION;

export const TILE_OPTIONS = {
  maxZoom: 19,
  attribution: TILE_ATTRIBUTION,
  keepBuffer: 0,
  updateWhenIdle: true,
  noWrap: true,
};

export const POINT_STYLE = {
  radius: 8,
  color: '#FFFFFF',
  weight: 3,
  fillColor: '#46614F',
  fillOpacity: 1,
};
