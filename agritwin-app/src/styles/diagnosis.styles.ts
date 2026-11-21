import { Platform, StyleSheet } from 'react-native';

import { Colors } from '../constants/theme';

const C = Colors.light;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
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

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: C.primaryDark,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: C.textSecondary,
  },

  card: {
    width: '100%',
    marginTop: 14,
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 14,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },

  preview: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    backgroundColor: C.surfaceSecondary,
  },

  previewSmall: {
    height: 90,
  },

  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  thumbnail: {
    width: 150,
    height: 112,
    borderRadius: 16,
    backgroundColor: C.surfaceSecondary,
  },

  compactButtons: {
    flex: 1,
    gap: 8,
  },

  compactButton: {
    flex: 0,
    paddingVertical: 8,
    borderRadius: 12,
  },

  placeholder: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  placeholderText: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },

  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primaryDark,
  },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: C.primary,
  },

  primaryButtonDisabled: {
    opacity: 0.5,
  },

  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
  },

  loadingText: {
    fontSize: 14,
    color: C.textSecondary,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    backgroundColor: C.dangerBackground,
  },

  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: C.dangerText,
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  resultName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },

  badge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  badgeHealthy: {
    backgroundColor: C.successBackground,
  },

  badgeProblem: {
    backgroundColor: C.dangerBackground,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  badgeTextHealthy: {
    color: C.successText,
  },

  badgeTextProblem: {
    color: C.dangerText,
  },

  confidence: {
    marginTop: 8,
    fontSize: 13,
    color: C.textMuted,
  },

  advice: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: C.text,
  },

  sectionTitle: {
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '700',
    color: C.textSecondary,
  },

  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },

  statusItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: C.background,
  },

  statusLabel: {
    fontSize: 12,
    color: C.textMuted,
  },

  statusValue: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: C.text,
  },

  statusValueWarning: {
    color: C.dangerText,
  },

  viewer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },

  viewerImage: {
    width: '100%',
    height: '100%',
  },

  viewerClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
});
