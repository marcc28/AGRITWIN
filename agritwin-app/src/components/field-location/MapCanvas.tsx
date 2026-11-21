import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useTranslation } from 'react-i18next';

import { isMapPoint, type MapCanvasProps } from './types';
import { mapDocument } from './mapDocument';
import { Colors } from '../../constants/theme';

const BASE_URL = 'https://agritwin.com/';

function openAttribution(url: string) {
  if (
    url === 'https://www.openstreetmap.org/copyright' ||
    url === 'https://leafletjs.com' ||
    url === 'https://leafletjs.com/'
  ) {
    void Linking.openURL(url).catch(() => undefined);
  }
}

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
  const webView = useRef<WebView>(null);
  const cornersRef = useRef(
    activeZone == null ? (boundary ?? []) : (excludedZones[activeZone] ?? []),
  );
  const [source] = useState(() => ({
    html: mapDocument(
      point,
      onBoundaryChange ? (boundary ?? []) : undefined,
      excludedZones,
      activeZone,
      readOnly,
    ),
    baseUrl: BASE_URL,
  }));
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    cornersRef.current =
      activeZone == null ? (boundary ?? []) : (excludedZones[activeZone] ?? []);
    webView.current?.injectJavaScript(
      onBoundaryChange
        ? `window.setFieldGeometry && window.setFieldGeometry(${JSON.stringify({ boundary: boundary ?? [], excludedZones, activeZone, readOnly })}); true;`
        : `window.setFieldPoint && window.setFieldPoint(${JSON.stringify(point)}); true;`,
    );
  }, [point, boundary, onBoundaryChange, excludedZones, activeZone, readOnly]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message: unknown = JSON.parse(event.nativeEvent.data);
      if (!message || typeof message !== 'object' || !('type' in message))
        return;
      if (message.type === 'ready') setStatus('ready');
      if (message.type === 'error') setStatus('loadError');
      if (
        !readOnly &&
        message.type === 'point' &&
        'point' in message &&
        isMapPoint(message.point)
      ) {
        if (onBoundaryChange) {
          const corners = [...cornersRef.current, message.point];
          cornersRef.current = corners;
          onBoundaryChange(corners);
        } else onSelect(message.point);
      }
    } catch {
      // Ignore malformed messages from the map renderer.
    }
  }

  return (
    <View style={styles.map}>
      <WebView
        ref={webView}
        source={source}
        style={styles.map}
        originWhitelist={['*']}
        onMessage={handleMessage}
        applicationNameForUserAgent="AGRITWIN/1.0 (+https://github.com/marcc28/AGRITWIN)"
        cacheEnabled
        mixedContentMode="never"
        allowFileAccess={false}
        geolocationEnabled={false}
        thirdPartyCookiesEnabled={false}
        javaScriptCanOpenWindowsAutomatically={false}
        onError={() => setStatus('loadError')}
        onHttpError={() => setStatus('loadError')}
        onOpenWindow={({ nativeEvent }) =>
          openAttribution(nativeEvent.targetUrl)
        }
        onShouldStartLoadWithRequest={(request) => {
          if (request.url === 'about:blank' || request.url === BASE_URL)
            return true;
          openAttribution(request.url);
          return false;
        }}
      />
      {status !== 'ready' ? (
        <View style={styles.message}>
          <Text accessibilityRole="alert" style={styles.text}>
            {t(`settings.createField.map.${status}`)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  message: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.light.surface,
  },
  text: { color: Colors.light.textSecondary, textAlign: 'center' },
});
