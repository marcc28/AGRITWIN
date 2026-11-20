import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { DateField } from '@/components/DateField';
import { Colors } from '@/constants/theme';
import { getAuth } from '@/services/auth';
import {
  createFieldCrop,
  deleteFieldCrop,
  type FieldCrop,
} from '@/services/api_fieldCrops';
import { getCrops, type Crop } from '@/services/api_crops';
import { fieldCropsQuery } from '@/services/queries';
import { queryClient } from '@/services/queryClient';
import { parseId } from '@/utils/parseId';
import { styles } from '@/styles/edit-field.styles';

const CROP_PAGE_SIZE = 50;

export default function ManageFieldCropsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const fieldId = parseId(params.id);

  const [loading, setLoading] = useState(true);
  const [loadingCrops, setLoadingCrops] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingCrop, setAddingCrop] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [existingCrops, setExistingCrops] = useState<FieldCrop[]>([]);
  const [availableCrops, setAvailableCrops] = useState<Crop[]>([]);
  const [cropOffset, setCropOffset] = useState(0);
  const [hasMoreCrops, setHasMoreCrops] = useState(true);
  const cropPageLoading = useRef(false);
  const [cropSelectorOpen, setCropSelectorOpen] = useState(false);
  const [selectedCropId, setSelectedCropId] = useState('');
  const [selectedCropName, setSelectedCropName] = useState('');
  const [showCropForm, setShowCropForm] = useState(true);
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
    let active = true;
    async function load() {
      try {
        if (!Number.isFinite(fieldId)) {
          throw new Error(t('settings.errors.invalidId'));
        }
        const auth = await getAuth();
        if (!auth?.token)
          throw new Error('No s’ha trobat el token d’autenticació');
        const [fieldCrops, crops] = await Promise.all([
          queryClient.query({ ...fieldCropsQuery(fieldId), staleTime: 0 }),
          getCrops(0, CROP_PAGE_SIZE, auth.token),
        ]);
        if (!active) return;
        setExistingCrops(fieldCrops);
        setAvailableCrops(crops);
        setCropOffset(crops.length);
        setHasMoreCrops(crops.length === CROP_PAGE_SIZE);
      } catch (error) {
        if (active)
          setErrorMessage(
            error instanceof Error
              ? error.message
              : t('settings.errors.loadCrops'),
          );
      } finally {
        if (active) {
          setLoading(false);
          setLoadingCrops(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [fieldId, t]);

  async function loadNextCropPage() {
    if (cropPageLoading.current || loadingCrops || !hasMoreCrops) return;
    cropPageLoading.current = true;
    setLoadingCrops(true);
    try {
      const auth = await getAuth();
      if (!auth?.token) throw new Error('No s’ha trobat el token');
      const nextPage = await getCrops(cropOffset, CROP_PAGE_SIZE, auth.token);
      setAvailableCrops((current) => [...current, ...nextPage]);
      setCropOffset((offset) => offset + nextPage.length);
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

    const tempId = `temp-${Date.now()}`;
    const fieldName = existingCrops[0]?.field_name ?? '';
    const cropData = {
      field_id: fieldId,
      crop_id: Number(selectedCropId),
      field_name: fieldName, 
      planted_at: plantedAt || null,
      expected_harvest_at: expectedHarvestAt || null,
      status: 'planted',
      notes: cropNotes.trim() || null,
    };

    try {
      setAddingCrop(true);
      setErrorMessage('');

      const auth = await getAuth();
      if (!auth?.token) throw new Error('No s’ha trobat el token');

      // Optimistic update: mostrar el crop immediatament
      setExistingCrops((current) => [
        ...current,
        {
          id: tempId,
          ...cropData,
        },
      ]);

      // Create crop in backend
      const newCrop = await createFieldCrop(cropData, auth.token);

      // Replace temporary crop with the real backend response
      setExistingCrops((current) =>
        current.map((crop) => (String(crop.id) === tempId ? newCrop : crop)),
      );

      setSelectedCropId('');
      setSelectedCropName('');
      setPlantedAt('');
      setExpectedHarvestAt('');
      setCropNotes('');
      setShowCropForm(false);
    } catch (error) {
      // Rollback: remove the temporary crop
      setExistingCrops((current) =>
        current.filter((crop) => String(crop.id) !== tempId),
      );

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
    const previousCrops = existingCrops;

    try {
      setSaving(true);
      setErrorMessage('');

      const auth = await getAuth();
      if (!auth?.token) throw new Error('No s’ha trobat el token');

      setExistingCrops((current) =>
        current.filter((crop) => String(crop.id) !== String(cropId)),
      );

      await deleteFieldCrop(cropId, auth.token);
    } catch (error) {
      // Rollback: recuperar els crops anteriors
      setExistingCrops(previousCrops);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('settings.manageCrops.errors.removeFailed'),
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
          <Pressable
            style={styles.backRow}
            onPress={goBack}
            disabled={saving || addingCrop}
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
          <Text style={styles.title}>{t('settings.manageCrops.title')}</Text>
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <View style={styles.card}>
            {loading ? (
              <ActivityIndicator color={Colors.light.primary} />
            ) : (
              <View style={styles.cropSection}>
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
                        accessibilityRole="button"
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
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
