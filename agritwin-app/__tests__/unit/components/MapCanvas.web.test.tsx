/** @jest-environment jsdom */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as L from 'leaflet';

import MapCanvas from '../../../src/components/field-location/MapCanvas.web';

jest.mock('leaflet', () => ({
  map: jest.fn(),
  circleMarker: jest.fn(),
  tileLayer: jest.fn(),
}));
jest.mock('leaflet/dist/leaflet.css', () => ({}));
jest.mock('../../../src/components/field-location/loadLeaflet', () => ({
  loadLeaflet: () => Promise.resolve(jest.requireMock('leaflet')),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const listeners: Record<string, (...args: unknown[]) => void> = {};
const mockMap = {
  setView: jest.fn().mockReturnThis(),
  getZoom: () => 6,
  on: jest.fn((event: string, callback: (...args: unknown[]) => void) => {
    listeners[event] = callback;
  }),
  remove: jest.fn(),
  invalidateSize: jest.fn(),
};
const mockMarker = {
  setLatLng: jest.fn().mockReturnThis(),
  addTo: jest.fn().mockReturnThis(),
};
const mockTiles = {
  on: jest.fn(function (
    this: unknown,
    event: string,
    callback: (...args: unknown[]) => void,
  ) {
    listeners[event] = callback;
    return this;
  }),
  addTo: jest.fn().mockReturnThis(),
};

describe('OpenStreetMap web point selection', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockMap.setView.mockReturnThis();
    mockMarker.setLatLng.mockReturnThis();
    mockMarker.addTo.mockReturnThis();
    mockTiles.addTo.mockReturnThis();
    mockMap.on.mockImplementation((event, callback) => {
      listeners[event] = callback;
    });
    mockTiles.on.mockImplementation(function (this: unknown, event, callback) {
      listeners[event] = callback;
      return this;
    });
    Object.keys(listeners).forEach((key) => delete listeners[key]);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.mocked(L.map).mockReturnValue(mockMap as unknown as L.Map);
    jest
      .mocked(L.circleMarker)
      .mockReturnValue(mockMarker as unknown as L.CircleMarker);
    jest
      .mocked(L.tileLayer)
      .mockReturnValue(mockTiles as unknown as L.TileLayer);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  it('loads a map without keys and includes visible provider attribution', async () => {
    await act(async () =>
      root.render(<MapCanvas point={null} onSelect={jest.fn()} />),
    );
    expect(L.tileLayer).toHaveBeenCalledWith(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      expect.objectContaining({
        attribution: expect.stringContaining('OpenStreetMap contributors'),
        keepBuffer: 0,
        maxZoom: 19,
      }),
    );
    await act(async () => listeners.tileload());
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('passes clicked coordinates to the picker and updates the marker', async () => {
    const onSelect = jest.fn();
    await act(async () =>
      root.render(<MapCanvas point={null} onSelect={onSelect} />),
    );
    await act(async () =>
      listeners.click({ latlng: { wrap: () => ({ lat: 42.5, lng: 1.5 }) } }),
    );
    expect(onSelect).toHaveBeenCalledWith({ lat: 42.5, lon: 1.5 });
    await act(async () =>
      root.render(
        <MapCanvas point={{ lat: 42.5, lon: 1.5 }} onSelect={onSelect} />,
      ),
    );
    expect(mockMarker.setLatLng).toHaveBeenCalledWith([42.5, 1.5]);
    expect(mockMap.setView).toHaveBeenLastCalledWith([42.5, 1.5], 15);
  });

  it('keeps an existing point visible when the picker reopens and cleans up the map', async () => {
    await act(async () =>
      root.render(
        <MapCanvas point={{ lat: 42.5, lon: 1.5 }} onSelect={jest.fn()} />,
      ),
    );
    expect(mockMap.setView).toHaveBeenCalledWith([42.5, 1.5], 15);
    expect(mockMarker.addTo).toHaveBeenCalledWith(mockMap);
    await act(async () => root.unmount());
    expect(mockMap.remove).toHaveBeenCalledTimes(1);
    root = createRoot(container);
  });

  it('shows a fallback when map initialization fails', async () => {
    jest.mocked(L.map).mockImplementationOnce(() => {
      throw new Error('unavailable');
    });
    await act(async () =>
      root.render(<MapCanvas point={null} onSelect={jest.fn()} />),
    );
    expect(container.textContent).toContain(
      'settings.createField.map.loadError',
    );
  });

  it('shows a fallback on tile failure and recovers when tiles arrive', async () => {
    await act(async () =>
      root.render(<MapCanvas point={null} onSelect={jest.fn()} />),
    );
    await act(async () => listeners.tileerror());
    expect(container.textContent).toContain(
      'settings.createField.map.loadError',
    );
    await act(async () => listeners.tileload());
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('shows a fallback when the map never becomes ready', async () => {
    await act(async () =>
      root.render(<MapCanvas point={null} onSelect={jest.fn()} />),
    );
    await act(async () => jest.advanceTimersByTime(15000));
    expect(container.textContent).toContain(
      'settings.createField.map.loadError',
    );
  });
});
