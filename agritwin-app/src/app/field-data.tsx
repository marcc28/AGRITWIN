import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SensorModal } from '../components/SensorModal';
import { getDashboard, isAuthError, type Dashboard } from '../services/api';
import { clearAuth } from '../services/auth';
import { styles } from '../styles/field-detail.styles';
import { Colors } from '../constants/theme';
import { parseId } from '../utils/parseId';

export default function FieldDataScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const fieldId = parseId(params.id);

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!Number.isFinite(fieldId)) {
        setErrorMessage(t('settings.errors.invalidId'));
        setLoading(false);
        return;
      }

      try {
        const data = await getDashboard(fieldId);
        setDashboard(data);
        if (!data.latest) {
          setErrorMessage(
            data.device_ids.length === 0
              ? t('settings.errors.noDevice')
              : t('settings.errors.noReading'),
          );
        }
      } catch (error) {
        if (isAuthError(error)) {
          await clearAuth();
          router.replace('/auth/login');
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : t('settings.errors.loadData');
        setErrorMessage(message);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [fieldId, t]);

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
