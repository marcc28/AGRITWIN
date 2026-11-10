import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  View,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { defaultPhotoIndex } from '../constants/gardenPhotos';
import {
  createDevice,
  deleteDevice,
  getField,
  isAuthError,
  updateDevice,
  updateField,
  reverseGeocodeLocation,
  type FieldDevice,
} from '../services/api';
import {
  DeviceDraftFields,
  filledDevices,
  hasIncompleteDevices,
  type DeviceDraft,
} from '../components/DeviceDraftFields';
import { clearAuth, getAuth } from '../services/auth';
import { getCurrentField, setCurrentField } from '../services/currentField';
import { getFieldPhotoIndex, setFieldPhotoIndex } from '../services/fieldPhoto';
import { styles } from '../styles/edit-field.styles';
import { Colors } from '../constants/theme';
import { parseId } from '../utils/parseId';
import { FIELD_TYPES, SOIL_TYPES } from '../constants/fieldOptions';
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
import { styles as areaStyles } from '../styles/create-field.styles';
import { DateField } from '../components/DateField';

import {
  createFieldCrop,
  getFieldCrops,
  deleteFieldCrop,
  type FieldCrop,
} from '../services/api_fieldCrops';

import { getCrops, type Crop } from '../services/api_crops';

const CROP_PAGE_SIZE = 50;

export default function EditFieldScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    id: string | string[];
    addCrop?: string | string[];
  }>();
  const fieldId = parseId(params.id);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [fieldType, setFieldType] = useState<string>(FIELD_TYPES[0]);
  const [soilType, setSoilType] = useState<string>(SOIL_TYPES[0]);
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
  const [existingDevices, setExistingDevices] = useState<FieldDevice[]>([]);
  const [deviceDrafts, setDeviceDrafts] = useState<DeviceDraft[]>([]);

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
  const [showCropForm, setShowCropForm] = useState(params.addCrop === 'true');
  const [plantedAt, setPlantedAt] = useState('');
  const [expectedHarvestAt, setExpectedHarvestAt] = useState('');
  const [cropNotes, setCropNotes] = useState('');

  function goBack() {
    router.replace({
      pathname: '/field-detail',
      params: { id: String(fieldId) },
    });
  }
  useEffect(() => {
    async function loadField() {
      try {
        const field = await getField(fieldId);

        setName(field.name);
        setLocation(field.location ?? '');
        setFieldType(field.field_type ?? FIELD_TYPES[0]);
        setSoilType(field.soil_type ?? SOIL_TYPES[0]);
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
        setExistingDevices(field.devices);
        setPhotoIndex(await getFieldPhotoIndex(fieldId));
        const auth = await getAuth();

        if (!auth?.token) {
          throw new Error('No s’ha trobat el token d’autenticació');
        }

        const [fieldCrops, crops] = await Promise.all([
          getFieldCrops(0, 100, auth.token, {
            field_id: fieldId,
          }),
          getCrops(0, CROP_PAGE_SIZE, auth.token),
        ]);

        setExistingCrops(fieldCrops);
        setAvailableCrops(crops);
        setCropOffset(crops.length);
        setHasMoreCrops(crops.length === CROP_PAGE_SIZE);
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
      } finally {
        setLoadingCrops(false);
        setLoading(false);
      }
    }

    if (!Number.isFinite(fieldId)) {
      setErrorMessage(t('settings.errors.invalidId'));
      setLoading(false);
      return;
    }

    void loadField();
  }, [fieldId, t]);

  async function loadNextCropPage() {
    if (cropPageLoading.current || loadingCrops || !hasMoreCrops) return;

    cropPageLoading.current = true;
    setLoadingCrops(true);
    try {
      const auth = await getAuth();
      if (!auth?.token) throw new Error('No s’ha trobat el token');

      const nextPage = await getCrops(cropOffset, CROP_PAGE_SIZE, auth.token);
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
    setLocating(true);
    setLocation('');
    setErrorMessage('');
    try {
      const found = await reverseGeocodeLocation(
        geometry.center.lat,
        geometry.center.lon,
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

    const devices = filledDevices(deviceDrafts);
    if (hasIncompleteDevices(deviceDrafts, existingDevices)) {
      setErrorMessage(t('settings.createField.errors.deviceIdRequired'));
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      await updateField(fieldId, {
        name: trimmedName,
        location: location.trim() || null,
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
      await Promise.all(
        existingDevices.map((device) =>
          updateDevice(fieldId, device.id, {
            brand: (device.brand ?? '').trim(),
            serial_number: (device.serial_number ?? '').trim(),
          }),
        ),
      );
      await Promise.all(devices.map((device) => createDevice(fieldId, device)));
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

      setExistingCrops((current) => [...current, newCrop]);
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Pressable style={styles.backRow} onPress={goBack} disabled={saving}>
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

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <View style={styles.card}>
            {loading ? (
              <Text style={styles.label}>{t('settings.loading')}</Text>
            ) : (
              <>
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
                  onChangeText={setName}
                  editable={!saving}
                />

                <Text style={styles.label}>{t('settings.location')}</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  editable={!saving}
                />

                <FieldOptionChips
                  fieldType={fieldType}
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
                {point ? (
                  <Text style={areaStyles.coords}>
                    {t('settings.createField.coords', {
                      lat: point.lat.toFixed(6),
                      lon: point.lon.toFixed(6),
                    })}
                  </Text>
                ) : null}

                <Text style={styles.label}>
                  {t('settings.createField.arduinos')}
                </Text>
                <DeviceDraftFields
                  mode="manage"
                  later={false}
                  onLaterChange={() => undefined}
                  drafts={deviceDrafts}
                  onChange={setDeviceDrafts}
                  existing={existingDevices}
                  onExistingChange={setExistingDevices}
                  onRemoveExisting={(deviceId) => {
                    void handleRemoveDevice(deviceId);
                  }}
                  disabled={saving}
                />
              </>
            )}
            {!loading && (
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
                            crop: crop?.name ?? t('settings.fieldDetail.crops'),
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
            )}

            <View style={styles.buttons}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={goBack}
                disabled={saving}
              >
                <Text style={styles.cancelText}>{t('settings.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.acceptButton]}
                onPress={() => void handleAccept()}
                disabled={saving || loading || locating}
              >
                <Text style={styles.acceptText}>
                  {saving ? t('settings.saving') : t('settings.accept')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
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
