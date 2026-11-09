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
    marginBottom: 18,
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.light.primaryDark,
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

  photo: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    backgroundColor: Colors.light.surfaceSecondary,
  },

  photoRow: {
    marginTop: 10,
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

  errorText: {
    marginBottom: 10,
    fontSize: 13,
    color: Colors.light.dangerText,
  },

  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },

  button: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cancelButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  acceptButton: {
    backgroundColor: Colors.light.primary,
  },

  cancelText: {
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },

  acceptText: {
    fontWeight: '700',
    color: Colors.light.surface,
  },

  cropSection: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },

  cropSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primaryDark,
  },

  cropSectionHint: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.light.textMuted,
  },

  cropRow: {
    marginTop: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cropName: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: '600',
  },

  addCropButton: {
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  addCropText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  cropForm: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.light.background,
  },

  cropPicker: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 14,
    backgroundColor: Colors.light.surface,
  },
  cropPickerText: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 14,
  },
  cropPickerPlaceholder: {
    color: Colors.light.textMuted,
  },
  cropModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  cropModal: {
    maxHeight: '75%',
    borderRadius: 18,
    padding: 16,
    backgroundColor: Colors.light.surface,
  },
  cropModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cropModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  cropOption: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  cropOptionText: {
    color: Colors.light.text,
    fontSize: 14,
  },
  cropListLoader: {
    padding: 16,
  },
  cropEmpty: {
    padding: 16,
    color: Colors.light.textMuted,
    textAlign: 'center',
  },

  cropNotesInput: {
    height: 88,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  cropSubmit: {
    marginTop: 14,
    width: '100%',
  },

  cropCancel: {
    alignSelf: 'center',
    padding: 10,
    marginTop: 4,
  },

  cropCancelText: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
