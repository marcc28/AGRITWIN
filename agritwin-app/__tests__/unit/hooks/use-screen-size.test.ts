import { Platform } from 'react-native';
import { renderHook } from '@testing-library/react-native';

import {
  maxContentWidthFor,
  pagePaddingFor,
  screenSizeFor,
  useScreenSize,
} from '../../../src/hooks/use-screen-size';
import { setWindowSize } from '../helpers/screenSize';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('screen size helpers', () => {
  it.each([
    [599, 'mobile'],
    [600, 'tablet'],
    [1023, 'tablet'],
    [1024, 'desktop'],
  ])('treats a %i px screen as %s', (width, size) => {
    expect(screenSizeFor(width)).toBe(size);
  });

  it.each([
    [375, 560],
    [600, 960],
    [1024, 1200],
    [1600, 1320],
  ])('limits the content of a %i px screen to %i px', (width, maxWidth) => {
    expect(maxContentWidthFor(width)).toBe(maxWidth);
  });

  it.each([
    [320, 12],
    [375, 16],
    [600, 24],
  ])('leaves a %i px screen a side margin of %i px', (width, padding) => {
    expect(pagePaddingFor(width)).toBe(padding);
  });
});

describe('useScreenSize', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
  });

  it('describes a desktop screen', () => {
    setWindowSize(1280, 800);

    const { result } = renderHook(() => useScreenSize());

    expect(result.current).toEqual({
      width: 1280,
      size: 'desktop',
      isWide: true,
      isDesktop: true,
      isCompactLandscape: false,
      pagePadding: 24,
      contentWidth: 1200,
    });
  });

  it('detects a phone turned sideways', () => {
    setWindowSize(812, 375);

    const { result } = renderHook(() => useScreenSize());

    expect(result.current.isCompactLandscape).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('starts with a phone size on web until the page is shown', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    setWindowSize(1280, 800);
    const widths: number[] = [];

    renderHook(() => {
      const screenSize = useScreenSize();
      widths.push(screenSize.width);
      return screenSize;
    });

    expect(widths[0]).toBe(375);
    expect(widths.at(-1)).toBe(1280);
  });
});
