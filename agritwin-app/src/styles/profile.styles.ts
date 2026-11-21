import { Platform, StyleSheet } from 'react-native';

import { Colors } from '../constants/theme';

export const styles = StyleSheet.create({
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 48,
  },

  container: {
    width: '100%',
    maxWidth: 360,
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 18,
    gap: 4,
  },

  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  headerText: {
    flex: 1,
    marginRight: 10,
  },

  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.light.textMuted,
  },

  title: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primaryDark,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: Colors.light.primary,
  },
});
