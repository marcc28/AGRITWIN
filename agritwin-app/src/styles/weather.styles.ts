import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';

const BOX_RADIUS = 12;
const CREAM = '#F4F2EB';

export const weatherStyles = StyleSheet.create({
  /* ---------- Tarjeta de la home ---------- */
  card: {
    marginTop: 24,
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BOX_RADIUS,
    backgroundColor: Colors.light.primary,
  },

  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.surface,
  },

  pressed: {
    opacity: 0.8,
  },

  /* ---------- Pantalla del tiempo ---------- */
  heroLeft: {
    flexShrink: 1,
  },

  heroText: {
    flexShrink: 1,
  },

  hoursRow: {
    marginTop: 12,
  },

  nowLabel: {
    fontWeight: '700',
    color: Colors.light.primaryDark,
  },

  forecastRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },

  forecastCard: {
    flex: 1,
    padding: 10,
    gap: 6,
    borderRadius: BOX_RADIUS,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },

  forecastCardToday: {
    borderColor: CREAM,
    backgroundColor: CREAM,
  },

  forecastTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },

  forecastDay: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },

  forecastTemp: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },

  forecastDescription: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
});
