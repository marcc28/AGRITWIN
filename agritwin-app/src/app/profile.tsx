import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AccountCard } from '@/components/AccountCard';
import AppHeader from '@/components/AppHeader';
import GardenPickerOverlay from '@/components/GardenPickerOverlay';
import { Colors } from '@/constants/theme';
import { styles } from '@/styles/profile.styles';

export default function ProfileScreen() {
  const { t } = useTranslation();

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/field-selection');
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          <Pressable
            testID="profile-back"
            style={styles.backRow}
            onPress={goBack}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={Colors.light.textSecondary}
            />
            <Text style={styles.backText}>{t('fieldSelection.back')}</Text>
          </Pressable>

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>{t('settings.eyebrow')}</Text>
              <Text style={styles.title}>{t('fieldSelection.profile')}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>🧑‍🌾</Text>
            </View>
          </View>

          <AccountCard />
        </View>
      </ScrollView>

      <GardenPickerOverlay />
    </View>
  );
}
