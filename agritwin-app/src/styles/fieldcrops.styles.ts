import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    backgroundColor: Colors.light.surface,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },

  cropsRow: {
    alignItems: 'stretch',
    gap: 12,
    paddingRight: 4,
  },

  addIcon: {
    width: 32,
    height: 32,
  },
  addButton: {
    marginLeft: 12,
    padding: 2,
  },
  cropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  target: {
    width: 20,
    height: 20,
    marginLeft: 'auto',
  },

  errorText: {
    color: Colors.light.text,
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },

  retryText: {
    color: Colors.light.primary,
  },

  emptyText: {
    width: 220,
    alignSelf: 'center',
    color: Colors.light.textMuted,
  },

  crop: {
    width: 240,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  cropTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },

  cropDetail: {
    marginTop: 4,
    color: Colors.light.textMuted,
  },

  cropStatus: {
    marginTop: 4,
    color: Colors.light.primary,
  },
  targetButton: {
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },

});
