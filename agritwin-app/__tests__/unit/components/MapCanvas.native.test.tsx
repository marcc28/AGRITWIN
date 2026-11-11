import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import MapCanvas from '../../../src/components/field-location/MapCanvas';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-native-webview', () => {
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const { useImperativeHandle } =
    jest.requireActual<typeof import('react')>('react');
  return {
    WebView: function MockWebView({ ref, ...props }: Record<string, unknown>) {
      useImperativeHandle(ref as React.Ref<unknown>, () => ({
        injectJavaScript: jest.fn(),
      }));
      return <View {...props} testID="field-map-webview" />;
    },
  };
});

function message(data: unknown) {
  fireEvent(screen.getByTestId('field-map-webview'), 'message', {
    nativeEvent: { data: JSON.stringify(data) },
  });
}

describe('OpenStreetMap native point selection', () => {
  it('retains corners between consecutive native click messages', () => {
    const change = jest.fn();
    render(
      <MapCanvas
        point={null}
        onSelect={jest.fn()}
        boundary={[]}
        onBoundaryChange={change}
      />,
    );
    message({ type: 'point', point: { lat: 41, lon: 2 } });
    message({ type: 'point', point: { lat: 41.1, lon: 2.1 } });
    expect(change).toHaveBeenLastCalledWith([
      { lat: 41, lon: 2 },
      { lat: 41.1, lon: 2.1 },
    ]);
  });
  it('adds new points to the active excluded zone instead of the outer ring', () => {
    const change = jest.fn();
    render(
      <MapCanvas
        point={null}
        onSelect={jest.fn()}
        boundary={[{ lat: 0, lon: 0 }]}
        excludedZones={[[{ lat: 0.1, lon: 0.1 }]]}
        activeZone={0}
        onBoundaryChange={change}
      />,
    );
    message({ type: 'point', point: { lat: 0.2, lon: 0.2 } });
    expect(change).toHaveBeenCalledWith([
      { lat: 0.1, lon: 0.1 },
      { lat: 0.2, lon: 0.2 },
    ]);
  });

  it('returns valid coordinates from the map and clears the loading message', () => {
    const onSelect = jest.fn();
    render(<MapCanvas point={null} onSelect={onSelect} />);
    message({ type: 'ready' });
    expect(screen.queryByText('settings.createField.map.loading')).toBeNull();
    message({ type: 'point', point: { lat: 42.5, lon: 1.5 } });
    expect(onSelect).toHaveBeenCalledWith({ lat: 42.5, lon: 1.5 });
  });

  it('rejects malformed and out-of-range messages', () => {
    const onSelect = jest.fn();
    render(<MapCanvas point={null} onSelect={onSelect} />);
    message({ type: 'point', point: { lat: 100, lon: 1 } });
    message({ type: 'point', point: { lat: 42, lon: 181 } });
    message({ type: 'point', point: { lat: '42', lon: 1 } });
    message(null);
    fireEvent(screen.getByTestId('field-map-webview'), 'message', {
      nativeEvent: { data: '{broken' },
    });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows a fallback on map errors and recovers after loading', () => {
    render(<MapCanvas point={null} onSelect={jest.fn()} />);
    message({ type: 'error' });
    expect(screen.getByText('settings.createField.map.loadError')).toBeTruthy();
    message({ type: 'ready' });
    expect(screen.queryByText('settings.createField.map.loadError')).toBeNull();
  });

  it('keeps navigation inside the local document', () => {
    render(<MapCanvas point={null} onSelect={jest.fn()} />);
    const shouldLoad =
      screen.getByTestId('field-map-webview').props
        .onShouldStartLoadWithRequest;
    expect(shouldLoad({ url: 'about:blank' })).toBe(true);
    expect(shouldLoad({ url: 'https://example.com/' })).toBe(false);
  });
});
