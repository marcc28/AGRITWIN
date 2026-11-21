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

export function getProductPalette(colors: ThemeColors) {
  return {
    background: colors.background,
    surface: colors.surface,
    surfaceSecondary: colors.surfaceSecondary,
    primary: colors.primary,
    primaryDark: colors.primaryDark,
    text: colors.text,
    muted: colors.textSecondary,
    subtle: colors.textMuted,
    border: colors.border,
    successBackground: colors.successBackground,
    successText: colors.successText,
    dangerBackground: colors.dangerBackground,
    dangerText: colors.dangerText,
    shadow: colors.shadow,
  };
}

function getProductFrameMetrics(
  compact: boolean,
  tablet: boolean,
  desktop: boolean,
  landscape: boolean,
) {
  return {
    horizontalPadding: compact ? 14 : tablet ? 28 : 20,
    cardPadding: compact ? 17 : tablet ? 28 : 22,
    maxWidth: desktop ? 1080 : tablet ? 850 : 500,
    contentPaddingTop: landscape ? 12 : tablet ? 28 : 20,
    cardRadius: compact ? 18 : 24,
    topLineMarginBottom: compact ? 18 : 24,
    heroMarginBottom: compact ? 20 : 26,
  };
}

function getProductHeroMetrics(
  compact: boolean,
  tablet: boolean,
  wideLayout: boolean,
) {
  return {
    direction: wideLayout ? ('row' as const) : ('column' as const),
    gap: wideLayout ? 28 : 0,
    imageWidth: wideLayout ? ('46%' as const) : ('100%' as const),
    imageAspectRatio: wideLayout ? 1.25 : tablet ? 2 : 1.6,
    imageMaxHeight: wideLayout ? 420 : tablet ? 320 : 230,
    imageBorderRadius: compact ? 13 : 18,
    imageMarginBottom: wideLayout ? 0 : compact ? 17 : 22,
    headerFlex: wideLayout ? 1 : undefined,
    headerAlignment: wideLayout ? ('flex-start' as const) : ('center' as const),
  };
}

function getProductTextMetrics(
  compact: boolean,
  tablet: boolean,
  wideLayout: boolean,
) {
  return {
    titleFontSize: compact ? 23 : tablet ? 32 : 28,
    titleLineHeight: compact ? 30 : tablet ? 39 : 35,
    textAlignment: wideLayout ? ('left' as const) : ('center' as const),
    descriptionFontSize: compact ? 12 : 14,
    priceDirection: compact ? ('column' as const) : ('row' as const),
    priceAlignment: compact ? ('flex-start' as const) : ('center' as const),
    priceFontSize: compact ? 32 : tablet ? 40 : 36,
  };
}

function getProductOrderMetrics(compact: boolean, tablet: boolean) {
  return {
    sectionTitleFontSize: compact ? 16 : 18,
    quantityPadding: compact ? 13 : 17,
    quantityGap: compact ? 12 : 18,
    quantityButtonSize: compact ? 40 : 46,
    quantityInputWidth: compact ? 118 : 145,
    quantityInputHeight: compact ? 44 : 50,
    quantityFontSize: compact ? 20 : 24,
    totalPadding: compact ? 13 : 16,
    totalPriceFontSize: compact ? 21 : tablet ? 29 : 25,
  };
}

export function getProductStyles(
  colors: ThemeColors,
  width = 390,
  height = 844,
) {
  const C = getProductPalette(colors);

  const compact = width < 360;
  const tablet = width >= 600;
  const desktop = width >= 1024;
  const wideLayout = width >= 760;
  const landscape = width > height && height < 600;

  const frame = getProductFrameMetrics(compact, tablet, desktop, landscape);
  const hero = getProductHeroMetrics(compact, tablet, wideLayout);
  const text = getProductTextMetrics(compact, tablet, wideLayout);
  const order = getProductOrderMetrics(compact, tablet);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: C.background,
    },

    scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: frame.horizontalPadding,
      paddingTop: frame.contentPaddingTop,
      paddingBottom: 40,
    },

    card: {
      width: '100%',
      maxWidth: frame.maxWidth,
      backgroundColor: C.surface,
      borderRadius: frame.cardRadius,
      padding: frame.cardPadding,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',

      shadowColor: C.shadow,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 4,
    },

    decoration: {
      ...StyleSheet.absoluteFillObject,
    },

    decorCircleLarge: {
      position: 'absolute',
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: C.primary,
      opacity: 0.08,
      top: -75,
      right: -55,
    },

    decorCircleSmall: {
      position: 'absolute',
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: C.successBackground,
      opacity: 0.5,
      bottom: 200,
      left: -45,
    },

    decorCircleTiny: {
      position: 'absolute',
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: C.primary,
      opacity: 0.7,
      top: 65,
      right: 30,
    },

    topLine: {
      height: 4,
      width: 55,
      alignSelf: 'center',
      borderRadius: 4,
      backgroundColor: C.primary,
      marginBottom: frame.topLineMarginBottom,
    },

    hero: {
      width: '100%',
      flexDirection: hero.direction,
      alignItems: 'center',
      gap: hero.gap,
      marginBottom: frame.heroMarginBottom,
    },

    productImage: {
      width: hero.imageWidth,
      aspectRatio: hero.imageAspectRatio,
      maxHeight: hero.imageMaxHeight,
      borderRadius: hero.imageBorderRadius,
      marginBottom: hero.imageMarginBottom,
      backgroundColor: C.surfaceSecondary,
    },

    header: {
      flex: hero.headerFlex,
      alignItems: hero.headerAlignment,
      justifyContent: 'center',
      marginBottom: 0,
    },

    eyebrow: {
      color: C.primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 2,
      marginBottom: 10,
    },

    title: {
      color: C.text,
      fontSize: text.titleFontSize,
      lineHeight: text.titleLineHeight,
      fontWeight: '900',
      textAlign: text.textAlignment,
    },

    description: {
      color: C.muted,
      fontSize: text.descriptionFontSize,
      lineHeight: 21,
      textAlign: text.textAlignment,
      marginTop: 8,
    },

    priceSection: {
      flexDirection: text.priceDirection,
      alignItems: text.priceAlignment,
      justifyContent: 'space-between',
      gap: 14,
      marginBottom: 22,
    },

    priceInfo: {
      flex: 1,
    },

    priceLabel: {
      color: C.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      marginBottom: 5,
    },

    price: {
      color: C.primaryDark,
      fontSize: text.priceFontSize,
      fontWeight: '900',
      letterSpacing: -1,
    },

    priceUnit: {
      color: C.muted,
      fontSize: 13,
      marginTop: 2,
    },

    stockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: C.successBackground,
      borderColor: C.successText,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 30,
      maxWidth: '100%',
    },

    stockBadgeEmpty: {
      backgroundColor: C.dangerBackground,
      borderColor: C.dangerText,
    },

    stockDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: C.successText,
    },

    stockDotEmpty: {
      backgroundColor: C.dangerText,
    },

    stockText: {
      color: C.successText,
      fontSize: 12,
      fontWeight: '700',
      flexShrink: 1,
    },

    stockTextEmpty: {
      color: C.dangerText,
    },

    separator: {
      height: 1,
      backgroundColor: C.border,
      marginBottom: 22,
    },

    infoPanel: {
      backgroundColor: C.surfaceSecondary,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 5,
      marginBottom: 25,
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 12,
    },

    infoIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: C.successBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },

    infoIconText: {
      color: C.successText,
      fontSize: 19,
      fontWeight: '800',
    },

    infoContent: {
      flex: 1,
      minWidth: 0,
    },

    infoLabel: {
      color: C.muted,
      fontSize: 11,
      marginBottom: 4,
    },

    infoValue: {
      color: C.text,
      fontSize: 13,
      fontWeight: '700',
    },

    infoValueEmpty: {
      color: C.dangerText,
    },

    sectionTitle: {
      color: C.text,
      fontSize: order.sectionTitleFontSize,
      fontWeight: '800',
      marginBottom: 13,
    },

    quantityPanel: {
      backgroundColor: C.surfaceSecondary,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 17,
      padding: order.quantityPadding,
      marginBottom: 17,
    },

    quantityHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 17,
    },

    quantityTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: '800',
    },

    quantityHint: {
      color: C.muted,
      fontSize: 12,
      marginTop: 4,
    },

    quantityUnit: {
      color: C.primaryDark,
      backgroundColor: C.successBackground,
      overflow: 'hidden',
      borderRadius: 8,
      paddingHorizontal: 11,
      paddingVertical: 6,
      fontSize: 12,
      fontWeight: '800',
    },

    quantityRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: order.quantityGap,
    },

    quantityButton: {
      width: order.quantityButtonSize,
      height: order.quantityButtonSize,
      borderRadius: 13,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    disabledButton: {
      opacity: 0.3,
    },

    quantityButtonText: {
      color: '#FFFFFF',
      fontSize: 25,
      fontWeight: '700',
      lineHeight: 29,
    },

    quantityValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      width: order.quantityInputWidth,
      height: order.quantityInputHeight,
      justifyContent: 'center',
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 13,
      paddingHorizontal: 10,
    },

    quantityValue: {
      flex: 1,
      color: C.text,
      fontSize: order.quantityFontSize,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
      textAlign: 'center',
      paddingVertical: 0,
      minWidth: 0,
    },

    quantityValueUnit: {
      color: C.muted,
      fontSize: 13,
      flexShrink: 0,
    },

    totalPanel: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      backgroundColor: C.successBackground,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 16,
      padding: order.totalPadding,
      marginBottom: 17,
    },

    totalLabel: {
      color: C.successText,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
    },

    totalHint: {
      color: C.text,
      fontSize: 11,
      marginTop: 7,
    },

    totalPrice: {
      color: C.primaryDark,
      fontSize: order.totalPriceFontSize,
      fontWeight: '900',
      flexShrink: 0,
      fontVariant: ['tabular-nums'],
    },

    footerText: {
      color: C.muted,
      textAlign: 'center',
      fontSize: 10,
      letterSpacing: 0.5,
      marginTop: 20,
    },

    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 18,
      marginTop: 16,
      borderRadius: 14,
      backgroundColor: C.surfaceSecondary,
      borderWidth: 1,
      borderColor: C.border,
    },

    backButtonText: {
      color: C.primaryDark,
      fontSize: 14,
      fontWeight: '700',
    },

    backArrow: {
      fontSize: 25,
      lineHeight: 28,
      color: C.primaryDark,
      fontWeight: '600',
    },

    backButtonPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
  });
}
