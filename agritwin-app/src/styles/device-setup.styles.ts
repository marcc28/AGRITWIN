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

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
  },

  card: {
    width: '100%',
    marginTop: 16,
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },

  centered: {
    alignItems: 'center',
  },

  statusIcon: {
    marginBottom: 8,
  },

  progressTitle: {
    marginTop: 16,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: Colors.light.text,
  },

  cardText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: Colors.light.textSecondary,
  },

  searchRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  searchText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },

  listTitle: {
    marginTop: 18,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },

  boardRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: Colors.light.background,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  boardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },

  tipBox: {
    marginTop: 16,
    borderRadius: 16,
    padding: 12,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  tipText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.textSecondary,
  },

  label: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 12,
    marginBottom: 6,
  },

  input: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    color: Colors.light.text,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  eyeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.light.textMuted,
  },

  primaryButton: {
    marginTop: 18,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    backgroundColor: Colors.light.primary,
  },

  primaryButtonDisabled: {
    opacity: 0.5,
  },

  primaryText: {
    fontWeight: '700',
    color: Colors.light.surface,
  },

  secondaryButton: {
    marginTop: 12,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  secondaryText: {
    fontWeight: '600',
    color: Colors.light.text,
  },

  errorTitle: {
    color: Colors.light.dangerText,
  },
});
