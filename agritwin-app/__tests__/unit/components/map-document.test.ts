import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { mapDocument } from '../../../src/components/field-location/mapDocument';

describe('Native map document', () => {
  it('initializes the map, preserves its point and sends click coordinates', () => {
    const postMessage = jest.fn();
    const events: Record<string, (...args: unknown[]) => void> = {};
    const map = {
      setView: jest.fn().mockReturnThis(),
      getZoom: () => 15,
      on: (name: string, callback: (...args: unknown[]) => void) => {
        events[name] = callback;
      },
    };
    const marker = {
      setLatLng: jest.fn().mockReturnThis(),
      addTo: jest.fn().mockReturnThis(),
      remove: jest.fn(),
    };
    const tiles = {
      on: jest.fn(function (
        this: unknown,
        name: string,
        callback: (...args: unknown[]) => void,
      ) {
        events[name] = callback;
        return this;
      }),
      addTo: jest.fn(),
    };
    const context = {
      window: {
        ReactNativeWebView: { postMessage },
        setFieldPoint: (_point: unknown) => {},
      },
      document: { addEventListener: jest.fn() },
      setTimeout: jest.fn(),
      clearTimeout: jest.fn(),
      L: {
        map: () => map,
        circleMarker: () => marker,
        tileLayer: jest.fn(() => tiles),
      },
    };
    const html = mapDocument({ lat: 42.5, lon: 1.5 });
    for (const match of html.matchAll(
      /<script nonce="field-map">([\s\S]*?)<\/script>/g,
    )) {
      runInNewContext(match[1], context);
    }
    expect(map.setView).toHaveBeenCalledWith([42.5, 1.5], 15);
    expect(marker.addTo).toHaveBeenCalledWith(map);
    expect(context.L.tileLayer).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        attribution: expect.stringContaining('<a href='),
      }),
    );
    events.tileload();
    expect(postMessage).toHaveBeenCalledWith(JSON.stringify({ type: 'ready' }));
    events.click({ latlng: { wrap: () => ({ lat: 41.7, lng: 2.3 }) } });
    expect(postMessage).toHaveBeenLastCalledWith(
      JSON.stringify({ type: 'point', point: { lat: 41.7, lon: 2.3 } }),
    );
    expect(marker.setLatLng).toHaveBeenCalledWith([41.7, 2.3]);
  });

  it('renders native polygon holes and keeps read-only maps unchanged', () => {
    const outer = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 0.001 },
      { lat: 0.001, lon: 0.001 },
      { lat: 0.001, lon: 0 },
    ];
    const hole = [
      { lat: 0.0002, lon: 0.0002 },
      { lat: 0.0002, lon: 0.0004 },
      { lat: 0.0004, lon: 0.0004 },
    ];
    const events: Record<string, (e: unknown) => void> = {};
    const layer = { addTo: jest.fn().mockReturnThis(), clearLayers: jest.fn() };
    const shape = { addTo: jest.fn().mockReturnThis() };
    const polygon = jest.fn(() => shape);
    const postMessage = jest.fn();
    const map = {
      setView: jest.fn().mockReturnThis(),
      fitBounds: jest.fn(),
      on: (key: string, fn: (e: unknown) => void) => {
        events[key] = fn;
      },
    };
    const tiles = { on: jest.fn().mockReturnThis(), addTo: jest.fn() };
    const context = {
      window: { ReactNativeWebView: { postMessage } },
      document: { addEventListener: jest.fn() },
      setTimeout: jest.fn(),
      clearTimeout: jest.fn(),
      L: {
        map: () => map,
        layerGroup: () => layer,
        circleMarker: () => shape,
        polygon,
        polyline: () => shape,
        latLngBounds: (p: unknown) => p,
        tileLayer: () => tiles,
      },
    };
    for (const match of mapDocument(null, outer, [hole], 0, true).matchAll(
      /<script nonce="field-map">([\s\S]*?)<\/script>/g,
    ))
      runInNewContext(match[1], context);
    expect(polygon).toHaveBeenCalledWith(
      [outer.map((p) => [p.lat, p.lon]), hole.map((p) => [p.lat, p.lon])],
      expect.anything(),
    );
    events.click({ latlng: { wrap: () => ({ lat: 0.1, lng: 0.1 }) } });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('pins native CDN assets to the installed Leaflet release using integrity checks', () => {
    const html = mapDocument(null);
    for (const file of ['leaflet.js', 'leaflet.css']) {
      const hash = createHash('sha256')
        .update(readFileSync(require.resolve(`leaflet/dist/${file}`)))
        .digest('base64');
      expect(html).toContain(`https://unpkg.com/leaflet@1.9.4/dist/${file}`);
      expect(html).toContain(`sha256-${hash}`);
    }
    expect(html).toContain('Content-Security-Policy');
  });
});
