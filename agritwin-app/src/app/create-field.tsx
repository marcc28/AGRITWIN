import { useState } from 'react';
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
import { FIELD_TYPES, SOIL_TYPES } from '../constants/fieldOptions';
import {
  createDevice,
  createField,
  geocodeLocation,
  isAuthError,
} from '../services/api';
import {
  DeviceDraftFields,
  emptyDeviceDraft,
  filledDevices,
  hasIncompleteDevices,
  type DeviceDraft,
} from '../components/DeviceDraftFields';
import { clearAuth } from '../services/auth';
import { setCurrentField } from '../services/currentField';
import { setFieldPhotoIndex } from '../services/fieldPhoto';
import { OptionChip } from '../components/OptionChip';
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

export default function CreateFieldScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ from?: string | string[] }>();
  const fromProfile =
    (Array.isArray(params.from) ? params.from[0] : params.from) === 'profile';

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [fieldType, setFieldType] = useState<string>(FIELD_TYPES[0]);
  const [soilType, setSoilType] = useState<string>(SOIL_TYPES[0]);
  const [sizeM2, setSizeM2] = useState('');
  const [photoIndex, setPhotoIndex] = useState(defaultPhotoIndex(0));
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [geoLabel, setGeoLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [later, setLater] = useState(true);
  const [deviceDrafts, setDeviceDrafts] = useState<DeviceDraft[]>([]);

  function goBack() {
    router.replace('/app/settings');
  }

  async function handleLogout() {
    await clearAuth();
    router.replace('/auth/login');
  }

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
      setLat(found.lat);
      setLon(found.lon);
      setGeoLabel(found.label ?? query);
    } catch (error) {
      if (isAuthError(error)) {
        await clearAuth();
        router.replace('/auth/login');
        return;
      }
      setLat(null);
      setLon(null);
      setGeoLabel('');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('settings.createField.errors.locationNotFound'),
      );
    } finally {
      setLocating(false);
    }
  }

  async function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage(t('settings.errors.nameRequired'));
      return;
    }

    const parsedSize = sizeM2.trim() === '' ? null : Number(sizeM2);
    if (
      parsedSize != null &&
      (!Number.isFinite(parsedSize) || parsedSize <= 0)
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
      });
      await setFieldPhotoIndex(created.id, photoIndex);
      await setCurrentField({ id: created.id, name: created.name });
      for (const device of devices) {
        await createDevice(created.id, device);
      }
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
              onPress={goBack}
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

          <Image
            source={gardenPhotoAt(photoIndex)}
            style={styles.hero}
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
                  setLat(null);
                  setLon(null);
                  setGeoLabel('');
                }}
                editable={!saving}
                placeholder={t('settings.createField.locationPlaceholder')}
                placeholderTextColor={Colors.light.textMuted}
              />
              <Pressable
                style={styles.locateButton}
                onPress={() => void handleLocate()}
                disabled={saving || locating}
              >
                <Ionicons
                  name="locate-outline"
                  size={18}
                  color={Colors.light.surface}
                />
              </Pressable>
            </View>
            {lat != null && lon != null ? (
              <Text style={styles.coords}>
                {t('settings.createField.coords', {
                  lat: lat.toFixed(4),
                  lon: lon.toFixed(4),
                })}
                {geoLabel ? `\n${geoLabel}` : ''}
              </Text>
            ) : (
              <Text style={styles.coordsHint}>
                {t('settings.createField.coordsHint')}
              </Text>
            )}

            <Text style={styles.label}>{t('settings.type')}</Text>
            <View style={styles.chipRow}>
              {FIELD_TYPES.map((type) => (
                <OptionChip
                  key={type}
                  label={t(`settings.fieldTypes.${type}`)}
                  selected={fieldType === type}
                  onPress={() => setFieldType(type)}
                  disabled={saving}
                  style={styles.chip}
                  selectedStyle={styles.chipSelected}
                  textStyle={styles.chipText}
                  selectedTextStyle={styles.chipTextSelected}
                />
              ))}
            </View>

            <Text style={styles.label}>{t('settings.soil')}</Text>
            <View style={styles.chipRow}>
              {SOIL_TYPES.map((type) => (
                <OptionChip
                  key={type}
                  label={t(`settings.soilTypes.${type}`)}
                  selected={soilType === type}
                  onPress={() => setSoilType(type)}
                  disabled={saving}
                  style={styles.chip}
                  selectedStyle={styles.chipSelected}
                  textStyle={styles.chipText}
                  selectedTextStyle={styles.chipTextSelected}
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
              placeholder={t('settings.createField.sizePlaceholder')}
              placeholderTextColor={Colors.light.textMuted}
            />
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
            disabled={saving}
          >
            <Text style={styles.primaryText}>
              {createSubmitLabel(saving, fromProfile, t)}
            </Text>
          </Pressable>

          {fromProfile ? null : (
            <Pressable onPress={() => void handleLogout()} disabled={saving}>
              <Text style={styles.logoutLink}>{t('settings.logout')}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
