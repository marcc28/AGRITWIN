import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { clearAuth } from '../../services/auth';


import { styles } from '../../styles/settings.styles';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();

  const currentLanguage = i18n.language;

  const handleLanguageChange = async (value: string) => {
    if (value !== i18n.language) {
      await i18n.changeLanguage(value);
    }
  };

  const handleLogout = async () => {
    await clearAuth();
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.title')}</Text>

      <Text style={styles.item}>{t('settings.profile')}</Text>

      <View style={styles.languageContainer}>
        <Text style={styles.languageLabel}>{t('settings.language')}</Text>

        <Picker
          selectedValue={currentLanguage}
          onValueChange={handleLanguageChange}
          style={styles.picker}
        >
          <Picker.Item label={t('languages.catalan')} value="ca" />

          <Picker.Item label={t('languages.spanish')} value="es" />

          <Picker.Item label={t('languages.english')} value="en" />

          <Picker.Item label={t('languages.italian')} value="it" />
        </Picker>
      </View>

      <Text style={styles.item}>{t('settings.units')}</Text>

      <Text style={styles.item}>{t('settings.notifications')}</Text>

      <Text style={styles.item}>{t('settings.weatherAlerts')}</Text>

      <Text style={styles.item}>{t('settings.irrigationAlerts')}</Text>

      <Text style={styles.item}>{t('settings.theme')}</Text>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </Pressable>
    </View>
  );
}

