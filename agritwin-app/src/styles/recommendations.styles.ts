// styles/recommendations.styles.ts

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F3',
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 24,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#263D2B',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#777777',
  },

  fieldLabel: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#3D8B55',
  },

  resultsCount: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 14,
  },

  recommendationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  categoryContainer: {
    backgroundColor: '#EDF4EE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  category: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D8B55',
    textTransform: 'capitalize',
  },

  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  severityText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  recommendationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#263D2B',
    marginBottom: 10,
    lineHeight: 25,
  },

  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555555',
  },

  reasonContainer: {
    backgroundColor: '#F5F7F3',
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
  },

  reasonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3D8B55',
    marginBottom: 8,
  },

  reason: {
    fontSize: 13,
    lineHeight: 20,
    color: '#555555',
  },

  dataItem: {
    fontSize: 12,
    color: '#777777',
    marginTop: 6,
  },

  dateContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },

  dateText: {
    fontSize: 11,
    color: '#999999',
    marginBottom: 5,
  },

  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },

  loadingText: {
    marginTop: 12,
    color: '#777777',
    fontSize: 14,
  },

  errorText: {
    color: '#D9534F',
    fontSize: 14,
    textAlign: 'center',
  },

  retryButton: {
    backgroundColor: '#3D8B55',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },

  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#263D2B',
    marginBottom: 10,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#777777',
    textAlign: 'center',
  },
});