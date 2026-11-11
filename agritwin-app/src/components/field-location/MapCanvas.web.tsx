import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../constants/theme';
import { DEFAULT_CENTER, isMapPoint, type MapCanvasProps } from './types';
import { POINT_STYLE, TILE_OPTIONS, TILE_URL } from './mapConfig';
import { loadLeaflet } from './loadLeaflet';

export default function MapCanvas({
  point,
  onSelect,
  boundary,
  onBoundaryChange,
  excludedZones = [],
  activeZone = null,
  readOnly = false,
}: MapCanvasProps) {
  const { t } = useTranslation();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const marker = useRef<Leaflet.CircleMarker | null>(null);
  const latest = useRef({
    point,
    onSelect,
    boundary,
    onBoundaryChange,
    excludedZones,
    activeZone,
    readOnly,
  });
  const renderBorder = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    latest.current = {
      point,
      onSelect,
      boundary,
      onBoundaryChange,
      excludedZones,
      activeZone,
      readOnly,
    };
    renderBorder.current?.();
    if (point && map.current && marker.current) {
      const location: Leaflet.LatLngTuple = [point.lat, point.lon];
      marker.current.setLatLng(location).addTo(map.current);
      map.current.setView(location, Math.max(map.current.getZoom(), 15));
    }
  }, [
    point,
    onSelect,
    boundary,
    onBoundaryChange,
    excludedZones,
    activeZone,
    readOnly,
  ]);

  useEffect(() => {
    let disposed = false;
    let instance: Leaflet.Map | undefined;
    let observer: ResizeObserver | undefined;
    const timeout = setTimeout(() => {
      if (!disposed) setStatus('loadError');
    }, 15000);
    async function initialize() {
      try {
        const L = await loadLeaflet();
        if (disposed || !container.current) return;
        const selected = latest.current.point;
        const center = selected ?? DEFAULT_CENTER;
        instance = L.map(container.current).setView(
          [center.lat, center.lon],
          selected ? 15 : 6,
        );
        map.current = instance;
        if (latest.current.onBoundaryChange) {
          const group = L.layerGroup().addTo(instance);
          renderBorder.current = () => {
            group.clearLayers();
            const corners = latest.current.boundary ?? [];
            const coordinates: Leaflet.LatLngTuple[] = corners.map((p) => [
              p.lat,
              p.lon,
            ]);
            const holes = latest.current.excludedZones ?? [];
            if (corners.length >= 3)
              L.polygon(
                [
                  coordinates,
                  ...holes
                    .filter((h) => h.length >= 3)
                    .map((h) =>
                      h.map((p) => [p.lat, p.lon] as Leaflet.LatLngTuple),
                    ),
                ],
                { color: '#46614F', fillOpacity: 0.2, interactive: false },
              ).addTo(group);
            else if (corners.length === 2)
              L.polyline(coordinates, {
                color: '#46614F',
                interactive: false,
              }).addTo(group);
            const rings = [corners, ...holes];
            rings.forEach((ring, index) => {
              const positions = ring.map(
                (p) => [p.lat, p.lon] as Leaflet.LatLngTuple,
              );
              const color = index === 0 ? '#46614F' : '#B34D38';
              if (index > 0 && ring.length >= 3)
                L.polygon(positions, {
                  color,
                  fillColor: color,
                  fillOpacity: 0.15,
                  interactive: false,
                }).addTo(group);
              else if (index > 0 && ring.length === 2)
                L.polyline(positions, { color, interactive: false }).addTo(
                  group,
                );
              const active = (latest.current.activeZone ?? -1) + 1 === index;
              positions.forEach((p) =>
                L.circleMarker(p, {
                  ...POINT_STYLE,
                  fillColor: color,
                  radius: active ? 8 : 5,
                  bubblingMouseEvents: false,
                }).addTo(group),
              );
            });
          };
          renderBorder.current();
          if ((latest.current.boundary?.length ?? 0) >= 3)
            instance.fitBounds(
              L.latLngBounds(
                latest.current.boundary!.map(
                  (p) => [p.lat, p.lon] as Leaflet.LatLngTuple,
                ),
              ),
              { padding: [30, 30], animate: false },
            );
        } else {
          marker.current = L.circleMarker(
            [center.lat, center.lon],
            POINT_STYLE,
          );
          if (selected) marker.current.addTo(instance);
        }
        let loaded = false;
        L.tileLayer(TILE_URL, TILE_OPTIONS)
          .on('tileload', () => {
            loaded = true;
            clearTimeout(timeout);
            if (!disposed) setStatus('ready');
          })
          .on('tileerror', () => {
            if (!loaded && !disposed) setStatus('loadError');
          })
          .addTo(instance);
        instance.on('click', (event: Leaflet.LeafletMouseEvent) => {
          if (latest.current.readOnly) return;
          const position = event.latlng.wrap();
          const selected = { lat: position.lat, lon: position.lng };
          if (!isMapPoint(selected)) return;
          if (latest.current.onBoundaryChange) {
            const index = latest.current.activeZone;
            const ring =
              index == null
                ? (latest.current.boundary ?? [])
                : (latest.current.excludedZones[index] ?? []);
            const corners = [...ring, selected];
            if (index == null) latest.current.boundary = corners;
            else
              latest.current.excludedZones = latest.current.excludedZones.map(
                (p, i) => (i === index ? corners : p),
              );
            latest.current.onBoundaryChange(corners);
          } else latest.current.onSelect(selected);
        });
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(() => instance?.invalidateSize());
          observer.observe(container.current);
        }
      } catch {
        clearTimeout(timeout);
        if (!disposed) setStatus('loadError');
      }
    }
    void initialize();
    return () => {
      disposed = true;
      clearTimeout(timeout);
      observer?.disconnect();
      instance?.remove();
      map.current = null;
      marker.current = null;
      renderBorder.current = null;
    };
  }, []);

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        minHeight: 160,
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      <div
        ref={container}
        role="region"
        aria-label={t('settings.createField.map.title')}
        style={{ position: 'absolute', inset: 0 }}
      />
      {status !== 'ready' ? (
        <div
          role="status"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: Colors.light.surface,
            color: Colors.light.textSecondary,
            textAlign: 'center',
          }}
        >
          {t(`settings.createField.map.${status}`)}
        </div>
      ) : null}
    </div>
  );
}
