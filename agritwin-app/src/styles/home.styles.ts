import { StyleSheet } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },

  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  content: {
    width: '100%',
    maxWidth: 420,
  },

  date: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.light.textMuted,
  },

  title: {
    marginTop: 8,
    fontFamily: Fonts.serif,
    fontSize: 32,
    lineHeight: 38,
    color: Colors.light.primaryDark,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
});
