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
    borderColor: '#aaa',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: '#1089D3',
    borderColor: '#1089D3',
  },

  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
  },

  legalText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },

  link: {
    color: '#1089D3',
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },

  modalContainer: {
    flex: 1,
    maxHeight: '90%',
    backgroundColor: '#fff',
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
    borderBottomColor: '#ddd',
  },

  modalTitleContainer: {
    flex: 1,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },

  modalVersion: {
    marginTop: 4,
    fontSize: 12,
    color: '#777',
  },

  modalCloseButton: {
    padding: 8,
  },

  modalCloseText: {
    fontSize: 22,
    color: '#555',
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
    color: '#222',
  },

  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },

  modalError: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalErrorText: {
    textAlign: 'center',
    color: '#c00',
  },

  modalButton: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1089D3',
    alignItems: 'center',
  },

  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
