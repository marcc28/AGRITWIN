import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export const createRecommendationsStyles = (isDark: boolean) => {
  const colors = isDark ? Colors.dark : Colors.light;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    scrollContent: {
      padding: 20,
      paddingBottom: 40,
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
      marginBottom: 24,
    },

    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },

    title: {
      fontSize: 26,
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
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
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
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
      lineHeight: 25,
    },

    description: {
      fontSize: 14,
      lineHeight: 22,
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
