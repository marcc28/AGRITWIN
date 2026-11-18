import { Platform, StyleSheet } from 'react-native';

import { Colors } from '../constants/theme';

export const GRID_PADDING = 14;
export const GRID_GAP = 16;
export const MIN_TILE_WIDTH = 160;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },

  scroll: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' ? { overflow: 'scroll' as const } : {}),
  },

  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 48,
  },

  container: {
    width: '100%',
  },

  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.light.textMuted,
  },

  title: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primaryDark,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  headerText: {
    flex: 1,
    marginRight: 10,
  },

  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.surface,
  },

  manageActive: {
    backgroundColor: Colors.light.primary,
  },

  manageText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
  },

  manageTextActive: {
    color: Colors.light.surface,
  },

  errorText: {
    marginBottom: 10,
    fontSize: 13,
    color: Colors.light.dangerText,
  },

  emptyText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: GRID_GAP,
    paddingHorizontal: GRID_PADDING - GRID_GAP / 2,
  },

  tile: {
    paddingHorizontal: GRID_GAP / 2,
  },

  photoBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: Colors.light.surfaceSecondary,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },

  photo: {
    width: '100%',
    height: '100%',
  },

  manageOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.overlay,
  },

  pencilCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.light.surface,
  },

  currentBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primaryDark,
  },

  connectionBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surface,
  },

  cardBody: {
    alignItems: 'center',
    paddingTop: 8,
  },

  name: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },

  nameCurrent: {
    color: Colors.light.primaryDark,
  },

  deleteButton: {
    position: 'absolute',
    top: -8,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.dangerText,
    borderWidth: 2,
    borderColor: Colors.light.surface,
  },

  addBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.surface,
  },

  addPhoto: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },

  addCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
  },

  addText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
  },

  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.light.overlay,
  },

  modalCard: {
    width: '100%',
    maxWidth: 340,
    padding: 18,
    borderRadius: 24,
    backgroundColor: Colors.light.surface,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primaryDark,
  },

  modalText: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.light.textSecondary,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },

  modalButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCancel: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  modalCancelText: {
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },

  modalDelete: {
    backgroundColor: Colors.light.dangerText,
  },

  modalDeleteText: {
    fontWeight: '700',
    color: Colors.light.surface,
  },
});
