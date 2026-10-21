import { useEffect, useState } from 'react';
import {
  Text,
  View,
  Pressable,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
  GARDEN_PHOTOS,
  defaultPhotoIndex,
  gardenPhotoAt,
} from '../constants/gardenPhotos';
import { getField, isAuthError, updateField } from '../services/api';
import { clearAuth } from '../services/auth';
import { getCurrentField, setCurrentField } from '../services/currentField';
import { getFieldPhotoIndex, setFieldPhotoIndex } from '../services/fieldPhoto';
import { styles } from '../styles/edit-field.styles';
import { Colors } from '../constants/theme';
import { parseId } from '../utils/parseId';

const FIELD_TYPES = ['home_garden', 'open_field', 'greenhouse'] as const;
const SOIL_TYPES = ['loam', 'clay', 'sandy'] as const;

function Chip({
  label,
  selected,
  onPress,
  disabled,
}: Readonly<{
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
}>) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, selected ? styles.chipSelected : null]}
    >
      <Text
        style={[styles.chipText, selected ? styles.chipTextSelected : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function EditFieldScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const fieldId = parseId(params.id);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [fieldType, setFieldType] = useState<string>(FIELD_TYPES[0]);
  const [soilType, setSoilType] = useState<string>(SOIL_TYPES[0]);
  const [sizeM2, setSizeM2] = useState('');
  const [photoIndex, setPhotoIndex] = useState(defaultPhotoIndex(fieldId));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
        setSizeM2(field.size_m2 != null ? String(field.size_m2) : '');
        setPhotoIndex(await getFieldPhotoIndex(fieldId));
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

  async function handleAccept() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMessage(t('settings.errors.nameRequired'));
      return;
    }

    const parsedSize = sizeM2.trim() === '' ? null : Number(sizeM2);
    if (parsedSize != null && !Number.isFinite(parsedSize)) {
      setErrorMessage(t('settings.errors.sizeNumber'));
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
                <Image
                  source={gardenPhotoAt(photoIndex)}
                  style={styles.photo}
                  resizeMode="cover"
                />
                <View style={styles.photoRow}>
                  {GARDEN_PHOTOS.map((_, index) => (
                    <Pressable
                      key={index}
                      onPress={() => setPhotoIndex(index)}
                      disabled={saving}
                      style={[
                        styles.photoThumbWrap,
                        photoIndex === index ? styles.photoThumbSelected : null,
                      ]}
                    >
                      <Image
                        source={gardenPhotoAt(index)}
                        style={styles.photoThumb}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ))}
                </View>

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

                <Text style={styles.label}>{t('settings.type')}</Text>
                <View style={styles.chipRow}>
                  {FIELD_TYPES.map((type) => (
                    <Chip
                      key={type}
                      label={t(`settings.fieldTypes.${type}`)}
                      selected={fieldType === type}
                      onPress={() => setFieldType(type)}
                      disabled={saving}
                    />
                  ))}
                </View>

                <Text style={styles.label}>{t('settings.soil')}</Text>
                <View style={styles.chipRow}>
                  {SOIL_TYPES.map((type) => (
                    <Chip
                      key={type}
                      label={t(`settings.soilTypes.${type}`)}
                      selected={soilType === type}
                      onPress={() => setSoilType(type)}
                      disabled={saving}
                    />
                  ))}
                </View>

                <Text style={styles.label}>{t('settings.size')}</Text>
                <TextInput
                  style={styles.input}
                  value={sizeM2}
                  onChangeText={setSizeM2}
                  keyboardType="numeric"
                  editable={!saving}
                />
              </>
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
                disabled={saving || loading}
              >
                <Text style={styles.acceptText}>
                  {saving ? t('settings.saving') : t('settings.accept')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
