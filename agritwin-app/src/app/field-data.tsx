import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SensorModal } from '../components/SensorModal';
import { useCachedQuery } from '../hooks/use-cached-query';
import { isAuthError } from '../services/api';
import { dashboardQuery } from '../services/queries';
import { clearAuth } from '../services/auth';
import { styles } from '../styles/field-detail.styles';
import { Colors } from '../constants/theme';
import { parseId } from '../utils/parseId';

export default function FieldDataScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const fieldId = parseId(params.id);

  // Last readings from the cache at once; always refreshed from the server.
  const validId = Number.isFinite(fieldId);
  const result = useCachedQuery({
    ...dashboardQuery(fieldId),
    enabled: validId,
  });
  const dashboard = result.data ?? null;
  const loading = validId && !dashboard && !result.isError;

  let errorMessage = '';
  if (!validId) {
    errorMessage = t('settings.errors.invalidId');
  } else if (dashboard && !dashboard.latest) {
    errorMessage =
      dashboard.device_ids.length === 0
        ? t('settings.errors.noDevice')
        : t('settings.errors.noReading');
  } else if (!dashboard && result.isError) {
    errorMessage =
      result.error instanceof Error
        ? result.error.message
        : t('settings.errors.loadData');
  }

  const sessionExpired = isAuthError(result.error);

  useEffect(() => {
    if (!sessionExpired) {
      return;
    }
    async function logOut() {
      await clearAuth();
      router.replace('/auth/login');
    }
    void logOut();
  }, [sessionExpired]);

  function goToField() {
    router.replace({
      pathname: '/field-detail',
      params: { id: String(fieldId) },
    });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.dataHeader}>
        <Pressable style={styles.backRow} onPress={goToField}>
          <Ionicons
            name="chevron-back"
            size={18}
            color={Colors.light.textSecondary}
          />
          <Text style={styles.backText}>
            {t('settings.fieldDetail.dataBack')}
          </Text>
        </Pressable>

        {loading ? (
          <Text style={styles.emptyText}>{t('settings.loading')}</Text>
        ) : null}

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
      </View>

      {dashboard?.latest ? (
        <SensorModal
          visible
          asScreen
          dashboard={dashboard}
          latest={dashboard.latest}
          onClose={goToField}
        />
      ) : null}
    </View>
  );
}
