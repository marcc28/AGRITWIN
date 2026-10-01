import { Platform, Alert } from 'react-native';

export function showAlert(
  title: string,
  message: string,
  onConfirm?: () => void,
) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);

    if (onConfirm) {
      onConfirm();
    }

    return;
  }

  Alert.alert(
    title,
    message,
    onConfirm
      ? [
          {
            text: 'Continuar',
            onPress: onConfirm,
          },
        ]
      : undefined,
  );
}
