import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

const C = Colors.light;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  backButtonText: {
    color: C.primaryDark,
    fontSize: 15,
    fontWeight: '700',
  },

  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: C.primaryDark,
    borderRadius: 26,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.primary,

    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 9,
  },

  decoration: {
    ...StyleSheet.absoluteFillObject,
  },

  decorCircleLarge: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: C.primary,
    opacity: 0.22,
    top: -65,
    right: -45,
  },

  decorCircleSmall: {
    position: 'absolute',
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: C.surfaceSecondary,
    opacity: 0.13,
    bottom: 190,
    left: -35,
  },

  decorCircleTiny: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: C.secondary,
    opacity: 0.9,
    top: 85,
    right: 35,
  },

  topLine: {
    height: 3,
    width: '45%',
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: C.surfaceSecondary,
    marginBottom: 25,
  },

  header: {
    alignItems: 'center',
    marginBottom: 28,
  },

  eyebrow: {
    color: C.surfaceSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
  },

  title: {
    color: C.surface,
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '900',
    textAlign: 'center',
  },

  description: {
    color: '#D4DED4',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 9,
  },

  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },

  priceInfo: {
    flex: 1,
  },

  priceLabel: {
    color: '#D4DED4',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },

  price: {
    color: '#E7E8D8',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },

  priceUnit: {
    color: '#D4DED4',
    fontSize: 13,
    marginTop: 2,
  },

  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(202,218,191,0.15)',
    borderColor: 'rgba(202,218,191,0.35)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 30,
    maxWidth: '52%',
  },

  stockBadgeEmpty: {
    backgroundColor: 'rgba(217,164,164,0.15)',
    borderColor: C.dangerBorder,
  },

  stockDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#B5CFB7',
  },

  stockDotEmpty: {
    backgroundColor: '#E6A5A5',
  },

  stockText: {
    color: C.surface,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },

  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 24,
  },

  sectionTitle: {
    color: C.surface,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
  },

  infoPanel: {
    backgroundColor: 'rgba(202,218,191,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(202,218,191,0.22)',
    borderRadius: 17,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 27,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },

  infoIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: 'rgba(202,218,191,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoIconText: {
    color: '#D6E4D3',
    fontSize: 19,
    fontWeight: '800',
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    color: '#C7D2C8',
    fontSize: 11,
    marginBottom: 4,
  },

  infoValue: {
    color: C.surface,
    fontSize: 13,
    fontWeight: '700',
  },

  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },

  quantityPanel: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 17,
    marginBottom: 18,
  },

  quantityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 17,
  },

  quantityTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: '800',
  },

  quantityHint: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 4,
  },

  quantityUnit: {
    color: C.primaryDark,
    backgroundColor: C.surfaceSecondary,
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '800',
  },

  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 25,
  },

  quantityButton: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledButton: {
    opacity: 0.35,
  },

  quantityButtonText: {
    color: C.surface,
    fontSize: 25,
    fontWeight: '700',
    lineHeight: 29,
  },

  quantityValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    minWidth: 55,
    justifyContent: 'center',
  },

  quantityValue: {
    color: C.text,
    fontSize: 28,
    fontWeight: '900',
  },

  quantityValueUnit: {
    color: C.textSecondary,
    fontSize: 13,
  },

  totalPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(202,218,191,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(202,218,191,0.25)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 17,
  },

  totalLabel: {
    color: '#D4DED4',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  totalHint: {
    color: '#C7D2C8',
    fontSize: 11,
    marginTop: 7,
  },

  totalPrice: {
    color: '#E7E8D8',
    fontSize: 25,
    fontWeight: '900',
    flexShrink: 0,
  },

  buyButton: {
    backgroundColor: C.surfaceSecondary,
    borderRadius: 15,
    paddingVertical: 17,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  buyButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  buyButtonDisabled: {
    backgroundColor: C.textMuted,
    elevation: 0,
  },

  buyButtonText: {
    color: C.primaryDark,
    fontSize: 16,
    fontWeight: '900',
  },

  footerText: {
    color: '#BFCDBF',
    textAlign: 'center',
    fontSize: 10,
    letterSpacing: 0.7,
    marginTop: 20,
  },
  backArrow: {
    fontSize: 28,
    lineHeight: 30,
    color: Colors.light.primaryDark,
    fontWeight: '600',
  },
  backButtonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.97 }],
  },
});
