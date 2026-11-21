import { StyleSheet } from 'react-native';
import { Colors, Spacing } from '../constants/theme';

const C = Colors.light;

export const styles = StyleSheet.create({
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: C.successBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },

  title: {
    fontSize: 27,
    fontWeight: '700',
    color: C.primaryDark,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },

  subtitle: {
    fontSize: 16,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.three,
  },

  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.successBackground,
    borderWidth: 1,
    borderColor: C.successBorder,
    padding: Spacing.three,
    borderRadius: 14,
    gap: Spacing.two,
    width: '100%',
    marginBottom: Spacing.three,
  },

  statusText: {
    flex: 1,
    color: C.successText,
    fontSize: 14,
    lineHeight: 21,
  },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.dangerBackground,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    padding: Spacing.three,
    borderRadius: 14,
    gap: Spacing.two,
    width: '100%',
    marginBottom: Spacing.three,
  },

  warningText: {
    flex: 1,
    color: C.dangerText,
    fontSize: 14,
    lineHeight: 21,
  },

  message: {
    fontSize: 15,
    lineHeight: 23,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },

  button: {
    backgroundColor: C.primary,
    width: '100%',
    minHeight: 52,
    borderRadius: 26,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },

  buttonText: {
    color: C.surface,
    fontSize: 16,
    fontWeight: '700',
  },

  footer: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: Spacing.three,
  },
  screen: {
    flex: 1,
    backgroundColor: C.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },

  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
});
