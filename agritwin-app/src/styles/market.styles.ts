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

function getMarketGridMetrics(width: number) {
  const tablet = width >= 600;
  const columns = width >= 1600 ? 3 : width >= 680 ? 2 : 1;
  const maxContentWidth =
    width >= 1600 ? 1320 : width >= 1024 ? 1200 : tablet ? 960 : 560;
  const columnGap = tablet ? 16 : 12;

  return { columns, maxContentWidth, columnGap };
}

function getMarketViewportMetrics(width: number) {
  const compact = width < 360;
  const tablet = width >= 600;
  return {
    compact,
    horizontalInset: compact ? 12 : tablet ? 24 : 16,
  };
}

function getMarketThumbSize(
  compact: boolean,
  compactLandscape: boolean,
  columns: number,
) {
  if (compact) return 52;
  if (compactLandscape) return 48;
  return columns > 1 ? 64 : 76;
}

function getMarketLayoutMetrics(width: number, height: number) {
  const compactLandscape = width > height && height < 600;
  const grid = getMarketGridMetrics(width);
  const viewport = getMarketViewportMetrics(width);

  return {
    ...grid,
    ...viewport,
    compactLandscape,
    contentWidth:
      Math.min(width, grid.maxContentWidth) - viewport.horizontalInset * 2,
    thumb: getMarketThumbSize(viewport.compact, compactLandscape, grid.columns),
  };
}

function getMarketSearchMetrics(compact: boolean, compactLandscape: boolean) {
  return {
    marginTop: compactLandscape ? 6 : 12,
    marginBottom: compactLandscape ? 2 : 4,
    paddingHorizontal: compact ? 12 : 14,
    minHeight: compactLandscape ? 40 : 46,
    fontSize: compactLandscape ? 14 : 16,
  };
}

function getMarketListMetrics(
  width: number,
  compactLandscape: boolean,
  columns: number,
  columnGap: number,
) {
  return {
    justifyContent:
      columns === 1 ? ('center' as const) : ('flex-start' as const),
    paddingTop: compactLandscape ? 6 : width < 600 ? 10 : 16,
    paddingBottom: compactLandscape ? 6 : 16,
    gap: compactLandscape ? 8 : columnGap,
  };
}

function getMarketCardMetrics(compactLandscape: boolean, compact: boolean) {
  const compactCard = compactLandscape || compact;
  return {
    borderRadius: compactLandscape ? 16 : 20,
    padding: compactLandscape ? 10 : 14,
    gap: compactLandscape ? 8 : 13,
    topGap: compactCard ? 8 : 12,
    nameFontSize: compactLandscape ? 15 : compact ? 16 : 18,
    detailFontSize: compactCard ? 11 : 13,
    stockMarginTop: compactLandscape ? 5 : 8,
    stockPaddingVertical: compactLandscape ? 3 : 5,
    stockFontSize: compactCard ? 10 : 12,
  };
}

function getMarketPriceMetrics(compactLandscape: boolean, compact: boolean) {
  const compactCard = compactLandscape || compact;
  return {
    mainPaddingVertical: compactLandscape ? 5 : 8,
    mainPaddingHorizontal: compactCard ? 8 : 11,
    mainMinWidth: compactCard ? 76 : 88,
    valueFontSize: compactLandscape ? 18 : 21,
    currencyFontSize: compactLandscape ? 12 : 13,
    bottomPaddingTop: compactLandscape ? 6 : 10,
    smallInfoFontSize: compactLandscape ? 12 : 14,
    buttonMinHeight: compactLandscape ? 34 : 40,
    buttonPaddingVertical: compactLandscape ? 7 : 10,
    buttonPaddingHorizontal: compactLandscape || compact ? 14 : 20,
    buttonFontSize: compactLandscape ? 12 : 14,
  };
}

function getMarketFooterMetrics(
  compactLandscape: boolean,
  horizontalInset: number,
) {
  return {
    loadMorePaddingTop: compactLandscape ? 4 : 8,
    loadMorePaddingBottom: compactLandscape ? 4 : 12,
    bannerPaddingHorizontal: compactLandscape ? 8 : horizontalInset,
  };
}

export function getMarketStyles(
  colors: ThemeColors,
  { width = 390, height = 844 }: MarketDimensions = {},
) {
  const p = getMarketPalette(colors);
  const layout = getMarketLayoutMetrics(width, height);
  const search = getMarketSearchMetrics(
    layout.compact,
    layout.compactLandscape,
  );
  const list = getMarketListMetrics(
    width,
    layout.compactLandscape,
    layout.columns,
    layout.columnGap,
  );
  const card = getMarketCardMetrics(layout.compactLandscape, layout.compact);
  const price = getMarketPriceMetrics(layout.compactLandscape, layout.compact);
  const footer = getMarketFooterMetrics(
    layout.compactLandscape,
    layout.horizontalInset,
  );
  const cardWidth =
    (layout.contentWidth - layout.columnGap * (layout.columns - 1)) /
    layout.columns;

  return StyleSheet.create({
    // Cerca
    searchWrap: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: layout.contentWidth,
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: search.marginTop,
      marginBottom: search.marginBottom,
      paddingHorizontal: search.paddingHorizontal,
      minHeight: search.minHeight,
      borderRadius: 23,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.line,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      fontSize: search.fontSize,
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
      maxWidth: layout.maxContentWidth,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: list.justifyContent,
      alignItems: 'flex-start',
      paddingHorizontal: layout.horizontalInset,
      paddingTop: list.paddingTop,
      paddingBottom: list.paddingBottom,
      gap: list.gap,
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
      borderRadius: card.borderRadius,
      borderWidth: 1,
      borderColor: p.line,
      padding: card.padding,
      gap: card.gap,
    },
    priceTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: card.topGap,
    },
    thumb: {
      width: layout.thumb,
      height: layout.thumb,
      borderRadius: 12,
      backgroundColor: p.placeholder,
    },
    thumbFallback: {
      width: layout.thumb,
      height: layout.thumb,
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
      fontSize: card.nameFontSize,
      fontWeight: '700',
      color: p.ink,
      letterSpacing: -0.2,
    },
    detail: {
      fontSize: card.detailFontSize,
      fontStyle: 'italic',
      color: p.muted,
      marginTop: 1,
    },
    stockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      marginTop: card.stockMarginTop,
      paddingHorizontal: 9,
      paddingVertical: card.stockPaddingVertical,
      borderRadius: 999,
      backgroundColor: colors.successBackground,
    },
    stockDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    stockText: {
      fontSize: card.stockFontSize,
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
      paddingVertical: price.mainPaddingVertical,
      paddingHorizontal: price.mainPaddingHorizontal,
      minWidth: price.mainMinWidth,
    },
    priceValue: {
      fontSize: price.valueFontSize,
      fontWeight: '800',
      color: p.tagText,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.6,
    },
    priceCurrency: {
      fontSize: price.currencyFontSize,
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
      paddingTop: price.bottomPaddingTop,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.line,
    },
    smallInfo: {
      fontSize: price.smallInfoFontSize,
      color: p.muted,
      fontVariant: ['tabular-nums'],
    },
    buyBtn: {
      backgroundColor: p.accent,
      minHeight: price.buttonMinHeight,
      paddingVertical: price.buttonPaddingVertical,
      paddingHorizontal: price.buttonPaddingHorizontal,
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
      fontSize: price.buttonFontSize,
    },
    buyTextDisabled: {
      color: p.muted,
    },
    loadMoreWrap: {
      width: '100%',
      alignItems: 'center',
      paddingTop: footer.loadMorePaddingTop,
      paddingBottom: footer.loadMorePaddingBottom,
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
      maxWidth: Math.min(width, layout.maxContentWidth),
      paddingHorizontal: footer.bannerPaddingHorizontal,
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
