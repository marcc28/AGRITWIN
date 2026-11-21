import { StyleSheet } from 'react-native';

import { Colors } from '../constants/theme';

export const deviceStyles = StyleSheet.create({
  // One linked device: icon, name, status and the remove button.
  box: {
    marginBottom: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },

  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surfaceSecondary,
  },

  deviceBody: {
    flex: 1,
    gap: 2,
  },

  deviceId: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },

  deviceDetail: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },

  statusRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  statusOn: {
    color: Colors.light.primaryDark,
  },

  statusOff: {
    color: Colors.light.dangerText,
  },

  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: Colors.light.dangerBackground,
  },

  removeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.dangerText,
  },

  // The whole section.
  section: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },

  sectionPlain: {
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: 0,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primaryDark,
  },

  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surfaceSecondary,
  },

  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primaryDark,
  },

  sectionHint: {
    marginBottom: 10,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.light.textMuted,
  },

  // Nothing linked yet.
  emptyBox: {
    marginBottom: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.light.border,
  },

  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    color: Colors.light.textSecondary,
  },

  addButton: {
    marginTop: 2,
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.light.primary,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },

  addButtonDisabled: {
    opacity: 0.6,
  },

  addText: {
    fontWeight: '700',
    color: Colors.light.surface,
  },
});
