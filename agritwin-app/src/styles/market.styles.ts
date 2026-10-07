import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export const getMarketStyles = (
  colors: typeof Colors.light
) => {
  const styles = StyleSheet.create({
    trackWrap: {
      paddingHorizontal: 20,
      paddingTop: 12,
    },

    track: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 24,
      padding: 4,
      gap: 8,
    },

    segment: {
      flex: 1,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },

    segmentOn: {
      backgroundColor: colors.primary,
    },

    segmentOff: {
      backgroundColor: colors.surface,
    },

    segmentText: {
      fontSize: 15,
      fontWeight: '700',
    },

    segmentTextOn: {
      color: colors.surface,
    },

    segmentTextOff: {
      color: colors.text,
    },

    list: {
      padding: 20,
      gap: 14,
      paddingBottom: 24,
    },

    priceCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 12,
      marginBottom: 10,

      shadowColor: colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },

    priceTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    productName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },

    detail: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },

    priceMain: {
      marginLeft: 10,
      alignItems: 'flex-end',
    },

    priceValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.primary,
    },

    priceBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      paddingTop: 9,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    smallInfo: {
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 12,
    },

    buyBtn: {
      marginLeft: 'auto',
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
    },

    buyText: {
      color: colors.surface,
      fontSize: 12,
      fontWeight: '600',
    },

    chip: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 3,
      borderRadius: 14,
      marginBottom: 8,
    },

    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.surface,
    },

    newsTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },

    newsBody: {
      fontSize: 14,
      color: colors.text,
      marginTop: 8,
      lineHeight: 20,
    },

    source: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: 10,
    },
  });

  return styles;
};