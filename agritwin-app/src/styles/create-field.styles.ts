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
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 48,
  },

  container: {
    width: '100%',
    maxWidth: 360,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  brand: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: Colors.light.primaryDark,
  },

  topChip: {
    maxWidth: 140,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  topChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 14,
    gap: 4,
  },

  backText: {
    fontSize: 14,
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
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.light.primaryDark,
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.textSecondary,
  },

  hero: {
    width: '100%',
    height: 160,
    borderRadius: 18,
    backgroundColor: Colors.light.surfaceSecondary,
  },

  photoRow: {
    marginTop: 10,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 8,
  },

  photoThumbWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },

  photoThumbSelected: {
    borderColor: Colors.light.primary,
  },

  photoThumb: {
    width: '100%',
    height: 48,
    backgroundColor: Colors.light.surfaceSecondary,
  },

  card: {
    width: '100%',
    marginBottom: 14,
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },

  cardHint: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },

  label: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 12,
    marginBottom: 6,
  },

  input: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    color: Colors.light.text,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  locationInput: {
    flex: 1,
  },

  locateButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
  },

  coords: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.light.primaryDark,
  },

  coordsHint: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.light.textMuted,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  chip: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  chipSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },

  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },

  chipTextSelected: {
    color: Colors.light.surface,
  },

  arduinoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },

  arduinoText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },

  arduinoLink: {
    marginTop: 10,
    opacity: 0.45,
  },

  arduinoLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },

  primaryButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
  },

  primaryText: {
    fontWeight: '700',
    color: Colors.light.surface,
  },

  logoutLink: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },

  errorText: {
    marginBottom: 10,
    fontSize: 13,
    color: Colors.light.dangerText,
  },
});
