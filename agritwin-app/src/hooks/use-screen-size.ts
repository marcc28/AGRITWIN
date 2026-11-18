import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

const TABLET_WIDTH = 600;
const DESKTOP_WIDTH = 1024;
const WIDE_DESKTOP_WIDTH = 1600;
const COMPACT_WIDTH = 360;

// On web the page is first rendered on the server, where the window size is unknown.
const SERVER_SIZE = { width: 375, height: 812 };

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export function screenSizeFor(width: number): ScreenSize {
  if (width >= DESKTOP_WIDTH) {
    return 'desktop';
  }
  if (width >= TABLET_WIDTH) {
    return 'tablet';
  }
  return 'mobile';
}

export function maxContentWidthFor(width: number): number {
  if (width >= WIDE_DESKTOP_WIDTH) {
    return 1320;
  }
  if (width >= DESKTOP_WIDTH) {
    return 1200;
  }
  if (width >= TABLET_WIDTH) {
    return 960;
  }
  return 560;
}

export function pagePaddingFor(width: number): number {
  if (width < COMPACT_WIDTH) {
    return 12;
  }
  return width >= TABLET_WIDTH ? 24 : 16;
}

export function useScreenSize() {
  const dimensions = useWindowDimensions();
  const [ready, setReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    setReady(true);
  }, []);

  const { width, height } = ready ? dimensions : SERVER_SIZE;
  const size = screenSizeFor(width);
  return {
    width,
    size,
    isWide: size !== 'mobile',
    isDesktop: size === 'desktop',
    isCompactLandscape: width > height && height < 600,
    pagePadding: pagePaddingFor(width),
    contentWidth: maxContentWidthFor(width),
  };
}
