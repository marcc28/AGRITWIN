import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SetupLayout } from '@/components/device-setup/SetupLayout';
import { Colors } from '@/constants/theme';
import { styles } from '@/styles/device-setup.styles';
import { parseId } from '@/utils/parseId';

// Bluetooth is not available in the browser: the real flow only runs on the
// phone app, so the web version only explains it.
export default function AddDeviceWebScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const fieldId = parseId(params.id);

  function goBack() {
    router.replace({
      pathname: '/field-detail',
      params: { id: String(fieldId) },
    });
  }

  return (
    <SetupLayout onBack={goBack}>
      <View style={styles.card}>
        <View style={styles.centered}>
          <Ionicons
            name="phone-portrait-outline"
            size={32}
            color={Colors.light.textMuted}
            style={styles.statusIcon}
          />
          <Text style={styles.cardTitle}>{t('addDevice.web.title')}</Text>
          <Text style={styles.cardText}>{t('addDevice.web.hint')}</Text>
        </View>
      </View>
    </SetupLayout>
  );
}
