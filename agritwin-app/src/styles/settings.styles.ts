import { StyleSheet } from 'react-native';

import { Colors } from '../constants/theme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },

  scroll: {
    flex: 1,
    width: '100%',
  },

  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
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

  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    paddingVertical: 8,
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
  },

  languageContainer: {
    marginTop: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  languageLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 8,
    marginLeft: 4,
  },

  picker: {
    width: '100%',
    color: Colors.light.text,
    height: 40,
  },

  extrasCard: {
    marginTop: 12,
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    padding: 14,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
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

  gardenEdit: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
});
