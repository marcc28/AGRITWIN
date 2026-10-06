import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
const GREEN = '#00A651';
const CARD = '#CCF8B5';
const CHIP = '#0A9A3C';
const TRACK = '#FADCDC';

export const styles = StyleSheet.create({
  trackWrap: { paddingHorizontal: 20, paddingTop: 12 },
  track: {
    flexDirection: 'row',
    backgroundColor: TRACK,
    borderRadius: 24,
    padding: 4,
    gap: 8,
  },
  segment: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#111',
  },
  segmentOn: { backgroundColor: GREEN },
  segmentOff: { backgroundColor: '#fff' },
  segmentText: { fontSize: 15, fontWeight: '700' },

  list: { padding: 20, gap: 14, paddingBottom: 24 },

  card: {
    backgroundColor: CARD,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  productName: { fontSize: 22, fontWeight: '600', color: '#111' },
  detail: { fontSize: 13, color: '#111', marginTop: 6 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: CHIP,
    paddingHorizontal: 16,
    paddingVertical: 3,
    borderRadius: 14,
    marginBottom: 8,
  },
  priceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  mainPrice: {
    backgroundColor: '#F3F8F1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },

  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },

  priceInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  priceInfo: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    padding: 12,
  },
  priceInfoLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 5,
  },
  priceInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },

  priceTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  priceMain: {
    marginLeft: 10,
    alignItems: 'flex-end',
  },

  priceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
  },

  priceBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },

  smallInfo: {
    fontSize: 12,
    color: '#666',
    marginRight: 12,
  },

  buyBtn: {
    marginLeft: 'auto',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },

  buyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  newsTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  newsBody: { fontSize: 14, color: '#111', marginTop: 8, lineHeight: 20 },
  source: { fontSize: 14, fontWeight: '700', color: '#111', marginTop: 10 },
});
