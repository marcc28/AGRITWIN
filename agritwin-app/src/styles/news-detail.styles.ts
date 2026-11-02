import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

type ThemeColors = typeof Colors.light | typeof Colors.dark;

export function getNewsDetailStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
      flexGrow: 1,
    },
    backButton: {
      marginBottom: 24,
      paddingVertical: 8,
      alignSelf: 'flex-start',
    },
    backButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '700',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
    },
    loadingContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    loadingText: {
      color: colors.text,
      marginTop: 12,
    },
    errorText: {
      color: colors.text,
      lineHeight: 24,
    },
    image: {
      width: '100%',
      maxWidth: 600,
      height: 280,
      alignSelf: 'center',
      borderRadius: 14,
      marginBottom: 22,
      backgroundColor: colors.surfaceSecondary,
    },
    subtitle: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      marginBottom: 12,
    },
    title: {
      color: colors.text,
      fontSize: 28,
      lineHeight: 35,
      fontWeight: '900',
      marginBottom: 18,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: 18,
    },
    content: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 27,
    },
    source: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 24,
      fontWeight: '600',
    },
  });
}
