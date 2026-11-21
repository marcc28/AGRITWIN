import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';

export const fieldDevicesStyles = StyleSheet.create({
  // Narrower than the weather card: less padding and margin.
  card: {
    marginTop: 12,
    paddingVertical: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: Colors.light.textSecondary,
  },

  list: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },

  device: {
    maxWidth: 140,
    alignItems: 'center',
    gap: 6,
  },

  deviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },

  none: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
  },

  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.surface,
  },
});
