import { Platform } from 'react-native';

export type ResponsiveProfile = {
  compact: boolean;
  compactPhone: boolean;
  tablet: boolean;
  wideTablet: boolean;
  compactLandscape: boolean;
  shortScreen: boolean;
};

export function getResponsiveProfile(
  width: number,
  height: number,
): ResponsiveProfile {
  return {
    compact: width < 360,
    compactPhone: width < 560,
    tablet: width >= 600,
    wideTablet: width >= 680,
    compactLandscape: width > height && height < 600,
    shortScreen: height < 700,
  };
}

type ResponsiveValues<T> = Partial<
  Record<keyof ResponsiveProfile, T>
> & { default: T };

const RESPONSIVE_PRIORITY: (keyof ResponsiveProfile)[] = [
  'compactLandscape',
  'compact',
  'compactPhone',
  'shortScreen',
  'wideTablet',
  'tablet',
];

export function responsiveValue<T>(
  profile: ResponsiveProfile,
  values: ResponsiveValues<T>,
): T {
  for (const breakpoint of RESPONSIVE_PRIORITY) {
    if (profile[breakpoint] && breakpoint in values) {
      return values[breakpoint] as T;
    }
  }
  return values.default;
}

export function valueAtWidth<T>(
  width: number,
  breakpoints: readonly (readonly [number, T])[],
  fallback: T,
): T {
  for (const [minimumWidth, value] of breakpoints) {
    if (width >= minimumWidth) return value;
  }
  return fallback;
}

export function getWebScrollStyle(): { overflow: 'scroll' } | undefined {
  if (Platform.OS === 'web') return { overflow: 'scroll' };
  return undefined;
}

