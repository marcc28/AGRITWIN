import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FieldPhoto } from '../components/FieldPhoto';
import { SensorCard } from '../components/SensorCard';
import { getFieldCrops, type FieldCrop } from '../services/api_fieldCrops';
import { getCrops, type Crop } from '../services/api_crops';
import {
  getDashboard,
  getField,
  isAuthError,
  type Dashboard,
  type FieldDetail,
  type FieldDevice,
} from '../services/api';
import { clearAuth, getAuth } from '../services/auth';
import { styles } from '../styles/field-detail.styles';
import { Colors } from '../constants/theme';
import { parseId } from '../utils/parseId';

function dash(value: string | number | null | undefined): string {
  if (value == null || value === '') {
    return '—';
  }
  return String(value);
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

  const [field, setField] = useState<FieldDetail | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [dashboardError, setDashboardError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<FieldDevice | null>(
    null,
  );
  const [fieldCrops, setFieldCrops] = useState<FieldCrop[]>([]);
  const [cropCatalog, setCropCatalog] = useState<Crop[]>([]);
  const [cropsError, setCropsError] = useState('');

  useEffect(() => {
    async function load() {
      if (!Number.isFinite(fieldId)) {
        setErrorMessage(t('settings.errors.invalidId'));
        setLoading(false);
        return;
      }

      try {
        const nextField = await getField(fieldId);
        setField(nextField);
      } catch (error) {
        if (isAuthError(error)) {
          await clearAuth();
          router.replace('/auth/login');
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : t('settings.errors.loadGarden');
        setErrorMessage(message);
        setLoading(false);
        return;
      }

      try {
        const auth = await getAuth();
        if (!auth?.token) {
          throw new Error('Not authenticated');
        }

        const [nextFieldCrops, nextCropCatalog] = await Promise.all([
          getFieldCrops(0, 100, auth.token, { field_id: fieldId }),
          getCrops(0, 100, auth.token),
        ]);
        setFieldCrops(nextFieldCrops);
        setCropCatalog(nextCropCatalog);
      } catch (error) {
        if (isAuthError(error)) {
          await clearAuth();
          router.replace('/auth/login');
          return;
        }
        setCropsError(
          error instanceof Error
            ? error.message
            : t('settings.errors.loadCrops'),
        );
      }

      try {
        const nextDashboard = await getDashboard(fieldId);
        setDashboard(nextDashboard);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t('settings.errors.loadData');
        setDashboardError(message);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [fieldId, t]);

  function goToEdit() {
    router.push({
      pathname: '/edit-field',
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
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t('settings.fieldDetail.crops')}
                </Text>
                {cropsError ? (
                  <Text style={styles.emptyText}>{cropsError}</Text>
                ) : fieldCrops.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {t('settings.fieldDetail.noCrops')}
                  </Text>
                ) : (
                  fieldCrops.map((fieldCrop) => {
                    const crop = cropCatalog.find(
                      (item) => String(item.id) === String(fieldCrop.crop_id),
                    );
                    const statusKey = [
                      'planned',
                      'planted',
                      'harvested',
                    ].includes(fieldCrop.status)
                      ? fieldCrop.status
                      : null;

                    return (
                      <View key={String(fieldCrop.id)} style={styles.cropRow}>
                        <Text style={styles.cropName} numberOfLines={1}>
                          {fieldCrop.crop_name ??
                            crop?.name ??
                            `Cultiu #${fieldCrop.crop_id}`}
                        </Text>
                        <Text
                          style={[
                            styles.status,
                            fieldCrop.status === 'planted'
                              ? styles.statusOn
                              : fieldCrop.status === 'harvested'
                                ? styles.statusHarvested
                                : styles.statusPlanned,
                          ]}
                        >
                          {statusKey
                            ? t(
                                `settings.fieldDetail.cropStatuses.${statusKey}`,
                              )
                            : fieldCrop.status}
                        </Text>
                      </View>
                    );
                  })
                )}
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
