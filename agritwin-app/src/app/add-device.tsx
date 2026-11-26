import { useEffect } from 'react';
import { Linking, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { DeviceSetupScreen } from '@/components/device-setup/DeviceSetupScreen';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useDeviceSetup } from '@/hooks/use-device-setup';
import { fieldDetailQuery } from '@/services/queries';
import { styles } from '@/styles/device-setup.styles';
import { leaveAddDevice, parseOrigin } from '@/utils/addDeviceNavigation';
import { parseId } from '@/utils/parseId';

export default function AddDeviceScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    id: string | string[];
    from?: string | string[];
  }>();
  const fieldId = parseId(params.id);
  const origin = parseOrigin(params.from);
  const setup = useDeviceSetup(fieldId);
  const { startScan } = setup;
  const validField = Number.isInteger(fieldId) && fieldId > 0;
  // The garden data says if it still shows simulated readings (no real board).
  const fieldResult = useCachedQuery({
    ...fieldDetailQuery(fieldId),
    enabled: validField,
  });
  const simulatedData = fieldResult.data?.simulated_data === true;

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
      simulatedData={simulatedData}
      onClose={() => leaveAddDevice(fieldId, origin)}
      onOpenSettings={() => void Linking.openSettings()}
    />
  );
}
