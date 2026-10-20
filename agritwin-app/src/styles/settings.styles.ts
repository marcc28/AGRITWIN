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

  date: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.light.textMuted,
  },

  title: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primaryDark,
  },

  profileCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    padding: 14,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },

  preferencesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    marginTop: 18,
    marginBottom: 4,
  },

  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.background,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  editText: {
    flex: 1,
    marginRight: 8,
  },

  editLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginBottom: 2,
  },

  editValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    flexShrink: 1,
  },

  languageBlock: {
    marginTop: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  languageLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginBottom: 8,
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
    backgroundColor: Colors.light.surface,
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

  accountInput: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    color: Colors.light.text,
    marginTop: 6,
  },

  accountButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },

  accountButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  accountCancel: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  accountAccept: {
    backgroundColor: Colors.light.primary,
  },

  accountCancelText: {
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },

  accountAcceptText: {
    fontWeight: '700',
    color: Colors.light.surface,
  },

  gardenTitle: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primaryDark,
  },

  gardenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  gardenCard: {
    width: '47%',
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },

  gardenPhoto: {
    width: '100%',
    height: 110,
    backgroundColor: Colors.light.surfaceSecondary,
  },

  gardenBody: {
    padding: 10,
  },

  gardenName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },

  gardenMeta: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.light.textSecondary,
  },

  gardenActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },

  gardenEdit: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },

  emptyGardens: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },

  errorText: {
    marginBottom: 10,
    fontSize: 13,
    color: Colors.light.dangerText,
  },

  logoutText: {
    color: Colors.light.surface,
    fontWeight: 'bold',
  },

  logoutButton: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
  },

  logoutIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
});
