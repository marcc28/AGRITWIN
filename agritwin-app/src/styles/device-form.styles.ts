import { StyleSheet } from 'react-native';

import { Colors } from '../constants/theme';

export const deviceStyles = StyleSheet.create({
  box: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },

  boxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  deviceId: {
    flex: 1,
    marginRight: 12,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },

  deviceDetail: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.light.textSecondary,
  },

  removeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.dangerText,
  },
});
