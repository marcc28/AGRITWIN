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
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.light.primaryDark,
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
  },

  card: {
    width: '100%',
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },

  label: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 12,
    marginBottom: 6,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 6,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  input: {
    flex: 1,
    height: '100%',
    color: Colors.light.text,
    paddingVertical: 0,
  },

  eyeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hint: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.light.textMuted,
  },

  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: Colors.light.dangerText,
  },

  saveButton: {
    marginTop: 22,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveText: {
    fontWeight: '700',
    color: Colors.light.surface,
  },

  cancelButton: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },

  cancelText: {
    fontWeight: '700',
    color: Colors.light.primary,
  },

  successCard: {
    width: '100%',
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },

  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.light.successBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  successEyebrow: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.light.textMuted,
  },

  successTitle: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primaryDark,
    textAlign: 'center',
  },

  successSubtitle: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },

  successButton: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
