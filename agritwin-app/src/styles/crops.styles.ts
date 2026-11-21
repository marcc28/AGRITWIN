import { StyleSheet } from 'react-native';

import { Colors } from '../constants/theme';
import {
  getResponsiveProfile,
  getWebScrollStyle,
  responsiveValue,
  valueAtWidth,
} from './responsiveLayout';

export function getCropsStyles(width: number, height: number) {
  const profile = getResponsiveProfile(width, height);
  const maxWidth = valueAtWidth(
    width,
    [
      [1600, 1320],
      [1024, 1200],
      [600, 960],
    ],
    560,
  );
  const horizontalInset = responsiveValue(profile, {
    compact: 12,
    tablet: 24,
    default: 16,
  });

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: Colors.light.background,
    },
    scroll: {
      flex: 1,
      width: '100%',
      ...getWebScrollStyle(),
    },
    scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: horizontalInset,
      paddingTop: responsiveValue(profile, {
        compactLandscape: 12,
        tablet: 28,
        default: 20,
      }),
      paddingBottom: responsiveValue(profile, {
        compactLandscape: 16,
        default: 48,
      }),
    },
    container: {
      width: '100%',
      maxWidth,
    },
    date: {
      fontSize: responsiveValue(profile, { compact: 10, default: 11 }),
      letterSpacing: 1.2,
      color: Colors.light.textMuted,
    },
    title: {
      marginTop: 4,
      marginBottom: responsiveValue(profile, {
        compactLandscape: 8,
        tablet: 20,
        default: 14,
      }),
      fontSize: responsiveValue(profile, {
        compact: 22,
        tablet: 28,
        default: 24,
      }),
      fontWeight: 'bold',
      color: Colors.light.primaryDark,
    },
  });
}
