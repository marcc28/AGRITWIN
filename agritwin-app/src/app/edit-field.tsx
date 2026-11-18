import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  View,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { defaultPhotoIndex } from '../constants/gardenPhotos';
import {
  deleteDevice,
  isAuthError,
  updateField,
  reverseGeocodeLocation,
  type FieldDevice,
} from '../services/api';
import { FieldDevicesSection } from '../components/FieldDevicesSection';
import { clearAuth, getAuth } from '../services/auth';
import { getCurrentField, setCurrentField } from '../services/currentField';
import { getFieldPhotoIndex, setFieldPhotoIndex } from '../services/fieldPhoto';
import { styles } from '../styles/edit-field.styles';
import { Colors } from '../constants/theme';
import { parseId } from '../utils/parseId';
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
import type { MapPoint } from '../components/field-location/types';
import {
  AREA_UNITS,
  BORDER_FIELD_TYPES,
  parseArea,
  displayArea,
  fieldGeometry,
  type AreaUnit,
} from '../utils/fieldGeometry';
import { styles as areaStyles } from '../styles/create-field.styles';
import { DateField } from '../components/DateField';

import {
  createFieldCrop,
  deleteFieldCrop,
  type FieldCrop,
} from '../services/api_fieldCrops';

import type { Crop } from '../services/api_crops';
import {
  cropCatalogPageQuery,
  fieldCropsQuery,
  fieldDetailQuery,
} from '../services/queries';
import { useCachedQuery } from '../hooks/use-cached-query';
import { queryClient } from '../services/queryClient';

const CROP_PAGE_SIZE = 50;
/** The form reuses garden data loaded less than this long ago. */
const FORM_DATA_MAX_AGE_MS = 15 * 1000;

export default function EditFieldScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    id: string | string[];
    addCrop?: string | string[];
    from?: string | string[];
  }>();
  const fieldId = parseId(params.id);
  const addCropParam = Array.isArray(params.addCrop)
    ? params.addCrop[0]
    : params.addCrop;

  const [step, setStep] = useState(addCropParam === 'true' ? 3 : 0);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [fieldType, setFieldType] = useState<string>('');
  const [soilType, setSoilType] = useState<string>('');
  const [sizeValue, setSizeValue] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('m2');
  const [boundary, setBoundary] = useState<MapPoint[] | null>(null);
  const [excludedZones, setExcludedZones] = useState<MapPoint[][]>([]);
  const [boundaryChanged, setBoundaryChanged] = useState(false);
  const [point, setPoint] = useState<MapPoint | null>(null);
  const [geometryPicker, setGeometryPicker] = useState<
    'view' | 'edit' | 'redraw' | null
  >(null);
  const [locating, setLocating] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(defaultPhotoIndex(fieldId));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    point: point,
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

  const [existingDevices, setExistingDevices] = useState<FieldDevice[]>([]);
  const [existingCrops, setExistingCrops] = useState<FieldCrop[]>([]);
  const [selectedCropId, setSelectedCropId] = useState('');
  const [availableCrops, setAvailableCrops] = useState<Crop[]>([]);
  const [cropOffset, setCropOffset] = useState(0);
  const [cropPage, setCropPage] = useState(0);
  const [hasMoreCrops, setHasMoreCrops] = useState(true);
  const [loadingCrops, setLoadingCrops] = useState(true);
  const [cropSelectorOpen, setCropSelectorOpen] = useState(false);
  const [selectedCropName, setSelectedCropName] = useState('');
  const cropPageLoading = useRef(false);
  const [addingCrop, setAddingCrop] = useState(false);
  const [showCropForm, setShowCropForm] = useState(addCropParam === 'true');
  const [plantedAt, setPlantedAt] = useState('');
  const [expectedHarvestAt, setExpectedHarvestAt] = useState('');
  const [cropNotes, setCropNotes] = useState('');

  function goBack() {
    if (params.from === 'field-selection') {
      router.replace('/field-selection');
      return;
    }
    router.replace({
      pathname: '/field-detail',
      params: { id: String(fieldId) },
    });
  }
  const validFieldId = Number.isFinite(fieldId);
  const [relatedFieldId, setRelatedFieldId] = useState<number | null>(null);
  const initializedFieldId = useRef<number | null>(null);
  const activeFieldId = useRef(fieldId);
  activeFieldId.current = fieldId;
  const mounted = useRef(true);
  const fieldRequest = useCachedQuery({
    ...fieldDetailQuery(fieldId),
    staleTime: FORM_DATA_MAX_AGE_MS,
    enabled: validFieldId,
  });
  const cropsRequest = useCachedQuery({
    ...fieldCropsQuery(fieldId),
    staleTime: FORM_DATA_MAX_AGE_MS,
    enabled: validFieldId && relatedFieldId === fieldId,
  });
  const catalogRequest = useCachedQuery({
    ...cropCatalogPageQuery(0, CROP_PAGE_SIZE),
    enabled: validFieldId && relatedFieldId === fieldId,
  });
  const loadError = [fieldRequest, cropsRequest, catalogRequest].find(
    (request) => request.error && (!request.data || isAuthError(request.error)),
  )?.error;
  const { refetch: refetchField } = fieldRequest;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!validFieldId) {
      setErrorMessage(t('settings.errors.invalidId'));
      setLoading(false);
      return;
    }
    const field = fieldRequest.data;
    if (!field || initializedFieldId.current === fieldId) return;
    initializedFieldId.current = fieldId;
    setLoading(true);
    // Hydrate the editable draft once. Background cache refreshes must never
    // overwrite a name, boundary, unit or address the user is editing.
    setName(field.name);
    setLocation(field.location ?? '');
    setFieldType(field.field_type ?? '');
    setSoilType(field.soil_type ?? '');
    setSizeValue(field.size_m2 != null ? String(field.size_m2) : '');
    setBoundary(field.boundary ?? null);
    setExcludedZones(field.excluded_zones ?? []);
    setAreaUnit('m2');
    setBoundaryChanged(false);
    setPoint(
      field.lat != null && field.lon != null
        ? { lat: field.lat, lon: field.lon }
        : null,
    );

    async function loadLocalPreferences() {
      try {
        const photo = await getFieldPhotoIndex(fieldId);
        const auth = await getAuth();
        if (!mounted.current || activeFieldId.current !== fieldId) return;
        if (!auth?.token)
          throw new Error('No s’ha trobat el token d’autenticació');
        setPhotoIndex(photo);
        setRelatedFieldId(fieldId);
      } catch (error) {
        if (!mounted.current || activeFieldId.current !== fieldId) return;
        if (isAuthError(error)) {
          await clearAuth();
          router.replace('/auth/login');
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : t('settings.errors.loadGarden'),
        );
        setLoadingCrops(false);
        setLoading(false);
      }
    }
    void loadLocalPreferences();
  }, [fieldId, validFieldId, fieldRequest.data, t]);

  useEffect(() => {
    if (fieldRequest.data) setExistingDevices(fieldRequest.data.devices);
  }, [fieldRequest.data]);

  useEffect(() => {
    if (cropsRequest.data) setExistingCrops(cropsRequest.data);
  }, [cropsRequest.data]);

  useEffect(() => {
    if (!catalogRequest.data || cropPage !== 0) return;
    setAvailableCrops(catalogRequest.data);
    setCropOffset(catalogRequest.data.length);
    setHasMoreCrops(catalogRequest.data.length === CROP_PAGE_SIZE);
  }, [catalogRequest.data, cropPage]);

  useEffect(() => {
    const error = loadError;
    if (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('settings.errors.loadGarden'),
      );
      setLoadingCrops(false);
      setLoading(false);
      if (isAuthError(error)) {
        async function returnToLogin() {
          await clearAuth();
          router.replace('/auth/login');
        }
        void returnToLogin();
      }
      return;
    }
    if (
      relatedFieldId === fieldId &&
      cropsRequest.isSuccess &&
      catalogRequest.isSuccess
    ) {
      setLoadingCrops(false);
      setLoading(false);
    }
  }, [
    loadError,
    relatedFieldId,
    fieldId,
    cropsRequest.isSuccess,
    catalogRequest.isSuccess,
    t,
  ]);

  async function loadNextCropPage() {
    if (cropPageLoading.current || loadingCrops || !hasMoreCrops) return;

    cropPageLoading.current = true;
    setLoadingCrops(true);
    try {
      const auth = await getAuth();
      if (!auth?.token) throw new Error('No s’ha trobat el token');

      const nextPage = await queryClient.query(
        cropCatalogPageQuery(cropOffset, CROP_PAGE_SIZE),
      );
      setAvailableCrops(nextPage);
      setCropOffset((offset) => offset + nextPage.length);
      setCropPage((page) => page + 1);
      setHasMoreCrops(nextPage.length === CROP_PAGE_SIZE);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t('settings.errors.loadCrops'),
      );
      setHasMoreCrops(false);
    } finally {
      cropPageLoading.current = false;
      setLoadingCrops(false);
    }
  }

  // Coming back from "Add device" the list shows the new boards. The first
  // time the screen opens, the load above already has them.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return undefined;
      }
      if (!Number.isFinite(fieldId)) {
        return undefined;
      }
      // Revalidate on return from device setup; the query observer updates
      // devices without reinitializing the editable form draft.
      void refetchField();
      return undefined;
    }, [fieldId, refetchField]),
  );

  function handleAddDevice() {
    router.push({
      pathname: '/add-device',
      params: { id: String(fieldId), from: 'edit-field' },
    });
  }

  async function handleRemoveDevice(deviceId: string) {
    try {
      await deleteDevice(fieldId, deviceId);
      setExistingDevices((current) =>
        current.filter((device) => device.id !== deviceId),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('settings.createField.errors.deviceSaveFailed'),
      );
    }
  }

  function changeAreaUnit(unit: AreaUnit) {
    const m2 = boundary
      ? fieldGeometry(boundary, excludedZones).areaM2
      : parseArea(sizeValue, areaUnit);
    if (m2 !== null && Number.isFinite(m2)) setSizeValue(displayArea(m2, unit));
    setAreaUnit(unit);
  }
  function removeBoundary() {
    setBoundary(null);
    setExcludedZones([]);
    setBoundaryChanged(true);
    setSizeValue('');
  }
  async function applyGeometry(points: MapPoint[], zones: MapPoint[][]) {
    const geometry = fieldGeometry(points, zones);
    setGeometryPicker(null);
    setBoundary(points);
    setExcludedZones(zones);
    setBoundaryChanged(true);
    setSizeValue(displayArea(geometry.areaM2, areaUnit));
    setPoint(geometry.center);
    await resolveAddress(geometry.center);
  }

  async function resolveAddress(selectedPoint: MapPoint) {
    setLocating(true);
    setLocation('');
    setErrorMessage('');
    try {
      const found = await reverseGeocodeLocation(
        selectedPoint.lat,
        selectedPoint.lon,
      );
      if (!found.label?.trim()) throw new Error('Address unavailable');
      setLocation(found.label.slice(0, 255));
    } catch (error) {
      if (isAuthError(error)) {
        await clearAuth();
        router.replace('/auth/login');
        return;
      }
      setErrorMessage(t('settings.createField.errors.addressUnavailable'));
    } finally {
      setLocating(false);
    }
  }

  async function handleAccept() {
    if (locating) return;
    if (!validateRequired(2)) return;
    const trimmedName = name.trim();
    const parsedSize = areaM2;

    try {
      setSaving(true);
      setErrorMessage('');
      await updateField(fieldId, {
        name: trimmedName,
        location: location.trim() || null,
        lat: point?.lat ?? null,
        lon: point?.lon ?? null,
        field_type: fieldType || null,
        soil_type: soilType || null,
        size_m2: parsedSize,
        ...(boundary
          ? { boundary, excluded_zones: excludedZones }
          : boundaryChanged
            ? { boundary: null, excluded_zones: [] }
            : {}),
      });
      await setFieldPhotoIndex(fieldId, photoIndex);
      const current = await getCurrentField();
      if (current?.id === fieldId) {
        await setCurrentField({ id: fieldId, name: trimmedName });
      }
      goBack();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('settings.errors.saveGarden');
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCrop() {
    const validDate = (value: string) => {
      if (!value) return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
      );
    };
    if (!validDate(plantedAt) || !validDate(expectedHarvestAt)) {
      setErrorMessage(t('settings.manageCrops.errors.invalidDate'));
      return;
    }
    if (plantedAt && expectedHarvestAt && expectedHarvestAt < plantedAt) {
      setErrorMessage(t('settings.manageCrops.errors.harvestBeforePlanting'));
      return;
    }

    try {
      setAddingCrop(true);
      setErrorMessage('');

      const auth = await getAuth();

      if (!auth?.token) {
        throw new Error('No s’ha trobat el token');
      }

      const newCrop = await createFieldCrop(
        {
          field_id: fieldId,
          crop_id: Number(selectedCropId),
          planted_at: plantedAt || null,
          expected_harvest_at: expectedHarvestAt || null,
          status: 'planted',
          notes: cropNotes.trim() || null,
        },
        auth.token,
      );

      setExistingCrops((current) =>
        current.some((crop) => crop.id === newCrop.id)
          ? current.map((crop) => (crop.id === newCrop.id ? newCrop : crop))
          : [...current, newCrop],
      );
      setSelectedCropId('');
      setSelectedCropName('');
      setPlantedAt('');
      setExpectedHarvestAt('');
      setCropNotes('');
      setShowCropForm(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('settings.manageCrops.errors.addFailed'),
      );
    } finally {
      setAddingCrop(false);
    }
  }
  async function handleRemoveCrop(cropId: string | number) {
    try {
      const auth = await getAuth();

      if (!auth?.token) {
        throw new Error('No s’ha trobat el token');
      }

      await deleteFieldCrop(cropId, auth.token);

      setExistingCrops((current) =>
        current.filter((crop) => crop.id !== cropId),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('settings.manageCrops.errors.removeFailed'),
      );
    }
  }
  return (
    <View style={styles.screen}>
      <FieldFormSteps
        steps={[
          'details',
          'location',
          'characteristics',
          'crops',
          'devices',
        ].map((key) => ({
          title: t(`settings.fieldForm.steps.${key}.title`),
          hint: t(`settings.fieldForm.steps.${key}.hint`),
        }))}
        currentStep={step}
        onStepChange={navigateStep}
        disabled={saving || loading || locating || addingCrop}
        header={
          <>
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
                {t('settings.fieldDetail.dataBack')}
              </Text>
            </Pressable>

            <Text style={styles.eyebrow}>
              {t('settings.fieldDetail.eyebrow')}
            </Text>
            <Text style={styles.title}>{t('settings.editGarden')}</Text>
          </>
        }
        error={errorMessage}
        finalAction={
          <Pressable
            accessibilityRole="button"
            style={[
              styles.button,
              styles.acceptButton,
              { flex: 0, minHeight: 50 },
            ]}
            onPress={() => void handleAccept()}
            disabled={saving || loading || locating}
          >
            <Text style={styles.acceptText}>
              {saving ? t('settings.saving') : t('settings.accept')}
            </Text>
          </Pressable>
        }
      >
        {loading ? (
          <Text style={styles.label}>{t('settings.loading')}</Text>
        ) : (
          <>
            {step === 0 ? (
              <View style={styles.card}>
                <Text style={styles.label}>{t('settings.photo')}</Text>
                <GardenPhotoPicker
                  photoIndex={photoIndex}
                  onChange={setPhotoIndex}
                  disabled={saving}
                  photoStyle={styles.photo}
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
                />
                <FieldFormError error={visibleError('name')} />
              </View>
            ) : null}
            {step === 1 ? (
              <View style={styles.card}>
                <Text style={styles.label}>{t('settings.location')}</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  accessibilityLabel={t('settings.location')}
                  accessibilityHint={
                    visibleError('location')
                      ? t(visibleError('location')!)
                      : undefined
                  }
                  onChangeText={(value) => {
                    setLocation(value);
                    if (!boundary) setPoint(null);
                  }}
                  editable={!saving && !locating}
                />
                <FieldFormError error={visibleError('location')} />

                {point ? (
                  <Text style={areaStyles.coords}>
                    {t('settings.createField.coords', {
                      lat: point.lat.toFixed(6),
                      lon: point.lon.toFixed(6),
                    })}
                  </Text>
                ) : null}

                {locating ? (
                  <Text
                    style={areaStyles.lookupText}
                    accessibilityLiveRegion="polite"
                  >
                    {t('settings.createField.lookingUp')}
                  </Text>
                ) : point && !location.trim() ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving}
                    onPress={() => void resolveAddress(point)}
                  >
                    <Text style={areaStyles.lookupText}>
                      {t('settings.createField.retryAddress')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {step === 2 ? (
              <View style={styles.card}>
                <FieldOptionChips
                  fieldType={fieldType}
                  typeHelp={
                    <FieldFormError error={visibleError('fieldType')} />
                  }
                  soilType={soilType}
                  onFieldType={(value) => {
                    setFieldType(value);
                    if (!BORDER_FIELD_TYPES.includes(value) && boundary)
                      removeBoundary();
                  }}
                  onSoilType={setSoilType}
                  disabled={saving || locating}
                >
                  {BORDER_FIELD_TYPES.includes(fieldType) ? (
                    <View style={areaStyles.boundarySection}>
                      <Text style={areaStyles.boundaryTitle}>
                        {t('settings.createField.boundary.section')}
                      </Text>
                      {boundary ? (
                        <>
                          <Pressable
                            accessibilityRole="button"
                            disabled={saving || locating}
                            onPress={() => setGeometryPicker('view')}
                            style={areaStyles.boundaryButton}
                          >
                            <Text style={areaStyles.boundaryTitle}>
                              {t('settings.createField.boundary.view')}
                            </Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            disabled={saving || locating}
                            onPress={() => setGeometryPicker('edit')}
                            style={areaStyles.boundaryButton}
                          >
                            <Text style={areaStyles.boundaryTitle}>
                              {t('settings.createField.boundary.edit')}
                            </Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            disabled={saving || locating}
                            onPress={() => setGeometryPicker('redraw')}
                          >
                            <Text style={areaStyles.lookupText}>
                              {t('settings.createField.boundary.redraw')}
                            </Text>
                          </Pressable>
                          <Text style={areaStyles.coordsHint}>
                            {t('settings.createField.boundary.replaceHint')}
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            disabled={saving || locating}
                            onPress={removeBoundary}
                          >
                            <Text style={areaStyles.lookupText}>
                              {t('settings.createField.boundary.remove')}
                            </Text>
                          </Pressable>
                        </>
                      ) : (
                        <>
                          <Text style={areaStyles.coordsHint}>
                            {t('settings.createField.boundary.noBoundary')}
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            disabled={saving || locating}
                            onPress={() => setGeometryPicker('redraw')}
                            style={areaStyles.boundaryButton}
                          >
                            <Text style={areaStyles.boundaryTitle}>
                              {t('settings.createField.boundary.draw')}
                            </Text>
                          </Pressable>
                        </>
                      )}
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
                  editable={!saving && !locating && !boundary}
                />
                <FieldFormError error={visibleError('area')} />
                <Text style={areaStyles.coordsHint}>
                  {t(
                    `settings.createField.${boundary ? 'automaticArea' : 'areaUnitLabel'}`,
                  )}
                </Text>
                <View style={areaStyles.chipRow}>
                  {(Object.keys(AREA_UNITS) as AreaUnit[]).map((unit) => (
                    <OptionChip
                      key={unit}
                      label={t(`settings.createField.areaUnits.${unit}`)}
                      selected={areaUnit === unit}
                      onPress={() => changeAreaUnit(unit)}
                      disabled={saving || locating}
                      style={areaStyles.chip}
                      selectedStyle={areaStyles.chipSelected}
                      textStyle={areaStyles.chipText}
                      selectedTextStyle={areaStyles.chipTextSelected}
                    />
                  ))}
                </View>
              </View>
            ) : null}
            {step === 3 ? (
              <View style={styles.card}>
                <View style={styles.cropSection}>
                  <Text style={styles.cropSectionTitle}>
                    {t('settings.manageCrops.title')}
                  </Text>
                  <Text style={styles.cropSectionHint}>
                    {t('settings.manageCrops.hint')}
                  </Text>

                  {existingCrops.map((fieldCrop) => {
                    const crop = availableCrops.find(
                      (item) => String(item.id) === String(fieldCrop.crop_id),
                    );

                    return (
                      <View key={String(fieldCrop.id)} style={styles.cropRow}>
                        <Text style={styles.cropName}>
                          {fieldCrop.crop_name ??
                            crop?.name ??
                            t('fieldCrops.crop', { id: fieldCrop.crop_id })}
                        </Text>

                        <Pressable
                          onPress={() => void handleRemoveCrop(fieldCrop.id)}
                          disabled={saving || addingCrop}
                          accessibilityLabel={t(
                            'settings.manageCrops.removeCrop',
                            {
                              crop:
                                crop?.name ?? t('settings.fieldDetail.crops'),
                            },
                          )}
                          hitSlop={8}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={20}
                            color="#D9534F"
                          />
                        </Pressable>
                      </View>
                    );
                  })}

                  {showCropForm ? (
                    <View style={styles.cropForm}>
                      <Text style={styles.label}>
                        {t('settings.manageCrops.cropType')}
                      </Text>
                      <Pressable
                        style={styles.cropPicker}
                        onPress={() => setCropSelectorOpen(true)}
                        disabled={addingCrop || saving || loadingCrops}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.cropPickerText,
                            !selectedCropName && styles.cropPickerPlaceholder,
                          ]}
                        >
                          {selectedCropName ||
                            t('settings.manageCrops.selectCrop')}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={18}
                          color={Colors.light.textSecondary}
                        />
                      </Pressable>

                      <Modal
                        testID="crop-selector-modal"
                        visible={cropSelectorOpen}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setCropSelectorOpen(false)}
                      >
                        <View style={styles.cropModalBackdrop}>
                          <View style={styles.cropModal}>
                            <View style={styles.cropModalHeader}>
                              <Text style={styles.cropModalTitle}>
                                {t('settings.manageCrops.cropType')}
                              </Text>
                              <Pressable
                                onPress={() => setCropSelectorOpen(false)}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel={t('settings.cancel')}
                              >
                                <Ionicons
                                  name="close"
                                  size={22}
                                  color={Colors.light.textSecondary}
                                />
                              </Pressable>
                            </View>
                            <FlatList
                              testID="crop-selector-list"
                              key={cropPage}
                              data={availableCrops.filter(
                                (crop) =>
                                  !existingCrops.some(
                                    (fieldCrop) =>
                                      String(fieldCrop.crop_id) ===
                                      String(crop.id),
                                  ),
                              )}
                              keyExtractor={(crop) => String(crop.id)}
                              onEndReached={() => void loadNextCropPage()}
                              onEndReachedThreshold={0.35}
                              renderItem={({ item: crop }) => (
                                <Pressable
                                  style={styles.cropOption}
                                  onPress={() => {
                                    setSelectedCropId(String(crop.id));
                                    setSelectedCropName(crop.name);
                                    setCropSelectorOpen(false);
                                  }}
                                >
                                  <Text style={styles.cropOptionText}>
                                    {crop.name}
                                  </Text>
                                </Pressable>
                              )}
                              ListEmptyComponent={
                                loadingCrops ? (
                                  <ActivityIndicator
                                    style={styles.cropListLoader}
                                    color={Colors.light.primary}
                                  />
                                ) : (
                                  <Text style={styles.cropEmpty}>
                                    {t('settings.manageCrops.noAvailableCrops')}
                                  </Text>
                                )
                              }
                              ListFooterComponent={
                                loadingCrops && availableCrops.length > 0 ? (
                                  <ActivityIndicator
                                    style={styles.cropListLoader}
                                    color={Colors.light.primary}
                                  />
                                ) : null
                              }
                            />
                          </View>
                        </View>
                      </Modal>

                      <Text style={styles.label}>
                        {t('settings.manageCrops.plantedAt')}
                      </Text>
                      <DateField
                        value={plantedAt}
                        onChange={setPlantedAt}
                        placeholder={t('settings.manageCrops.selectDate')}
                        maximumDate={expectedHarvestAt || undefined}
                        disabled={addingCrop || saving}
                      />

                      <Text style={styles.label}>
                        {t('settings.manageCrops.expectedHarvestAt')}
                      </Text>
                      <DateField
                        value={expectedHarvestAt}
                        onChange={setExpectedHarvestAt}
                        placeholder={t('settings.manageCrops.selectDate')}
                        minimumDate={plantedAt || undefined}
                        disabled={addingCrop || saving}
                      />

                      <Text style={styles.label}>
                        {t('settings.manageCrops.notes')}
                      </Text>
                      <TextInput
                        style={[styles.input, styles.cropNotesInput]}
                        value={cropNotes}
                        onChangeText={setCropNotes}
                        placeholder={t('settings.manageCrops.notesPlaceholder')}
                        multiline
                        editable={!addingCrop && !saving}
                      />

                      <Pressable
                        style={[
                          styles.button,
                          styles.acceptButton,
                          styles.cropSubmit,
                        ]}
                        onPress={() => void handleAddCrop()}
                        disabled={!selectedCropId || addingCrop || saving}
                      >
                        <Text style={styles.acceptText}>
                          {addingCrop
                            ? t('settings.manageCrops.adding')
                            : t('settings.manageCrops.saveCrop')}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.cropCancel}
                        onPress={() => setShowCropForm(false)}
                        disabled={addingCrop || saving}
                      >
                        <Text style={styles.cropCancelText}>
                          {t('settings.cancel')}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.addCropButton}
                      onPress={() => {
                        setErrorMessage('');
                        setShowCropForm(true);
                      }}
                      disabled={
                        saving ||
                        addingCrop ||
                        loadingCrops ||
                        availableCrops.length === 0
                      }
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={20}
                        color={Colors.light.primary}
                      />
                      <Text style={styles.addCropText}>
                        {t('settings.manageCrops.addCrop')}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ) : null}
            {step === 4 ? (
              <View style={styles.card}>
                <FieldDevicesSection
                  devices={existingDevices}
                  addLabel={t('addDevice.button')}
                  disabled={saving}
                  onAdd={handleAddDevice}
                  onRemove={(deviceId) => {
                    void handleRemoveDevice(deviceId);
                  }}
                />

                <Pressable
                  accessibilityRole="button"
                  onPress={goBack}
                  disabled={saving}
                  style={styles.cropCancel}
                >
                  <Text style={styles.cancelText}>{t('settings.cancel')}</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </FieldFormSteps>
      {geometryPicker ? (
        <FieldBoundaryPicker
          initialPoint={point}
          initialBoundary={geometryPicker === 'redraw' ? [] : (boundary ?? [])}
          initialExcludedZones={
            geometryPicker === 'redraw' ? [] : excludedZones
          }
          unit={areaUnit}
          readOnly={geometryPicker === 'view'}
          onCancel={() => setGeometryPicker(null)}
          onConfirm={(points, zones) => {
            void applyGeometry(points, zones);
          }}
        />
      ) : null}
    </View>
  );
}
