import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { styles } from '@/styles/device-setup.styles';

type Props = Readonly<{
  onBack: () => void;
  backDisabled?: boolean;
  children: ReactNode;
}>;

/** Page frame of "Add device": back link, eyebrow and title. */
export function SetupLayout({ onBack, backDisabled, children }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Pressable
            style={styles.backRow}
            onPress={onBack}
            disabled={backDisabled}
            accessibilityRole="button"
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={Colors.light.textSecondary}
            />
            <Text style={styles.backText}>{t('addDevice.back')}</Text>
          </Pressable>

          <Text style={styles.eyebrow}>{t('addDevice.eyebrow')}</Text>
          <Text style={styles.title}>{t('addDevice.title')}</Text>

          {children}
        </View>
      </ScrollView>
    </View>
  );
}
