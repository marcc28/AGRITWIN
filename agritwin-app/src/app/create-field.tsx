import { useMemo, useState } from 'react';
import { Platform, Text, View, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { defaultPhotoIndex } from '../constants/gardenPhotos';
import {
  createField,
  geocodeLocation,
  reverseGeocodeLocation,
  isAuthError,
} from '../services/api';
import { FieldFormError } from '../components/FieldFormError';
import {
  fieldFormErrors,
  firstFieldError,
  FIELD_FORM_STEPS,
  type FieldFormKey,
} from '../utils/fieldFormValidation';
import { FieldFormSteps } from '../components/FieldFormSteps';
import { FieldOptionChips } from '../components/FieldOptionChips';
import { GardenPhotoPicker } from '../components/GardenPhotoPicker';
import { OptionChip } from '../components/OptionChip';
import { FieldBoundaryPicker } from '../components/FieldBoundaryPicker';
import { FieldDevicesSection } from '../components/FieldDevicesSection';
import type { MapPoint } from '../components/field-location/types';
import {
  AREA_UNITS,
  BORDER_FIELD_TYPES,
  parseArea,
  displayArea,
  fieldGeometry,
  type AreaUnit,
} from '../utils/fieldGeometry';
import { FieldLocationPicker } from '../components/FieldLocationPicker';
import { clearAuth } from '../services/auth';
import { setCurrentField } from '../services/currentField';
import { setFieldPhotoIndex } from '../services/fieldPhoto';
import { loadGardenPickerFields } from '../services/gardenPicker';
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
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const fromSelection = from === 'field-selection';
  const fromProfile = from === 'profile' || fromSelection;

  function goBack() {
    if (fromSelection) {
      router.replace('/field-selection');
      return;
    }
    goToSettings();
  }

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [fieldType, setFieldType] = useState<string>('');
  const [soilType, setSoilType] = useState<string>('');
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
  const [validationThrough, setValidationThrough] = useState(-1);
  const areaM2 = useMemo(() => {
    try {
      return boundary
        ? fieldGeometry(boundary, excludedZones).areaM2
        : parseArea(sizeValue, areaUnit);
    } catch {
      return Number.NaN;
    }
  }, [boundary, excludedZones, sizeValue, areaUnit]);
  const requiredErrors = fieldFormErrors({
    name,
    location,
    point: lat != null && lon != null ? { lat, lon } : null,
    fieldType,
    areaM2,
  });
  function visibleError(key: FieldFormKey) {
    return FIELD_FORM_STEPS[key] <= validationThrough
      ? requiredErrors[key]
      : undefined;
  }
  function validateRequired(through: number) {
    setValidationThrough((current) => Math.max(current, Math.min(through, 2)));
    const failed = firstFieldError(requiredErrors, through);
    if (failed) {
      setStep(FIELD_FORM_STEPS[failed]);
      setErrorMessage('');
      return false;
    }
    return true;
  }
  function navigateStep(target: number) {
    if (target <= step || validateRequired(step)) {
      setStep(target);
      setErrorMessage('');
    }
  }

  const canRetryAddress = lat != null && lon != null && !location.trim();
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

  // With `addDevices` the field is saved and then the "Add device" flow opens.
  async function handleCreate(addDevices = false) {
    if (!validateRequired(2)) return;
    const trimmedName = name.trim();
    const parsedSize = areaM2;

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
      if (fromSelection) {
        await loadGardenPickerFields(true);
      }
      // Where the user ends up when they finish (or skip) adding devices.
      const destination =
        fromProfile && !fromSelection ? 'field-detail' : 'home';
      if (addDevices) {
        router.replace({
          pathname: '/add-device',
          params: { id: String(created.id), from: destination },
        });
        return;
      }
      if (destination === 'field-detail') {
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
      <FieldFormSteps
        steps={['details', 'location', 'characteristics', 'devices'].map(
          (key) => ({
            title: t(`settings.fieldForm.steps.${key}.title`),
            hint: t(`settings.fieldForm.steps.${key}.hint`),
          }),
        )}
        currentStep={step}
        onStepChange={navigateStep}
        disabled={saving || locating}
        header={
          <>
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
                onPress={goBack}
                disabled={saving}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={Colors.light.textSecondary}
                />
                <Text style={styles.backText}>
                  {fromSelection
                    ? t('fieldSelection.back')
                    : t('settings.myGardens')}
                </Text>
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
          </>
        }
        error={errorMessage}
        finalAction={
          <Pressable
            accessibilityRole="button"
            style={[styles.primaryButton, { marginTop: 0, minHeight: 50 }]}
            onPress={() => void handleCreate()}
            disabled={saving || locating}
          >
            <Text style={styles.primaryText}>
              {createSubmitLabel(saving, fromProfile, t)}
            </Text>
          </Pressable>
        }
      >
        {step === 0 ? (
          <View style={styles.card}>
            <GardenPhotoPicker
              photoIndex={photoIndex}
              onChange={setPhotoIndex}
              disabled={saving}
              photoStyle={styles.hero}
            />

            <Text style={styles.label}>{t('settings.name')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              accessibilityLabel={t('settings.name')}
              accessibilityHint={
                visibleError('name') ? t(visibleError('name')!) : undefined
              }
              onChangeText={setName}
              editable={!saving}
              placeholder={t('settings.createField.namePlaceholder')}
              placeholderTextColor={Colors.light.textMuted}
            />
            <FieldFormError error={visibleError('name')} />
          </View>
        ) : null}
        {step === 1 ? (
          <View style={styles.card}>
            <Text style={styles.label}>{t('settings.location')}</Text>
            <View style={styles.locationRow}>
              <TextInput
                style={[styles.input, styles.locationInput]}
                value={location}
                accessibilityLabel={t('settings.location')}
                accessibilityHint={
                  visibleError('location')
                    ? t(visibleError('location')!)
                    : undefined
                }
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
            <FieldFormError error={visibleError('location')} />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (canRetryAddress) void applyMapLocation({ lat, lon });
                else void handleLocate();
              }}
              disabled={saving || locating}
            >
              <Text style={styles.lookupText}>
                {t(
                  `settings.createField.${locating ? 'lookingUp' : canRetryAddress ? 'retryAddress' : 'lookupAddress'}`,
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
          </View>
        ) : null}
        {step === 2 ? (
          <View style={styles.card}>
            <FieldOptionChips
              fieldType={fieldType}
              typeHelp={<FieldFormError error={visibleError('fieldType')} />}
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
            <FieldFormError error={visibleError('area')} />
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
        ) : null}
        {step === 3 ? (
          <>
            <View style={styles.card}>
              <FieldDevicesSection
                plain
                hint={
                  Platform.OS === 'web'
                    ? t('addDevice.web.hint')
                    : t('addDevice.section.createHint')
                }
                addLabel={t('addDevice.section.saveAndAdd')}
                disabled={saving || locating}
                onAdd={
                  Platform.OS === 'web'
                    ? undefined
                    : () => void handleCreate(true)
                }
              />
            </View>
            {fromProfile ? null : (
              <Pressable onPress={() => void logoutToLogin()} disabled={saving}>
                <Text style={styles.logoutLink}>{t('settings.logout')}</Text>
              </Pressable>
            )}
          </>
        ) : null}
      </FieldFormSteps>
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
