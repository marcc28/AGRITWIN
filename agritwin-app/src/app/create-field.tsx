import { useState } from 'react';
import { Text, View, Pressable, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { defaultPhotoIndex } from '../constants/gardenPhotos';
import { FIELD_TYPES, SOIL_TYPES } from '../constants/fieldOptions';
import {
  createDevice,
  createField,
  geocodeLocation,
  reverseGeocodeLocation,
  isAuthError,
} from '../services/api';
import {
  DeviceDraftFields,
  emptyDeviceDraft,
  filledDevices,
  hasIncompleteDevices,
  type DeviceDraft,
} from '../components/DeviceDraftFields';
import { FieldOptionChips } from '../components/FieldOptionChips';
import { GardenPhotoPicker } from '../components/GardenPhotoPicker';
import { OptionChip } from '../components/OptionChip';
import { FieldBoundaryPicker } from '../components/FieldBoundaryPicker';
import type { MapPoint } from '../components/field-location/types';
import {
  AREA_UNITS,
  BORDER_FIELD_TYPES,
  MAX_FIELD_AREA,
  parseArea,
  displayArea,
  fieldGeometry,
  type AreaUnit,
} from '../utils/fieldGeometry';
import { FieldLocationPicker } from '../components/FieldLocationPicker';
import { clearAuth } from '../services/auth';
import { setCurrentField } from '../services/currentField';
import { setFieldPhotoIndex } from '../services/fieldPhoto';
import { styles } from '../styles/create-field.styles';
import { Colors } from '../constants/theme';

function createSubmitLabel(
  saving: boolean,
  fromProfile: boolean,
  t: (key: string) => string,
) {
  if (saving) {
    return t('settings.saving');
  }
  if (fromProfile) {
    return t('settings.createField.submitNext');
  }
  return t('settings.createField.submitFirst');
}

function goToSettings() {
  router.replace('/app/settings');
}

async function logoutToLogin() {
  await clearAuth();
  router.replace('/auth/login');
}

export default function CreateFieldScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ from?: string | string[] }>();
  const fromProfile =
    (Array.isArray(params.from) ? params.from[0] : params.from) === 'profile';

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [fieldType, setFieldType] = useState<string>(FIELD_TYPES[0]);
  const [soilType, setSoilType] = useState<string>(SOIL_TYPES[0]);
  const [sizeValue, setSizeValue] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('m2');
  const [boundary, setBoundary] = useState<MapPoint[] | null>(null);
  const [excludedZones, setExcludedZones] = useState<MapPoint[][]>([]);
  const [boundaryOpen, setBoundaryOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(defaultPhotoIndex(0));
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [later, setLater] = useState(true);
  const [deviceDrafts, setDeviceDrafts] = useState<DeviceDraft[]>([]);

  async function handleLocate() {
    const query = location.trim();
    if (!query) {
      setErrorMessage(t('settings.createField.errors.locationRequired'));
      return;
    }

    try {
      setLocating(true);
      setErrorMessage('');
      const found = await geocodeLocation(query);
      if (!boundary) {
        setLat(found.lat);
        setLon(found.lon);
      }
      setLocation((found.label ?? query).slice(0, 255));
    } catch (error) {
      if (isAuthError(error)) {
        await clearAuth();
        router.replace('/auth/login');
        return;
      }
      if (!boundary) {
        setLat(null);
        setLon(null);
      }
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('settings.createField.errors.locationNotFound'),
      );
    } finally {
      setLocating(false);
    }
  }

  async function applyMapLocation(point: MapPoint) {
    setMapOpen(false);
    setBoundaryOpen(false);
    setLat(point.lat);
    setLon(point.lon);
    setLocation('');
    setErrorMessage('');
    setLocating(true);
    try {
      const found = await reverseGeocodeLocation(point.lat, point.lon);
      if (!found.label?.trim()) throw new Error('addressUnavailable');
      setLocation(found.label.slice(0, 255));
    } catch (error) {
      if (isAuthError(error)) {
        await logoutToLogin();
        return;
      }
      setErrorMessage(t('settings.createField.errors.addressUnavailable'));
    } finally {
      setLocating(false);
    }
  }
  function changeAreaUnit(unit: AreaUnit) {
    const m2 = boundary
      ? fieldGeometry(boundary, excludedZones).areaM2
      : parseArea(sizeValue, areaUnit);
    if (m2 !== null && Number.isFinite(m2)) setSizeValue(displayArea(m2, unit));
    setAreaUnit(unit);
  }

  async function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage(t('settings.errors.nameRequired'));
      return;
    }

    const parsedSize = boundary
      ? fieldGeometry(boundary, excludedZones).areaM2
      : parseArea(sizeValue, areaUnit);
    if (
      parsedSize != null &&
      (!Number.isFinite(parsedSize) ||
        parsedSize < 0.01 ||
        parsedSize > MAX_FIELD_AREA)
    ) {
      setErrorMessage(t('settings.errors.sizeNumber'));
      return;
    }

    const devices = later ? [] : filledDevices(deviceDrafts);
    if (!later && hasIncompleteDevices(deviceDrafts)) {
      setErrorMessage(t('settings.createField.errors.deviceIdRequired'));
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      const created = await createField({
        name: trimmedName,
        location: location.trim() || null,
        lat,
        lon,
        field_type: fieldType || null,
        soil_type: soilType || null,
        size_m2: parsedSize,
        ...(boundary ? { boundary, excluded_zones: excludedZones } : {}),
      });
      await setFieldPhotoIndex(created.id, photoIndex);
      await setCurrentField({ id: created.id, name: created.name });
      await Promise.all(
        devices.map((device) => createDevice(created.id, device)),
      );
      if (fromProfile) {
        router.replace({
          pathname: '/field-detail',
          params: { id: String(created.id) },
        });
        return;
      }
      router.replace('/app/home');
    } catch (error) {
      if (isAuthError(error)) {
        await clearAuth();
        router.replace('/auth/login');
        return;
      }
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('settings.createField.errors.createFailed'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.topRow}>
            <Text style={styles.brand}>AGRITWIN</Text>
            <View style={styles.topChip}>
              <Text style={styles.topChipText} numberOfLines={1}>
                {name.trim() || t('settings.createField.firstGarden')}
              </Text>
            </View>
          </View>

          {fromProfile ? (
            <Pressable
              style={styles.backRow}
              onPress={goToSettings}
              disabled={saving}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={Colors.light.textSecondary}
              />
              <Text style={styles.backText}>{t('settings.myGardens')}</Text>
            </Pressable>
          ) : null}

          <Text style={styles.eyebrow}>
            {t('settings.createField.eyebrow')}
          </Text>
          <Text style={styles.title}>
            {fromProfile
              ? t('settings.createField.titleNext')
              : t('settings.createField.titleFirst')}
          </Text>
          <Text style={styles.subtitle}>
            {t('settings.createField.subtitle')}
          </Text>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <GardenPhotoPicker
            photoIndex={photoIndex}
            onChange={setPhotoIndex}
            disabled={saving}
            photoStyle={styles.hero}
          />

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {t('settings.createField.details')}
              </Text>
              <Text style={styles.cardHint}>
                {t('settings.createField.required')}
              </Text>
            </View>

            <Text style={styles.label}>{t('settings.name')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              editable={!saving}
              placeholder={t('settings.createField.namePlaceholder')}
              placeholderTextColor={Colors.light.textMuted}
            />

            <Text style={styles.label}>{t('settings.location')}</Text>
            <View style={styles.locationRow}>
              <TextInput
                style={[styles.input, styles.locationInput]}
                value={location}
                onChangeText={(value) => {
                  setLocation(value);
                  if (!boundary) {
                    setLat(null);
                    setLon(null);
                  }
                }}
                editable={!saving && !locating}
                placeholder={t('settings.createField.locationPlaceholder')}
                placeholderTextColor={Colors.light.textMuted}
              />
              <Pressable
                style={styles.locateButton}
                accessibilityRole="button"
                accessibilityLabel={t('settings.createField.map.open')}
                onPress={() => setMapOpen(true)}
                disabled={saving || locating}
              >
                <Ionicons
                  name="locate-outline"
                  size={18}
                  color={Colors.light.surface}
                />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleLocate()}
              disabled={saving || locating}
            >
              <Text style={styles.lookupText}>
                {t(
                  `settings.createField.${locating ? 'lookingUp' : 'lookupAddress'}`,
                )}
              </Text>
            </Pressable>
            {lat != null && lon != null ? (
              <Text style={styles.coords}>
                {t('settings.createField.coords', {
                  lat: lat.toFixed(6),
                  lon: lon.toFixed(6),
                })}
              </Text>
            ) : (
              <Text style={styles.coordsHint}>
                {t('settings.createField.coordsHint')}
              </Text>
            )}

            <FieldOptionChips
              fieldType={fieldType}
              soilType={soilType}
              onFieldType={(value) => {
                setFieldType(value);
                if (!BORDER_FIELD_TYPES.includes(value)) {
                  setBoundary(null);
                  setExcludedZones([]);
                }
              }}
              onSoilType={setSoilType}
              disabled={saving || locating}
            >
              {BORDER_FIELD_TYPES.includes(fieldType) ? (
                <View style={styles.boundarySection}>
                  <Text style={styles.boundaryTitle}>
                    {t('settings.createField.boundary.section')}
                  </Text>
                  <Text style={styles.coordsHint}>
                    {t('settings.createField.boundary.optional')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    style={styles.boundaryButton}
                    disabled={saving || locating}
                    onPress={() => setBoundaryOpen(true)}
                  >
                    <Ionicons
                      name="map-outline"
                      size={20}
                      color={Colors.light.primaryDark}
                    />
                    <Text style={styles.boundaryTitle}>
                      {t(
                        `settings.createField.boundary.${boundary ? 'edit' : 'draw'}`,
                      )}
                    </Text>
                  </Pressable>
                  {boundary ? (
                    <>
                      <Text style={styles.coords}>
                        {t('settings.createField.boundary.corners', {
                          count: boundary.length,
                        })}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        disabled={saving || locating}
                        onPress={() => {
                          setBoundary(null);
                          setExcludedZones([]);
                        }}
                      >
                        <Text style={styles.lookupText}>
                          {t('settings.createField.boundary.remove')}
                        </Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              ) : null}
            </FieldOptionChips>

            <Text style={styles.label}>
              {t(
                `settings.createField.${excludedZones.length ? 'netAreaLabel' : 'areaLabel'}`,
              )}
            </Text>
            <TextInput
              style={styles.input}
              value={sizeValue}
              onChangeText={setSizeValue}
              keyboardType="decimal-pad"
              accessibilityLabel={t(
                `settings.createField.${excludedZones.length ? 'netAreaLabel' : 'areaLabel'}`,
              )}
              editable={!saving && !boundary}
              placeholder={t('settings.createField.sizePlaceholder')}
              placeholderTextColor={Colors.light.textMuted}
            />
            <Text style={styles.coordsHint}>
              {t(
                `settings.createField.${boundary ? 'automaticArea' : 'areaUnitLabel'}`,
              )}
            </Text>
            <View style={styles.chipRow}>
              {(Object.keys(AREA_UNITS) as AreaUnit[]).map((unit) => (
                <OptionChip
                  key={unit}
                  label={t(`settings.createField.areaUnits.${unit}`)}
                  selected={areaUnit === unit}
                  onPress={() => changeAreaUnit(unit)}
                  disabled={saving}
                  style={styles.chip}
                  selectedStyle={styles.chipSelected}
                  textStyle={styles.chipText}
                  selectedTextStyle={styles.chipTextSelected}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t('settings.createField.arduinos')}
            </Text>
            <DeviceDraftFields
              later={later}
              onLaterChange={(value) => {
                setLater(value);
                if (value) {
                  setDeviceDrafts([]);
                } else if (deviceDrafts.length === 0) {
                  setDeviceDrafts([emptyDeviceDraft()]);
                }
              }}
              drafts={deviceDrafts}
              onChange={setDeviceDrafts}
              disabled={saving}
            />
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => void handleCreate()}
            disabled={saving || locating}
          >
            <Text style={styles.primaryText}>
              {createSubmitLabel(saving, fromProfile, t)}
            </Text>
          </Pressable>

          {fromProfile ? null : (
            <Pressable onPress={() => void logoutToLogin()} disabled={saving}>
              <Text style={styles.logoutLink}>{t('settings.logout')}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
      {mapOpen ? (
        <FieldLocationPicker
          initialPoint={lat != null && lon != null ? { lat, lon } : null}
          onCancel={() => setMapOpen(false)}
          onConfirm={(point) => {
            setBoundary(null);
            setExcludedZones([]);
            void applyMapLocation(point);
          }}
        />
      ) : null}
      {boundaryOpen ? (
        <FieldBoundaryPicker
          initialPoint={lat != null && lon != null ? { lat, lon } : null}
          initialBoundary={boundary ?? []}
          initialExcludedZones={excludedZones}
          unit={areaUnit}
          onCancel={() => setBoundaryOpen(false)}
          onConfirm={(points, zones) => {
            const geometry = fieldGeometry(points, zones);
            setExcludedZones(zones);
            setBoundary(points);
            setSizeValue(displayArea(geometry.areaM2, areaUnit));
            void applyMapLocation(geometry.center);
          }}
        />
      ) : null}
    </View>
  );
}
