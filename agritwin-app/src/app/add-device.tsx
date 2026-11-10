import { useEffect } from 'react';
import { Linking, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { DeviceSetupScreen } from '@/components/device-setup/DeviceSetupScreen';
import { useDeviceSetup } from '@/hooks/use-device-setup';
import { styles } from '@/styles/device-setup.styles';
import { parseId } from '@/utils/parseId';

function goToField(fieldId: number) {
  router.replace({
    pathname: '/field-detail',
    params: { id: String(fieldId) },
  });
}

export default function AddDeviceScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const fieldId = parseId(params.id);
  const setup = useDeviceSetup(fieldId);
  const { startScan } = setup;
  const validField = Number.isInteger(fieldId) && fieldId > 0;

  useEffect(() => {
    if (validField) {
      void startScan();
    }
  }, [startScan, validField]);

  if (!validField) {
    return (
      <View style={styles.screen}>
        <View style={styles.scrollContent}>
          <Text style={styles.cardText}>{t('settings.errors.invalidId')}</Text>
        </View>
      </View>
    );
  }

  return (
    <DeviceSetupScreen
      setup={setup}
      onClose={() => goToField(fieldId)}
      onOpenSettings={() => void Linking.openSettings()}
    />
  );
}
