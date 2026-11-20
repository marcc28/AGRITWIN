import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FieldPhoto } from '../components/FieldPhoto';
import { SensorCard } from '../components/SensorCard';
import { useCachedQuery } from '../hooks/use-cached-query';
import { isAuthError, type FieldDevice } from '../services/api';
import { clearAuth } from '../services/auth';
import {
  cropCatalogQuery,
  dashboardQuery,
  fieldCropsQuery,
  fieldDetailQuery,
} from '../services/queries';
import { styles } from '../styles/field-detail.styles';
import { Colors } from '../constants/theme';
import { parseId } from '../utils/parseId';

function dash(value: string | number | null | undefined): string {
  if (value == null || value === '') {
    return '—';
  }
  return String(value);
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function goToProfile() {
  router.replace('/app/settings');
}

function optionLabel(
  t: (key: string, options?: { defaultValue: string }) => string,
  group: 'fieldTypes' | 'soilTypes',
  value: string | null,
): string {
  if (!value) {
    return '—';
  }
  return t(`settings.${group}.${value}`, { defaultValue: value });
}

export default function FieldDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const fieldId = parseId(params.id);

  const [selectedDevice, setSelectedDevice] = useState<FieldDevice | null>(
    null,
  );

  // Garden, crops and sensor data load in parallel. What is in the cache is
  // shown at once and refreshed in the background.
  const validId = Number.isFinite(fieldId);
  const fieldResult = useCachedQuery({
    ...fieldDetailQuery(fieldId),
    enabled: validId,
  });
  const cropsResult = useCachedQuery({
    ...fieldCropsQuery(fieldId),
    enabled: validId,
  });
  const catalogResult = useCachedQuery({
    ...cropCatalogQuery(),
    enabled: validId,
  });
  const dashboardResult = useCachedQuery({
    ...dashboardQuery(fieldId),
    enabled: validId,
  });

  const field = fieldResult.data ?? null;
  const dashboard = dashboardResult.data ?? null;
  const fieldCrops = cropsResult.data ?? [];
  const cropCatalog = catalogResult.data ?? [];

  let errorMessage = '';
  if (!validId) {
    errorMessage = t('settings.errors.invalidId');
  } else if (!field && fieldResult.isError) {
    errorMessage = errorText(
      fieldResult.error,
      t('settings.errors.loadGarden'),
    );
  }
  const loading = validId && !field && !fieldResult.isError;

  const cropsFailure =
    (!cropsResult.data && cropsResult.error) ||
    (!catalogResult.data && catalogResult.error);
  const cropsError = cropsFailure
    ? errorText(cropsFailure, t('settings.errors.loadCrops'))
    : '';
  const dashboardError =
    !dashboard && dashboardResult.isError
      ? errorText(dashboardResult.error, t('settings.errors.loadData'))
      : '';

  const sessionExpired = [fieldResult, cropsResult, catalogResult].some(
    (result) => isAuthError(result.error),
  );

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

  function goToEdit() {
    router.push({
      pathname: '/edit-field',
      params: { id: String(fieldId) },
    });
  }

  function goToAddDevice() {
    router.push({
      pathname: '/add-device',
      params: { id: String(fieldId) },
    });
  }

  function goToData() {
    router.push({
      pathname: '/field-data',
      params: { id: String(fieldId) },
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          <Pressable style={styles.backRow} onPress={goToProfile}>
            <Ionicons
              name="chevron-back"
              size={18}
              color={Colors.light.textSecondary}
            />
            <Text style={styles.backText}>
              {t('settings.fieldDetail.back')}
            </Text>
          </Pressable>

          <Text style={styles.eyebrow}>
            {t('settings.fieldDetail.eyebrow')}
          </Text>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          {loading ? (
            <Text style={styles.emptyText}>{t('settings.loading')}</Text>
          ) : field ? (
            <>
              <View style={styles.heroCard}>
                <FieldPhoto fieldId={field.id} style={styles.photo} />
                <View style={styles.nameRow}>
                  <Text style={styles.title} numberOfLines={2}>
                    {field.name}
                  </Text>
                  <Pressable style={styles.editButton} onPress={goToEdit}>
                    <Text style={styles.editText}>
                      {t('settings.fieldDetail.edit')}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t('settings.fieldDetail.info')}
                </Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('settings.location')}</Text>
                  <Text style={styles.infoValue}>{dash(field.location)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('settings.type')}</Text>
                  <Text style={styles.infoValue}>
                    {optionLabel(t, 'fieldTypes', field.field_type)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('settings.soil')}</Text>
                  <Text style={styles.infoValue}>
                    {optionLabel(t, 'soilTypes', field.soil_type)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('settings.size')}</Text>
                  <Text style={styles.infoValue}>
                    {field.size_m2 == null ? '—' : `${field.size_m2} m²`}
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t('settings.fieldDetail.devices')}
                </Text>
                {field.devices.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {t('settings.fieldDetail.noDevices')}
                  </Text>
                ) : (
                  field.devices.map((device) => (
                    <Pressable
                      key={device.id}
                      style={styles.deviceRow}
                      onPress={() => setSelectedDevice(device)}
                    >
                      <Text style={styles.deviceId} numberOfLines={1}>
                        {device.id}
                      </Text>
                      <Text
                        style={[
                          styles.status,
                          device.battery_status
                            ? styles.statusOn
                            : styles.statusOff,
                        ]}
                      >
                        {device.battery_status
                          ? t('settings.fieldDetail.connected')
                          : t('settings.fieldDetail.disconnected')}
                      </Text>
                    </Pressable>
                  ))
                )}
                <Pressable
                  testID="add-device-button"
                  style={styles.addDeviceButton}
                  onPress={goToAddDevice}
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={18} color={Colors.light.surface} />
                  <Text style={styles.addDeviceText}>
                    {t('addDevice.button')}
                  </Text>
                </Pressable>
              </View>

              <SensorCard
                dashboard={dashboard}
                errorMessage={dashboardError}
                onPress={goToData}
                title={t('settings.fieldDetail.sensorTitle')}
                subtitle={t('settings.fieldDetail.sensorSubtitle')}
                hint={t('settings.fieldDetail.sensorHint')}
              />
            </>
          ) : null}
        </View>
      </ScrollView>

      {selectedDevice ? (
        <View style={styles.popupWrap} pointerEvents="box-none">
          <Pressable
            testID="device-popup-backdrop"
            style={styles.popupBackdrop}
            onPress={() => setSelectedDevice(null)}
          />
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>
              {t('settings.fieldDetail.devicePopupTitle')}
            </Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {t('settings.createField.deviceId')}
              </Text>
              <Text style={styles.infoValue}>{selectedDevice.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {t('settings.createField.deviceBrand')}
              </Text>
              <Text style={styles.infoValue}>{dash(selectedDevice.brand)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {t('settings.createField.deviceSerial')}
              </Text>
              <Text style={styles.infoValue}>
                {dash(selectedDevice.serial_number)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {t('settings.fieldDetail.deviceStatus')}
              </Text>
              <Text
                style={[
                  styles.status,
                  selectedDevice.battery_status
                    ? styles.statusOn
                    : styles.statusOff,
                ]}
              >
                {selectedDevice.battery_status
                  ? t('settings.fieldDetail.connected')
                  : t('settings.fieldDetail.disconnected')}
              </Text>
            </View>
            <Pressable
              style={styles.popupClose}
              onPress={() => setSelectedDevice(null)}
            >
              <Text style={styles.popupCloseText}>
                {t('settings.fieldDetail.devicePopupClose')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
