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

  /* ---------- Alertas del tiempo ---------- */
  alertList: {
    marginTop: 12,
    gap: 8,
  },

  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: BOX_RADIUS,
    borderWidth: 1,
    borderColor: CREAM,
    backgroundColor: CREAM,
  },

  alertRowNow: {
    borderColor: Colors.light.dangerBorder,
    backgroundColor: Colors.light.dangerBackground,
  },

  alertText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.text,
  },

  alertTextNow: {
    fontWeight: '600',
    color: Colors.light.dangerText,
  },

  banner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    alignItems: 'center',
  },

  bannerBody: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: BOX_RADIUS,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
    backgroundColor: Colors.light.surface,
    shadowColor: Colors.light.text,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  bannerBodyNow: {
    borderLeftColor: Colors.light.dangerText,
  },

  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  bannerText: {
    flex: 1,
    gap: 2,
  },

  bannerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textMuted,
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
