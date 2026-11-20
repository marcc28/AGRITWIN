import { Platform, StyleSheet } from 'react-native';

import { Colors } from '../constants/theme';

export function getCropsStyles(width: number, height: number) {
  const compact = width < 360;
  const tablet = width >= 600;
  const compactLandscape = width > height && height < 600;
  const maxWidth =
    width >= 1600 ? 1320 : width >= 1024 ? 1200 : tablet ? 960 : 560;
  const horizontalInset = compact ? 12 : tablet ? 24 : 16;

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
      paddingTop: compactLandscape ? 12 : tablet ? 28 : 20,
      paddingBottom: compactLandscape ? 16 : 48,
    },
    container: {
      width: '100%',
      maxWidth,
    },
    date: {
      fontSize: compact ? 10 : 11,
      letterSpacing: 1.2,
      color: Colors.light.textMuted,
    },
    title: {
      marginTop: 4,
      marginBottom: compactLandscape ? 8 : tablet ? 20 : 14,
      fontSize: compact ? 22 : tablet ? 28 : 24,
      fontWeight: 'bold',
      color: Colors.light.primaryDark,
    },
  });
}
