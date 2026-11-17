import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';

export const priorityColor = {
  high: '#C92A2A',
  medium: '#E08A00',
  low: '#2F9E44',
} as const;

// A soft background for each priority, to tint a chip.
export const priorityTint = {
  high: '#FBEAEA',
  medium: '#FDF1DD',
  low: '#E6F3E8',
} as const;

const softShadow = {
  shadowColor: Colors.light.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 6,
  elevation: 1,
} as const;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 48,
  },
  content: {
    width: '100%',
    maxWidth: 440,
  },

  // Header of the calendar tab
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.light.primaryDark,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.primary,
    ...softShadow,
  },
  addButtonText: {
    marginTop: -2,
    fontSize: 28,
    lineHeight: 30,
    color: Colors.light.surface,
  },
  addWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
  },
  addWideText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.surface,
  },
  notice: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.light.successBackground,
    fontSize: 12.5,
    lineHeight: 18,
    color: Colors.light.successText,
  },
  error: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.light.dangerBackground,
    fontSize: 13,
    color: Colors.light.dangerText,
  },
  loading: {
    marginBottom: 10,
    fontSize: 13,
    color: Colors.light.textSecondary,
  },

  // Month
  calendarCard: {
    marginBottom: 6,
    padding: 12,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    ...softShadow,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    textTransform: 'capitalize',
  },
  monthButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.light.background,
  },
  monthArrow: {
    marginTop: -2,
    fontSize: 20,
    lineHeight: 22,
    color: Colors.light.primaryDark,
  },
  weekRow: {
    flexDirection: 'row',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 3,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  dayCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  dayCircleToday: {
    backgroundColor: Colors.light.primary,
  },
  dayNumber: {
    fontSize: 13,
    color: Colors.light.text,
  },
  dayToday: {
    fontWeight: '800',
    color: Colors.light.surface,
  },
  dayFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 8,
    marginTop: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Sections and groups
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.primaryDark,
  },
  sectionDate: {
    fontSize: 12,
    color: Colors.light.textMuted,
    textTransform: 'capitalize',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  groupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  groupCount: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  empty: {
    marginBottom: 4,
    fontSize: 12.5,
    color: Colors.light.textMuted,
  },

  // A task
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
    paddingVertical: 9,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    backgroundColor: Colors.light.surface,
    ...softShadow,
  },
  cardDone: {
    opacity: 0.55,
  },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  checkMark: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.light.surface,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  cardTitleDone: {
    textDecorationLine: 'line-through',
  },
  cardMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.light.textSecondary,
  },
  aiChip: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
    backgroundColor: Colors.light.surfaceSecondary,
  },
  aiChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: Colors.light.primaryDark,
  },

  // A notice from the AI
  noticeCard: {
    marginBottom: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.secondary,
    backgroundColor: '#F6EFE8',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quietButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: Colors.light.surface,
  },
  quietText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primaryDark,
  },

  // Day screen
  back: {
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayNavText: {
    flex: 1,
    alignItems: 'center',
  },
  dayTitle: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'capitalize',
    color: Colors.light.primaryDark,
  },
  dayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  dayRelative: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },

  // Editor (create and edit)
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: Colors.light.overlay,
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
  },
  sheet: {
    padding: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Colors.light.surface,
  },
  sheetTitle: {
    marginBottom: 14,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.primaryDark,
  },
  hint: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.light.textSecondary,
  },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.light.text,
  },
  inputMultiline: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  priorities: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: Colors.light.background,
  },
  priorityChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.surface,
  },
  deleteButton: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.dangerText,
  },
});
