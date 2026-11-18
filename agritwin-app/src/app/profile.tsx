import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AccountCard } from '@/components/AccountCard';
import AppHeader from '@/components/AppHeader';
import GardenPickerOverlay from '@/components/GardenPickerOverlay';
import { Colors } from '@/constants/theme';
import { styles } from '@/styles/profile.styles';
import { getPageFrame, PROFILE_PHONE } from '@/styles/responsive';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const frame = getPageFrame(width, height, PROFILE_PHONE);

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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: frame.horizontalInset },
        ]}
      >
        <View
          testID="profile-content"
          style={[styles.container, { maxWidth: frame.maxWidth }]}
        >
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
            {/* The usual "no photo" avatar, in green. It is only a picture. */}
            <View
              testID="profile-avatar"
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={styles.avatar}
            >
              <Ionicons
                name="person"
                size={36}
                color={Colors.light.surfaceSecondary}
              />
            </View>
          </View>

          <AccountCard />
        </View>
      </ScrollView>

      <GardenPickerOverlay />
    </View>
  );
}
