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

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  headerActionButton: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#96A78D',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  targetButtonText: {
    color: '#3D5942',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export function getFieldCropsStyles(width: number, height: number) {
  const compact = width < 360;
  const compactLandscape = width > height && height < 600;
  const columns = width >= 1000 ? 3 : width >= 560 ? 2 : 1;
  const cardPadding = compact ? 12 : width >= 600 ? 20 : 16;
  const gap = compactLandscape ? 8 : 12;
  const contentWidth = Math.max(0, width - cardPadding * 2);
  const cropWidth = Math.max(0, (contentWidth - gap * (columns - 1)) / columns);

  return StyleSheet.create({
    card: {
      marginTop: compactLandscape ? 10 : 20,
      padding: cardPadding,
      borderRadius: compactLandscape ? 14 : 16,
      backgroundColor: Colors.light.surface,
      width: '100%',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: compactLandscape ? 10 : 16,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontSize: compact ? 18 : 20,
      fontWeight: '700',
      color: Colors.light.text,
    },
    cropsGrid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap,
    },
    cropsRow: {
      alignItems: 'stretch',
      gap,
      paddingRight: 4,
    },
    crop: {
      alignSelf: 'flex-start',
      width: cropWidth,
      minWidth: 0,
      padding: compact ? 10 : 14,
      borderRadius: compactLandscape ? 12 : 16,
      borderWidth: 1,
      borderColor: Colors.light.border,
      backgroundColor: Colors.light.surface,
      gap: compactLandscape ? 6 : 9,
    },
    cropHeader: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    cropTitle: {
      flex: 1,
      minWidth: 0,
      fontSize: compact ? 15 : 16,
      fontWeight: '700',
      color: Colors.light.text,
    },
    cropInfo: {
      gap: compactLandscape ? 3 : 5,
    },
    cropDetail: {
      fontSize: compact ? 11 : 12,
      lineHeight: compact ? 15 : 17,
      color: Colors.light.textMuted,
    },
    cropStatus: {
      fontSize: compact ? 12 : 13,
      fontWeight: '600',
      color: Colors.light.primary,
    },
    addIcon: {
      width: compact ? 28 : 32,
      height: compact ? 28 : 32,
    },
    addButton: {
      padding: 2,
    },
    headerActionButton: {
      minWidth: 32,
      minHeight: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    targetButton: {
      alignSelf: 'stretch',
      width: '100%',
      minHeight: compactLandscape ? 36 : 42,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: Colors.light.successBackground,
      borderWidth: 1,
      borderColor: Colors.light.successBorder,
    },
    targetButtonText: {
      flexShrink: 1,
      color: Colors.light.primaryDark,
      fontSize: compact ? 11 : 12,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: compact ? 14 : 16,
    },
    headerActionIcon: {
      width: 32,
      height: 32,
    },
    errorText: {
      color: Colors.light.dangerText,
      fontSize: 13,
    },
    retryButton: {
      alignSelf: 'flex-start',
      marginTop: 8,
    },
    retryText: {
      color: Colors.light.primary,
    },
    emptyText: {
      width: '100%',
      color: Colors.light.textMuted,
      fontSize: 13,
    },
    target: {
      width: 20,
      height: 20,
      marginLeft: 'auto',
    },
  });
}
