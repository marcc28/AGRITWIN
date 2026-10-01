import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef3f8',
    padding: 20,
  },

  container: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#f8f9fd',
    borderRadius: 40,
    padding: 30,
    borderWidth: 5,
    borderColor: '#ffffff',

    shadowColor: '#85bdd7',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,

    elevation: 10,
  },
  socialContainer: { marginTop: 25 },
  socialTitle: { textAlign: 'center', fontSize: 11, color: '#aaa' },

  heading: {
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 30,
    color: '#1089D3',
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
    backgroundColor: '#333',
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#85bdd7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  socialText: { color: '#ffffff', fontWeight: 'bold', fontSize: 18 },

  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    color: '#777',
  },

  input: {
    width: '100%',
    height: 55,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 20,
    marginTop: 15,

    shadowColor: '#cff0ff',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.8,
    shadowRadius: 8,

    elevation: 3,
  },

  buttonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  buttonWrapper: {
    flex: 1,
    borderRadius: 20,
  },
  button: {
    height: 55,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorAlert: {
    width: '100%',
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#f5c2c7',
    borderRadius: 6,
    padding: 12,
    marginBottom: 15,
  },

  errorTitle: {
    color: '#842029',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  errorText: {
    color: '#842029',
    fontSize: 14,
  },
  successAlert: {
    width: '100%',
    backgroundColor: '#d1e7dd',
    borderWidth: 1,
    borderColor: '#a3cfbb',
    borderRadius: 6,
    padding: 12,
    marginBottom: 15,
  },

  successText: {
    color: '#0f5132',
    fontSize: 14,
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
});
