import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { FieldCropForm } from '@/components/FieldCropForm';
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
import { getEditCropsStyles } from '@/styles/edit-crops.styles';
import {
  createFieldCropDraft,
  validateFieldCropDates,
} from '@/utils/fieldCropDraft';

const CROP_PAGE_SIZE = 50;

export default function ManageFieldCropsScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const styles = getEditCropsStyles(width, height);
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
      pathname: '/crop-detail',
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
    const dateError = validateFieldCropDates(plantedAt, expectedHarvestAt);
    if (dateError) {
      setErrorMessage(t(`settings.manageCrops.errors.${dateError}`));
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const cropData = createFieldCropDraft(fieldId, {
      cropId: selectedCropId,
      plantedAt,
      expectedHarvestAt,
      notes: cropNotes,
    });

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
          crop_name: selectedCropName,
          field_name: current[0]?.field_name ?? '',
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
      router.replace({
        pathname: '/crop-detail',
        params: { id: String(fieldId) },
      });
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
              {t('settings.manageCrops.back')}
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

                <FieldCropForm
                  styles={styles}
                  availableCrops={availableCrops}
                  existingCrops={existingCrops}
                  loadingCrops={loadingCrops}
                  saving={saving}
                  addingCrop={addingCrop}
                  showCropForm={showCropForm}
                  setShowCropForm={setShowCropForm}
                  cropSelectorOpen={cropSelectorOpen}
                  setCropSelectorOpen={setCropSelectorOpen}
                  selectedCropId={selectedCropId}
                  setSelectedCropId={setSelectedCropId}
                  selectedCropName={selectedCropName}
                  setSelectedCropName={setSelectedCropName}
                  plantedAt={plantedAt}
                  setPlantedAt={setPlantedAt}
                  expectedHarvestAt={expectedHarvestAt}
                  setExpectedHarvestAt={setExpectedHarvestAt}
                  cropNotes={cropNotes}
                  setCropNotes={setCropNotes}
                  onLoadMore={() => void loadNextCropPage()}
                  onAdd={() => void handleAddCrop()}
                  onShowCropForm={() => {
                    setErrorMessage('');
                    setShowCropForm(true);
                  }}
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
