import { StyleSheet } from 'react-native';

import { Colors } from '../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.light.background,
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    color: Colors.light.text,
  },

  item: {
    fontSize: 17,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    color: Colors.light.text,
  },

  languageContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingVertical: 5,
  },

  languageLabel: {
    fontSize: 17,
    marginBottom: 5,
    color: Colors.light.text,
  },

  picker: {
    width: '100%',
    color: Colors.light.text,
  },

  logoutText: {
    color: Colors.light.surface,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.primary,
  },

  logoutIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
});
