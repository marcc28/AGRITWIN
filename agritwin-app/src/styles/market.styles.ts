import { StyleSheet } from 'react-native';

type ThemeColors = {
  primary: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  dangerBackground: string;
  dangerText: string;
  successBackground: string;
  successText: string;
  shadow: string;
};

export function getMarketPalette(colors: ThemeColors) {
  return {
    surface: colors.surface,
    ink: colors.text,
    muted: colors.textSecondary,
    line: colors.border,

    // Preus i etiquetes
    tag: colors.primaryDark,
    tagText: colors.primaryDark,
    priceBackground: colors.successBackground,

    // Botons
    accent: colors.primary,
    accentText: colors.background === '#1E2822' ? '#1E2822' : '#FFFFFF',

    // Estats
    warn: colors.secondary,
    ok: colors.successText,
    error: colors.dangerText,

    // Elements secundaris
    placeholder: colors.surfaceSecondary,
  };
}

type MarketDimensions = {
  width?: number;
  height?: number;
};

export function getMarketStyles(
  colors: ThemeColors,
  { width = 390, height = 844 }: MarketDimensions = {},
) {
  const p = getMarketPalette(colors);
  const compactLandscape = width > height && height < 600;
  const columns = width >= 1600 ? 3 : width >= 680 ? 2 : 1;
  const maxContentWidth =
    width >= 1600 ? 1320 : width >= 1024 ? 1200 : width >= 600 ? 960 : 560;
  const horizontalInset = width < 360 ? 12 : width < 600 ? 16 : 24;
  const columnGap = width < 600 ? 12 : 16;
  const contentWidth = Math.min(width, maxContentWidth) - horizontalInset * 2;
  const cardWidth = (contentWidth - columnGap * (columns - 1)) / columns;
  const thumb =
    width < 360 ? 52 : compactLandscape ? 48 : columns > 1 ? 64 : 76;

  return StyleSheet.create({
    // Cerca
    searchWrap: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: Math.min(width, maxContentWidth) - horizontalInset * 2,
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: compactLandscape ? 6 : 12,
      marginBottom: compactLandscape ? 2 : 4,
      paddingHorizontal: width < 360 ? 12 : 14,
      minHeight: compactLandscape ? 40 : 46,
      borderRadius: 23,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.line,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      fontSize: compactLandscape ? 14 : 16,
      color: p.ink,
      paddingVertical: 0,
    },
    clearButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: p.placeholder,
    },
    clearText: {
      fontSize: 18,
      lineHeight: 20,
      color: p.muted,
    },

    // Llista
    scroll: {
      flex: 1,
      width: '100%',
    },
    list: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: maxContentWidth,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: columns === 1 ? 'center' : 'flex-start',
      alignItems: 'flex-start',
      paddingHorizontal: horizontalInset,
      paddingTop: compactLandscape ? 6 : width < 600 ? 10 : 16,
      paddingBottom: compactLandscape ? 6 : 16,
      gap: compactLandscape ? 8 : columnGap,
    },
    statusText: {
      width: '100%',
      textAlign: 'center',
      color: p.muted,
      fontSize: 15,
      paddingVertical: 24,
    },

    // Targetes de productes
    priceCard: {
      width: cardWidth,
      backgroundColor: p.surface,
      borderRadius: compactLandscape ? 16 : 20,
      borderWidth: 1,
      borderColor: p.line,
      padding: compactLandscape ? 10 : 14,
      gap: compactLandscape ? 8 : 13,
    },
    priceTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: compactLandscape || width < 360 ? 8 : 12,
    },
    thumb: {
      width: thumb,
      height: thumb,
      borderRadius: 12,
      backgroundColor: p.placeholder,
    },
    thumbFallback: {
      width: thumb,
      height: thumb,
      borderRadius: 12,
      backgroundColor: p.placeholder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbFallbackText: {
      fontSize: 26,
      fontWeight: '700',
      color: p.muted,
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    productName: {
      fontSize: compactLandscape ? 15 : width < 360 ? 16 : 18,
      fontWeight: '700',
      color: p.ink,
      letterSpacing: -0.2,
    },
    detail: {
      fontSize: compactLandscape || width < 360 ? 11 : 13,
      fontStyle: 'italic',
      color: p.muted,
      marginTop: 1,
    },
    stockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      marginTop: compactLandscape ? 5 : 8,
      paddingHorizontal: 9,
      paddingVertical: compactLandscape ? 3 : 5,
      borderRadius: 999,
      backgroundColor: colors.successBackground,
    },
    stockDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    stockText: {
      fontSize: compactLandscape || width < 360 ? 10 : 12,
      flexShrink: 1,
      fontWeight: '600',
    },

    // Preus
    priceMain: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      gap: 3,
      backgroundColor: p.priceBackground,
      borderRadius: 14,
      paddingVertical: compactLandscape ? 5 : 8,
      paddingHorizontal: compactLandscape || width < 360 ? 8 : 11,
      minWidth: compactLandscape || width < 360 ? 76 : 88,
    },
    priceValue: {
      fontSize: compactLandscape ? 18 : 21,
      fontWeight: '800',
      color: p.tagText,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.6,
    },
    priceCurrency: {
      fontSize: compactLandscape ? 12 : 13,
      fontWeight: '700',
      color: p.tagText,
    },
    priceUnitHint: {
      fontSize: 11,
      color: p.tagText,
      opacity: 0.7,
      marginTop: 1,
    },

    priceBottom: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: compactLandscape ? 6 : 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.line,
    },
    smallInfo: {
      fontSize: compactLandscape ? 12 : 14,
      color: p.muted,
      fontVariant: ['tabular-nums'],
    },
    buyBtn: {
      backgroundColor: p.accent,
      minHeight: compactLandscape ? 34 : 40,
      paddingVertical: compactLandscape ? 7 : 10,
      paddingHorizontal: compactLandscape ? 14 : width < 360 ? 14 : 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
    },
    buyBtnDisabled: {
      backgroundColor: p.placeholder,
    },
    buyText: {
      color: p.accentText,
      fontWeight: '700',
      fontSize: compactLandscape ? 12 : 14,
    },
    buyTextDisabled: {
      color: p.muted,
    },
    loadMoreWrap: {
      width: '100%',
      alignItems: 'center',
      paddingTop: compactLandscape ? 4 : 8,
      paddingBottom: compactLandscape ? 4 : 12,
    },
    loadMoreButton: {
      minHeight: 44,
      minWidth: 180,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: p.accent,
      borderRadius: 14,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    loadMoreText: {
      color: p.accentText,
      fontSize: 14,
      fontWeight: '700',
    },

    // Paginació
    pagination: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      paddingTop: 10,
      paddingBottom: 12,
    },
    arrowButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.line,
    },
    arrowDisabled: {
      opacity: 0.35,
    },
    arrowPressed: {
      backgroundColor: p.placeholder,
    },
    arrowIcon: {
      width: 18,
      height: 18,
    },
    pageText: {
      minWidth: 82,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '500',
      color: p.ink,
      fontVariant: ['tabular-nums'],
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.line,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    pageCurrent: {
      color: p.accent,
      fontWeight: '800',
      fontSize: 16,
    },
    pageDivider: {
      color: p.muted,
    },
    pageTotal: {
      color: p.muted,
      fontWeight: '600',
    },
    bannerWrap: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: Math.min(width, maxContentWidth),
      paddingHorizontal: compactLandscape ? 8 : horizontalInset,
    },
    imagePreview: {
      position: 'absolute',
      zIndex: 1000,
      width: 190,
      height: 155,
      padding: 8,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,

      shadowColor: colors.shadow,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 10,
    },

    imagePreviewTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },

    imagePreviewImage: {
      width: '100%',
      flex: 1,
      borderRadius: 8,
      backgroundColor: colors.surfaceSecondary,
    },
  });
}
