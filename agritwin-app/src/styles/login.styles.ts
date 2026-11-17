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
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  socialContainer: { marginTop: 8 },
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  socialText: { color: Colors.light.surface, fontWeight: 'bold', fontSize: 18 },
  input: {
    width: '100%',
    height: 55,
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    paddingHorizontal: 20,
    marginTop: 15,
    shadowColor: Colors.light.inputShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 3,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  buttonsContainer: { flexDirection: 'row', gap: 10, marginTop: 20 },
  buttonWrapper: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  button: {
    height: 55,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    textAlign: 'center',
    width: '100%',
    marginTop: 8,
    color: Colors.light.textSecondary,
  },

  errorAlert: {
    width: '100%',
    backgroundColor: Colors.light.dangerBackground,
    borderWidth: 1,
    borderColor: Colors.light.dangerBorder,
    borderRadius: 6,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
  },

  errorTitle: {
    color: Colors.light.dangerText,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },

  errorText: {
    color: Colors.light.dangerText,
    fontSize: 14,
    textAlign: 'center',
  },

  successAlert: {
    width: '100%',
    backgroundColor: Colors.light.successBackground,
    borderWidth: 1,
    borderColor: Colors.light.successBorder,
    borderRadius: 6,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
  },

  successText: {
    color: Colors.light.successText,
    fontSize: 14,
    textAlign: 'center',
  },

  linkText: {
    color: Colors.light.link,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 8,
    marginTop: 25,
  },
  buttonText: { color: Colors.light.surface, fontWeight: 'bold', fontSize: 16 },
  socialIcon: { width: 24, height: 24 },
  signUpButton: {
    height: 55,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceSecondary,
  },
  loginButtonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 35,
  },

  signUpButtonText: {
    color: Colors.light.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  signUpTextContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },

  signUpNormalText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },

  signUpLinkText: {
    color: Colors.light.link,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
