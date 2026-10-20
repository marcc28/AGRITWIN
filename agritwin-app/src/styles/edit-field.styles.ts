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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },

  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.primaryDark,
    marginBottom: 16,
  },

  label: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 10,
    marginBottom: 4,
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

  pickerBox: {
    borderRadius: 14,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
  },

  picker: {
    width: '100%',
    height: 44,
    color: Colors.light.text,
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
});
