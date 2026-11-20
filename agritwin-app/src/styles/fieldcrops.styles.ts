import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';
import {
  getResponsiveProfile,
  responsiveValue,
  valueAtWidth,
} from './responsiveLayout';

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
  const profile = getResponsiveProfile(width, height);
  const compactLayout = profile.compactPhone || profile.compactLandscape;
  const columns = valueAtWidth(width, [[1000, 3], [560, 2]], 1);
  const cardPadding = responsiveValue(profile, {
    compact: 10,
    tablet: 20,
    default: 14,
  });
  const gap = responsiveValue(profile, { compactLandscape: 8, default: 12 });
  const contentWidth = Math.max(0, width - cardPadding * 2);
  const cropWidth = Math.max(0, (contentWidth - gap * (columns - 1)) / columns);
  const compactFont = responsiveValue(profile, { compact: 11, default: 12 });
  const compactInfoStyle = compactLayout
    ? { flexBasis: '47%' as const, flexGrow: 1, minWidth: 110 }
    : {};
  const cropStatusLayout = compactLayout ? { width: '100%' as const } : {};
  const cropInfoFlow = compactLayout
    ? { flexDirection: 'row' as const, flexWrap: 'wrap' as const }
    : { flexDirection: 'column' as const, flexWrap: 'nowrap' as const };

  return StyleSheet.create({
    card: {
      marginTop: responsiveValue(profile, {
        compactLandscape: 8,
        compactPhone: 14,
        default: 20,
      }),
      padding: cardPadding,
      borderRadius: responsiveValue(profile, {
        compactLandscape: 14,
        default: 16,
      }),
      backgroundColor: Colors.light.surface,
      width: '100%',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: responsiveValue(profile, {
        compactLandscape: 6,
        compactPhone: 10,
        default: 16,
      }),
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontSize: responsiveValue(profile, { compact: 18, default: 20 }),
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
      minHeight: responsiveValue(profile, {
        compactLandscape: 136,
        compact: 160,
        tablet: 184,
        default: 172,
      }),
      minWidth: 0,
      padding: responsiveValue(profile, {
        compactLandscape: 8,
        compact: 8,
        default: 12,
      }),
      borderRadius: responsiveValue(profile, {
        compactLandscape: 12,
        default: 16,
      }),
      borderWidth: 1,
      borderColor: Colors.light.border,
      backgroundColor: Colors.light.surface,
      gap: responsiveValue(profile, { compactLandscape: 6, default: 9 }),
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
      fontSize: responsiveValue(profile, { compact: 15, default: 16 }),
      fontWeight: '700',
      color: Colors.light.text,
    },
    cropInfo: {
      ...cropInfoFlow,
      gap: responsiveValue(profile, {
        compactLandscape: 4,
        compactPhone: 6,
        default: 5,
      }),
    },
    cropDetail: {
      fontSize: compactFont,
      lineHeight: responsiveValue(profile, { compact: 15, default: 17 }),
      color: Colors.light.textMuted,
      ...compactInfoStyle,
    },
    cropStatus: {
      ...cropStatusLayout,
      fontSize: responsiveValue(profile, { compact: 12, default: 13 }),
      fontWeight: '600',
      color: Colors.light.primary,
    },
    addIcon: {
      width: responsiveValue(profile, { compact: 28, default: 32 }),
      height: responsiveValue(profile, { compact: 28, default: 32 }),
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
      minHeight: responsiveValue(profile, {
        compactLandscape: 32,
        compactPhone: 34,
        default: 42,
      }),
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
      fontSize: compactFont,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: responsiveValue(profile, { compact: 14, default: 16 }),
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
    loadMoreIndicator: {
      marginTop: 12,
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
