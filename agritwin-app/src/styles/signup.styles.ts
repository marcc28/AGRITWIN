import { StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 20,
  },

  container: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: Colors.light.surface,
    borderRadius: 40,
    padding: 30,
    borderWidth: 5,
    borderColor: Colors.light.surface,

    shadowColor: Colors.light.shadow,
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,

    elevation: 10,
  },

  socialContainer: {
    marginTop: 25,
  },

  socialTitle: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.light.textMuted,
  },

  heading: {
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 30,
    color: Colors.light.primaryDark,
  },

  socialAccounts: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginTop: 10,
  },

  socialButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: Colors.light.social,
    borderWidth: 4,
    borderColor: Colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: Colors.light.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,

    elevation: 5,
  },

  socialText: {
    color: Colors.light.surface,
    fontWeight: 'bold',
    fontSize: 18,
  },

  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    color: Colors.light.textSecondary,
  },

  input: {
    width: '100%',
    height: 55,
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    paddingHorizontal: 20,
    marginTop: 15,

    shadowColor: Colors.light.inputShadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.8,
    shadowRadius: 8,

    elevation: 3,

    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  buttonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  buttonWrapper: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },

  button: {
    height: 55,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {
    color: Colors.light.surface,
    fontWeight: 'bold',
    fontSize: 16,
  },

  socialIcon: {
    width: 24,
    height: 24,
  },

  legalContainer: {
    marginTop: 10,
    marginBottom: 20,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },

  checkmark: {
    color: Colors.light.surface,
    fontWeight: 'bold',
  },

  legalText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.textSecondary,
  },

  link: {
    color: Colors.light.primary,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.light.overlay,
    justifyContent: 'center',
    padding: 20,
  },

  modalContainer: {
    flex: 1,
    maxHeight: '90%',
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },

  modalTitleContainer: {
    flex: 1,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },

  modalVersion: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.light.textMuted,
  },

  modalCloseButton: {
    padding: 8,
  },

  modalCloseText: {
    fontSize: 22,
    color: Colors.light.textSecondary,
  },

  modalScroll: {
    flex: 1,
  },

  modalScrollContent: {
    padding: 20,
  },

  legalDocumentText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.light.text,
  },

  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },

  modalError: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalErrorText: {
    textAlign: 'center',
    color: Colors.light.dangerText,
  },

  modalButton: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },

  modalButtonText: {
    color: Colors.light.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
