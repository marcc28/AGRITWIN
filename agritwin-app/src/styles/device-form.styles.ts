import { StyleSheet } from 'react-native';

import { Colors } from '../constants/theme';

export const deviceStyles = StyleSheet.create({
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },

  option: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },

  optionOn: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },

  optionText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },

  optionTextOn: {
    color: Colors.light.surface,
  },

  existing: {
    marginBottom: 8,
    fontSize: 13,
    color: Colors.light.textSecondary,
  },

  box: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },

  addButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },

  addText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
  },

  boxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  removeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.dangerText,
  },

  saveButton: {
    marginTop: 12,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
  },

  saveText: {
    fontWeight: '700',
    color: Colors.light.surface,
  },
});
