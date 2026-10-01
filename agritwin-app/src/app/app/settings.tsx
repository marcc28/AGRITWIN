import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';

import { clearAuth } from '../../services/auth';
import { router } from 'expo-router';


export default function SettingsScreen() {
  const { t, i18n } = useTranslation();

  const currentLanguage = i18n.language;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('settings.title')}
      </Text>

      <Text style={styles.item}>
        {t('settings.profile')}
      </Text>

      <View style={styles.languageContainer}>
        <Text style={styles.languageLabel}>
          {t('settings.language')}
        </Text>

        <Picker
          selectedValue={currentLanguage}
          onValueChange={(value) => {
            i18n.changeLanguage(value);
          }}
          style={styles.picker}
        >
          <Picker.Item
            label={t('languages.catalan')}
            value="ca"
          />

          <Picker.Item
            label={t('languages.spanish')}
            value="es"
          />

          <Picker.Item
            label={t('languages.english')}
            value="en"
          />
        </Picker>
      </View>

      <Text style={styles.item}>
        {t('settings.units')}
      </Text>

      <Text style={styles.item}>
        {t('settings.notifications')}
      </Text>

      <Text style={styles.item}>
        {t('settings.weatherAlerts')}
      </Text>

      <Text style={styles.item}>
        {t('settings.irrigationAlerts')}
      </Text>

      <Text style={styles.item}>
        {t('settings.theme')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  item: {
    fontSize: 17,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },

  languageContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 5,
  },

  languageLabel: {
    fontSize: 17,
    marginBottom: 5,
  },

  picker: {
    width: '100%',
  },
});

async function handleLogout() {
  await clearAuth();
  router.replace('/auth/login');
}