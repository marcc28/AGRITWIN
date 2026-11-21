import type { Dispatch, SetStateAction } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { DateField } from '@/components/DateField';
import type { Crop } from '@/services/api_crops';
import type { FieldCrop } from '@/services/api_fieldCrops';
import { Colors } from '@/constants/theme';

type FormStyles = {
  cropForm: StyleProp<ViewStyle>;
  label: StyleProp<TextStyle>;
  cropPicker: StyleProp<ViewStyle>;
  cropPickerText: StyleProp<TextStyle>;
  cropPickerPlaceholder: StyleProp<TextStyle>;
  cropModalBackdrop: StyleProp<ViewStyle>;
  cropModal: StyleProp<ViewStyle>;
  cropModalHeader: StyleProp<ViewStyle>;
  cropModalTitle: StyleProp<TextStyle>;
  cropListLoader: StyleProp<ViewStyle>;
  cropEmpty: StyleProp<TextStyle>;
  cropOption: StyleProp<ViewStyle>;
  cropOptionText: StyleProp<TextStyle>;
  dateFieldsRow: StyleProp<ViewStyle>;
  dateField: StyleProp<ViewStyle>;
  input: StyleProp<TextStyle>;
  cropNotesInput: StyleProp<TextStyle>;
  button: StyleProp<ViewStyle>;
  acceptButton: StyleProp<ViewStyle>;
  cropSubmit: StyleProp<ViewStyle>;
  acceptText: StyleProp<TextStyle>;
  cropCancel: StyleProp<ViewStyle>;
  cropCancelText: StyleProp<TextStyle>;
  addCropButton: StyleProp<ViewStyle>;
  addCropText: StyleProp<TextStyle>;
};

type Props = {
  styles: FormStyles;
  availableCrops: Crop[];
  existingCrops: FieldCrop[];
  loadingCrops: boolean;
  saving: boolean;
  addingCrop: boolean;
  showCropForm: boolean;
  setShowCropForm: Dispatch<SetStateAction<boolean>>;
  cropSelectorOpen: boolean;
  setCropSelectorOpen: Dispatch<SetStateAction<boolean>>;
  selectedCropId: string;
  setSelectedCropId: Dispatch<SetStateAction<string>>;
  selectedCropName: string;
  setSelectedCropName: Dispatch<SetStateAction<string>>;
  plantedAt: string;
  setPlantedAt: Dispatch<SetStateAction<string>>;
  expectedHarvestAt: string;
  setExpectedHarvestAt: Dispatch<SetStateAction<string>>;
  cropNotes: string;
  setCropNotes: Dispatch<SetStateAction<string>>;
  onLoadMore: () => void;
  onAdd: () => void;
  onShowCropForm: () => void;
  cropPageKey?: number;
};

export function FieldCropForm({
  styles,
  availableCrops,
  existingCrops,
  loadingCrops,
  saving,
  addingCrop,
  showCropForm,
  setShowCropForm,
  cropSelectorOpen,
  setCropSelectorOpen,
  selectedCropId,
  setSelectedCropId,
  selectedCropName,
  setSelectedCropName,
  plantedAt,
  setPlantedAt,
  expectedHarvestAt,
  setExpectedHarvestAt,
  cropNotes,
  setCropNotes,
  onLoadMore,
  onAdd,
  onShowCropForm,
  cropPageKey,
}: Props) {
  const { t } = useTranslation();
  const availableOptions = availableCrops.filter(
    (crop) =>
      !existingCrops.some(
        (fieldCrop) => String(fieldCrop.crop_id) === String(crop.id),
      ),
  );

  if (!showCropForm) {
    return (
      <Pressable
        style={styles.addCropButton}
        onPress={onShowCropForm}
        disabled={
          saving || addingCrop || loadingCrops || availableOptions.length === 0
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
    );
  }

  return (
    <View style={styles.cropForm}>
      <Text style={styles.label}>{t('settings.manageCrops.cropType')}</Text>
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
          {selectedCropName || t('settings.manageCrops.selectCrop')}
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
              key={cropPageKey}
              data={availableOptions}
              keyExtractor={(crop) => String(crop.id)}
              onEndReached={onLoadMore}
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
                  <Text style={styles.cropOptionText}>{crop.name}</Text>
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

      <View style={styles.dateFieldsRow}>
        <View style={styles.dateField}>
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
        </View>
        <View style={styles.dateField}>
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
        </View>
      </View>

      <Text style={styles.label}>{t('settings.manageCrops.notes')}</Text>
      <TextInput
        style={[styles.input, styles.cropNotesInput]}
        value={cropNotes}
        onChangeText={setCropNotes}
        placeholder={t('settings.manageCrops.notesPlaceholder')}
        multiline
        editable={!addingCrop && !saving}
      />

      <Pressable
        style={[styles.button, styles.acceptButton, styles.cropSubmit]}
        onPress={onAdd}
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
        <Text style={styles.cropCancelText}>{t('settings.cancel')}</Text>
      </Pressable>
    </View>
  );
}
