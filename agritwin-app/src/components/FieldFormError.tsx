import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/theme';

export function FieldFormError({ error }: Readonly<{ error?: string }>) {
  const { t } = useTranslation();
  return error ? (
    <Text style={styles.error} accessibilityRole="alert">
      {t(error)}
    </Text>
  ) : null;
}
const styles = StyleSheet.create({
  error: { color: Colors.light.dangerText, fontSize: 13, marginTop: 6 },
});
