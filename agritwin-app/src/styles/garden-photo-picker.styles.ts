import { StyleSheet } from 'react-native';

import { Colors } from '../constants/theme';

export const styles = StyleSheet.create({
  row: {
    marginTop: 10,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 8,
  },

  thumbWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },

  thumbSelected: {
    borderColor: Colors.light.primary,
  },

  thumb: {
    width: '100%',
    height: 48,
    backgroundColor: Colors.light.surfaceSecondary,
  },
});
