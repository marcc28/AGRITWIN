import { StyleSheet } from 'react-native';

import { Colors } from '../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.light.background,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
  },

  subtitle: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },

  info: {
    marginTop: 30,
  },

  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    color: Colors.light.primaryDark,
  },

  value: {
    fontSize: 16,
    marginTop: 5,
    color: Colors.light.text,
  },

  token: {
    fontSize: 12,
    marginTop: 5,
    color: Colors.light.textMuted,
  },
});