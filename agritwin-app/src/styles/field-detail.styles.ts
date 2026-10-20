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
    marginBottom: 10,
  },

  heroCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },

  photo: {
    width: '100%',
    height: 168,
    backgroundColor: Colors.light.surfaceSecondary,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.primaryDark,
  },

  editButton: {
    height: 36,
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
  },

  editText: {
    fontWeight: '700',
    color: Colors.light.surface,
  },

  card: {
    width: '100%',
    marginTop: 14,
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    padding: 14,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },

  infoRow: {
    marginTop: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  infoLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginBottom: 2,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },

  deviceRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: Colors.light.background,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  deviceId: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },

  status: {
    fontSize: 12,
    fontWeight: '700',
  },

  statusOn: {
    color: '#2F9E44',
  },

  statusOff: {
    color: '#C92A2A',
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },

  errorText: {
    marginBottom: 10,
    fontSize: 13,
    color: Colors.light.dangerText,
  },

  dataHeader: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
});
