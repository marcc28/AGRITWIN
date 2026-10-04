import { StyleSheet, Text, View } from 'react-native';

type AlertVariant = 'danger' | 'success' | 'warning' | 'info';

type AlertProps = {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
};

export default function Alert({
  variant = 'info',
  title,
  children,
}: AlertProps) {
  return (
    <View style={[styles.alert, styles[variant]]}>
      {title && (
        <Text style={[styles.title, styles[`${variant}Text`]]}>{title}</Text>
      )}

      <Text style={[styles.message, styles[`${variant}Text`]]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  alert: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginBottom: 15,
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },

  message: {
    fontSize: 14,
  },

  // Bootstrap: alert-danger
  danger: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c2c7',
  },

  dangerText: {
    color: '#842029',
  },

  // Bootstrap: alert-success
  success: {
    backgroundColor: '#d1e7dd',
    borderColor: '#a3cfbb',
  },

  successText: {
    color: '#0f5132',
  },

  // Bootstrap: alert-warning
  warning: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffecb5',
  },

  warningText: {
    color: '#664d03',
  },

  // Bootstrap: alert-info
  info: {
    backgroundColor: '#cff4fc',
    borderColor: '#b6effb',
  },

  infoText: {
    color: '#055160',
  },
});
