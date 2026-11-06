import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

type ThemeColors = typeof Colors.light | typeof Colors.dark;

export function getMarketStyles(
  colors: ThemeColors,
  compactLandscape = false,
) {
  return StyleSheet.create({
    trackWrap: {
      paddingHorizontal: compactLandscape ? 16 : 20,
      paddingTop: compactLandscape ? 6 : 12,
    },

    track: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 24,
      padding: compactLandscape ? 3 : 4,
      gap: compactLandscape ? 6 : 8,
    },

    segment: {
      flex: 1,
      height: compactLandscape ? 34 : 40,
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

    scroll: {
      flex: 1,
    },

    list: {
      padding: compactLandscape ? 12 : 20,
      gap: compactLandscape ? 8 : 14,
      paddingBottom: compactLandscape ? 12 : 24,
      flexGrow: 1,
    },

    priceCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: compactLandscape ? 9 : 12,
      marginBottom: compactLandscape ? 4 : 10,

      shadowColor: colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },

    imagePreview: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 190,
      padding: 8,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 12,
      zIndex: 100,
    },

    imagePreviewTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 6,
    },

    imagePreviewImage: {
      width: '100%',
      height: 112,
      borderRadius: 9,
      backgroundColor: colors.surfaceSecondary,
    },

    priceTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    productName: {
      fontSize: compactLandscape ? 16 : 18,
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
      fontSize: compactLandscape ? 18 : 20,
      fontWeight: '700',
      color: colors.primary,
    },

    priceBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: compactLandscape ? 6 : 10,
      paddingTop: compactLandscape ? 6 : 9,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    smallInfo: {
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 12,
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

    pagination: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      paddingHorizontal: 20,
      paddingVertical: compactLandscape ? 6 : 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },

    arrowButton: {
      width: compactLandscape ? 36 : 44,
      height: compactLandscape ? 36 : 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: colors.surfaceSecondary,
    },

    arrowIcon: {
      width: 24,
      height: 24,
    },

    arrowDisabled: {
      opacity: 0.3,
    },

    arrowPressed: {
      opacity: 0.6,
    },

    pageText: {
      minWidth: 48,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },

    statusText: {
      paddingVertical: 24,
      textAlign: 'center',
      fontSize: 14,
      color: colors.textSecondary,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 15,
      marginBottom: 12,
      borderRadius: 14,
      backgroundColor: Colors.light.surface,
      borderWidth: 1,
      borderColor: Colors.light.border,
    },
    backArrow: {
      fontSize: 28,
      lineHeight: 30,
      color: Colors.light.primaryDark,
      fontWeight: '600',
    },
    backButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: Colors.light.primaryDark,
    },
    backButtonPressed: {
      opacity: 0.65,
      transform: [{ scale: 0.97 }],
    },
    buyBtn: {
      marginLeft: 0,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buyBtnHover: {
      backgroundColor: colors.primaryDark,
      borderColor: colors.primaryDark,
    },

    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    searchWrap: {
      marginHorizontal: compactLandscape ? 16 : 20,
      marginTop: compactLandscape ? 8 : 16,
      marginBottom: compactLandscape ? 6 : 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      height: compactLandscape ? 40 : 48,
    },

    searchIcon: {
      fontSize: 18,
      marginRight: 10,
    },

    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
    },

    clearButton: {
      paddingHorizontal: 6,
    },

    clearText: {
      fontSize: 20,
      color: colors.text,
    },

    activeSegmentText: {
      color: '#fff',
    },

    inactiveSegmentText: {
      color: colors.text,
    },

    productInfo: {
      flex: 1,
    },

    heartbeatWrap: {
      marginLeft: 'auto',
    },

    buyBtnDisabled: {
      opacity: 0.45,
    },

    buyBtnPressed: {
      opacity: 0.75,
    },

    priceCardPressed: {
      opacity: 0.7,
    },

    newsCardPressed: {
      opacity: 0.75,
    },
  });
}
