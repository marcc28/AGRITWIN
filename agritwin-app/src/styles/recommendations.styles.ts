import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import {
  getResponsiveProfile,
  responsiveValue,
  valueAtWidth,
} from './responsiveLayout';

function getThemeColors(isDark: boolean) {
  return isDark ? Colors.dark : Colors.light;
}

export const createRecommendationsStyles = (
  isDark: boolean,
  width = 390,
  height = 844,
) => {
  const colors = getThemeColors(isDark);
  const profile = getResponsiveProfile(width, height);
  const topMargin = responsiveValue(profile, {
    compactLandscape: 12,
    shortScreen: 22,
    wideTablet: 32,
    default: 24,
  });
  const columns = valueAtWidth(width, [[1500, 3], [680, 2]], 1);
  const maxWidth = valueAtWidth(
    width,
    [[1600, 1320], [1024, 1200], [680, 960]],
    560,
  );
  const horizontalInset = responsiveValue(profile, {
    compact: 12,
    wideTablet: 24,
    default: 16,
  });
  const gap = responsiveValue(profile, {
    compactLandscape: 8,
    wideTablet: 16,
    default: 12,
  });
  const contentWidth = Math.min(width, maxWidth) - horizontalInset * 2;
  const cardWidth = Math.max(0, (contentWidth - gap * (columns - 1)) / columns);
  const cardPadding = responsiveValue(profile, {
    compactLandscape: 10,
    compact: 14,
    wideTablet: 20,
    default: 18,
  });

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: horizontalInset,
      paddingTop: topMargin,
      paddingBottom: responsiveValue(profile, {
        compactLandscape: 16,
        default: 40,
      }),
    },

    content: {
      width: '100%',
      maxWidth,
    },

    recommendationGrid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap,
    },

    backButton: {
      alignSelf: 'flex-start',
      justifyContent: 'center',
      width: 44,
      height: 44,
      marginBottom: 8,
    },

    backButtonIcon: {
      width: 24,
      height: 24,
    },

    header: {
      marginBottom: responsiveValue(profile, {
        compactLandscape: 12,
        wideTablet: 20,
        default: 24,
      }),
    },

    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },

    title: {
      fontSize: responsiveValue(profile, {
        compact: 23,
        wideTablet: 30,
        default: 26,
      }),
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },

    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },

    fieldLabel: {
      marginTop: 14,
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },

    refreshButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },

    refreshButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 13,
    },

    resultsCount: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 14,
    },

    recommendationCard: {
      width: cardWidth,
      backgroundColor: colors.surface,
      borderRadius: responsiveValue(profile, {
        compactLandscape: 13,
        default: 16,
      }),
      padding: cardPadding,
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.06,
      shadowRadius: 5,
    },

    cardHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },

    categoryContainer: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },

    category: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primaryDark,
      textTransform: 'capitalize',
    },

    severityBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },

    severityText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },

    recommendationTitle: {
      fontSize: responsiveValue(profile, {
        compact: 16,
        wideTablet: 19,
        default: 18,
      }),
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
      lineHeight: 25,
    },

    description: {
      fontSize: responsiveValue(profile, { compact: 13, default: 14 }),
      lineHeight: responsiveValue(profile, { compact: 19, default: 22 }),
      color: colors.textSecondary,
    },

    reasonContainer: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 14,
      marginTop: 18,
    },

    reasonTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 8,
    },

    reason: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
    },

    dataItem: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 6,
    },

    dateContainer: {
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    dateText: {
      fontSize: 11,
      color: colors.textMuted,
      marginBottom: 5,
    },

    centerContainer: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 50,
    },

    loadingText: {
      marginTop: 12,
      color: colors.textSecondary,
      fontSize: 14,
    },

    errorText: {
      color: colors.dangerText,
      fontSize: 14,
      textAlign: 'center',
    },

    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 16,
    },

    retryText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },

    emptyContainer: {
      width: '100%',
      alignItems: 'center',
      paddingVertical: 50,
      paddingHorizontal: 20,
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
      textAlign: 'center',
    },

    emptyText: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
};
