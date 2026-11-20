import { Platform, StyleSheet } from 'react-native';

import { Colors } from '../constants/theme';

export function getCropDetailStyles(width: number, height: number) {
  const compact = width < 360;
  const tablet = width >= 600;
  const compactLandscape = width > height && height < 600;
  const columns = width >= 1600 ? 3 : width >= 680 ? 2 : 1;
  const maxWidth =
    width >= 1600 ? 1320 : width >= 1024 ? 1200 : tablet ? 960 : 560;
  const horizontalInset = compact ? 12 : tablet ? 24 : 16;
  const cardPadding = compact ? 12 : tablet ? 22 : 16;
  const gap = compactLandscape ? 8 : tablet ? 16 : 12;
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
      ...(Platform.OS === 'web' ? { overflow: 'scroll' as const } : {}),
    },
    scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: horizontalInset,
      paddingTop: compactLandscape ? 10 : tablet ? 28 : 20,
      paddingBottom: compactLandscape ? 16 : 48,
    },
    container: {
      width: '100%',
      maxWidth,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginBottom: compactLandscape ? 10 : 18,
      gap: 4,
    },
    backText: {
      fontSize: compact ? 13 : 14,
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
      marginBottom: compactLandscape ? 8 : tablet ? 20 : 14,
      fontSize: compact ? 22 : tablet ? 30 : 26,
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
      fontSize: compact ? 13 : 14,
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
      minHeight: compactLandscape ? 42 : 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      backgroundColor: Colors.light.background,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: compact ? 10 : 12,
      borderWidth: 1,
      borderColor: Colors.light.border,
    },
    cropName: {
      flex: 1,
      minWidth: 0,
      fontSize: compact ? 13 : 14,
      fontWeight: '600',
      color: Colors.light.text,
    },
    status: {
      flexShrink: 0,
      fontSize: compact ? 11 : 12,
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
      fontSize: compact ? 13 : 14,
      color: Colors.light.textSecondary,
    },
    errorText: {
      marginBottom: 10,
      fontSize: 13,
      color: Colors.light.dangerText,
    },
    editButton: {
      alignSelf: tablet ? 'flex-end' : 'stretch',
      width: tablet ? 280 : '100%',
      minHeight: compactLandscape ? 40 : 46,
      marginTop: 16,
      borderRadius: 15,
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.light.primary,
    },
    editText: {
      fontSize: compact ? 13 : 14,
      fontWeight: '700',
      color: Colors.light.surface,
    },
  });
}
