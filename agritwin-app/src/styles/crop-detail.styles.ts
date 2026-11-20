import { StyleSheet } from 'react-native';

import { Colors } from '../constants/theme';
import {
  getResponsiveProfile,
  getWebScrollStyle,
  responsiveValue,
  valueAtWidth,
} from './responsiveLayout';

export function getCropDetailStyles(width: number, height: number) {
  const profile = getResponsiveProfile(width, height);
  const columns = valueAtWidth(width, [[1600, 3], [680, 2]], 1);
  const maxWidth = valueAtWidth(
    width,
    [[1600, 1320], [1024, 1200], [600, 960]],
    560,
  );
  const topMargin = responsiveValue(profile, {
    compactLandscape: 4,
    shortScreen: 14,
    tablet: 30,
    default: 22,
  });
  const horizontalInset = responsiveValue(profile, {
    compact: 12,
    tablet: 24,
    default: 16,
  });
  const cardPadding = responsiveValue(profile, {
    compact: 12,
    tablet: 22,
    default: 16,
  });
  const gap = responsiveValue(profile, {
    compactLandscape: 8,
    tablet: 16,
    default: 12,
  });
  const compactFont = responsiveValue(profile, {
    compact: 13,
    default: 14,
  });
  const contentWidth = Math.min(width, maxWidth) - horizontalInset * 2;
  const cropWidth = Math.max(
    0,
    (contentWidth - cardPadding * 2 - gap * (columns - 1)) / columns,
  );

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
        compactLandscape: 10,
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
      marginTop: topMargin,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginBottom: responsiveValue(profile, {
        compactLandscape: 10,
        default: 18,
      }),
      gap: 4,
    },
    backText: {
      fontSize: responsiveValue(profile, { compact: 13, default: 14 }),
      fontWeight: '600',
      color: Colors.light.textSecondary,
    },
    eyebrow: {
      fontSize: 11,
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
        tablet: 30,
        default: 26,
      }),
      fontWeight: 'bold',
      color: Colors.light.primaryDark,
    },
    card: {
      width: '100%',
      marginTop: 14,
      backgroundColor: Colors.light.surface,
      borderRadius: 22,
      padding: cardPadding,
      shadowColor: Colors.light.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 10,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: compactFont,
      fontWeight: '700',
      color: Colors.light.textSecondary,
      marginBottom: 8,
    },
    cropsList: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap,
    },
    cropRow: {
      width: cropWidth,
      minHeight: responsiveValue(profile, {
        compactLandscape: 42,
        default: 48,
      }),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      backgroundColor: Colors.light.background,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: responsiveValue(profile, {
        compact: 10,
        default: 12,
      }),
      borderWidth: 1,
      borderColor: Colors.light.border,
    },
    cropName: {
      flex: 1,
      minWidth: 0,
      fontSize: compactFont,
      fontWeight: '600',
      color: Colors.light.text,
    },
    status: {
      flexShrink: 0,
      fontSize: responsiveValue(profile, { compact: 11, default: 12 }),
      fontWeight: '700',
    },
    statusOn: {
      color: '#2F9E44',
    },
    statusPlanned: {
      color: '#B7791F',
    },
    statusHarvested: {
      color: Colors.light.textMuted,
    },
    emptyText: {
      marginTop: 8,
      fontSize: compactFont,
      color: Colors.light.textSecondary,
    },
    errorText: {
      marginBottom: 10,
      fontSize: 13,
      color: Colors.light.dangerText,
    },
    editButton: {
      alignSelf: responsiveValue(profile, {
        tablet: 'flex-end' as const,
        default: 'stretch' as const,
      }),
      width: responsiveValue<number | '100%'>(profile, {
        tablet: 280,
        default: '100%',
      }),
      minHeight: responsiveValue(profile, {
        compactLandscape: 40,
        default: 46,
      }),
      marginTop: 16,
      borderRadius: 15,
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.light.primary,
    },
    editText: {
      fontSize: compactFont,
      fontWeight: '700',
      color: Colors.light.surface,
    },
  });
}
