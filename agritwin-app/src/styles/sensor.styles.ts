import { StyleSheet } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

const CARD_RADIUS = 16;
const BOX_RADIUS = 12;
const CREAM = '#F4F2EB';

export const styles = StyleSheet.create({
  /* ---------- Tarjeta de la home ---------- */
  card: {
    marginTop: 24,
    padding: 16,
    borderRadius: CARD_RADIUS,
    backgroundColor: Colors.light.surface,
    shadowColor: Colors.light.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardTitle: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    color: Colors.light.text,
  },

  cardSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.light.textMuted,
  },

  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },

  measureRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  measureColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },

  measureLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },

  measureValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },

  measureUnit: {
    fontSize: 10,
    color: Colors.light.textMuted,
  },

  /* ---------- Popup ---------- */
  overlay: {
    flex: 1,
    backgroundColor: Colors.light.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },

  modal: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    padding: 16,
    borderRadius: CARD_RADIUS,
    backgroundColor: Colors.light.surface,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  modalTitle: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    color: Colors.light.text,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CREAM,
  },

  hero: {
    marginTop: 16,
    padding: 14,
    borderRadius: BOX_RADIUS,
    backgroundColor: CREAM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  heroValue: {
    fontSize: 34,
    fontWeight: '300',
    color: Colors.light.text,
  },

  heroLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },

  heroRight: {
    alignItems: 'flex-end',
    gap: 2,
  },

  heroSmall: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },

  heroStrong: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
  },

  sectionHeader: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    color: Colors.light.text,
  },

  sectionHint: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },

  grid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  gridItem: {
    width: '48%',
    padding: 12,
    borderRadius: BOX_RADIUS,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },

  gridItemSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.successBackground,
  },

  gridItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  gridLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },

  gridValue: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },

  rangeRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  rangeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  rangeText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },

  tip: {
    marginTop: 16,
    padding: 12,
    borderRadius: BOX_RADIUS,
    backgroundColor: Colors.light.successBackground,
    flexDirection: 'row',
    gap: 10,
  },

  tipTextBox: {
    flex: 1,
  },

  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.successText,
  },

  tipText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.light.successText,
  },

  footnote: {
    marginTop: 12,
    fontSize: 10,
    fontStyle: 'italic',
    color: Colors.light.textMuted,
  },
});
