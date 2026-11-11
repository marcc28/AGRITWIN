import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { PlantIllustration } from '@/components/PlantIllustration';
import { Colors } from '@/constants/theme';
import { isAuthError } from '@/services/api';
import { clearAuth } from '@/services/auth';
import {
  diagnosePlant,
  DiagnosisError,
  type DiagnosisPhoto,
  type PlantDiagnosis,
} from '@/services/api_diagnosis';
import { choosePhoto, type PickedPhoto } from '@/services/photoPicker';
import { styles } from '@/styles/diagnosis.styles';

const ERROR_KEYS: Record<number, string> = {
  404: 'diagnosis.errors.notFound',
  413: 'diagnosis.errors.tooLarge',
  415: 'diagnosis.errors.format',
  422: 'diagnosis.errors.noPlant',
  429: 'diagnosis.errors.tooMany',
};

function errorKey(error: unknown): string {
  if (error instanceof DiagnosisError) {
    return ERROR_KEYS[error.status] ?? 'diagnosis.errors.unavailable';
  }
  return 'diagnosis.errors.connection';
}

type StatusItemProps = Readonly<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  warning: boolean;
}>;

function StatusItem({ icon, label, value, warning }: StatusItemProps) {
  return (
    <View style={styles.statusItem}>
      <Ionicons name={icon} size={20} color={Colors.light.primaryDark} />
      <Text style={styles.statusLabel}>{label}</Text>
      <Text
        style={[styles.statusValue, warning ? styles.statusValueWarning : null]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function DiagnosisScreen() {
  const { t, i18n } = useTranslation();

  const [photo, setPhoto] = useState<DiagnosisPhoto | null>(null);
  const [result, setResult] = useState<PlantDiagnosis | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);

  const applyPhoto = useCallback(
    (picked: PickedPhoto, fromCamera: boolean) => {
      const kind = fromCamera ? 'camera' : 'photos';
      setPermissionBlocked(picked === 'blocked');
      if (picked === 'denied' || picked === 'blocked') {
        const state = picked === 'denied' ? 'Denied' : 'Blocked';
        setErrorMessage(t(`diagnosis.errors.${kind}${state}`));
      } else if (picked) {
        setPhoto(picked);
        setImageFailed(false);
        setResult(null);
        setErrorMessage('');
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      if (photo || Platform.OS === 'web') {
        return;
      }
      let active = true;
      void choosePhoto(false).then((picked) => {
        if (active) {
          applyPhoto(picked, false);
        }
      });
      return () => {
        active = false;
      };
    }, [photo, applyPhoto]),
  );

  async function pickPhoto(fromCamera: boolean) {
    applyPhoto(await choosePhoto(fromCamera), fromCamera);
  }

  async function analyse() {
    if (!photo) {
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setPermissionBlocked(false);
    setResult(null);

    try {
      const lang = i18n.language.slice(0, 2);
      setResult(await diagnosePlant(photo, lang));
    } catch (error) {
      if (isAuthError(error)) {
        await clearAuth();
        router.replace('/auth/login');
        return;
      }
      setErrorMessage(t(errorKey(error)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          <Text style={styles.title}>{t('diagnosis.title')}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {t('diagnosis.subtitle')}
          </Text>

          {result && photo ? (
            <View style={[styles.card, styles.compactCard]}>
              <Pressable
                testID="diagnosis-open-photo"
                accessibilityRole="imagebutton"
                accessibilityLabel={t('diagnosis.enlarge')}
                onPress={() => setViewerOpen(true)}
              >
                <Image
                  testID="diagnosis-preview"
                  source={{ uri: photo.uri }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              </Pressable>
              <View style={styles.compactButtons}>
                <Pressable
                  style={[styles.secondaryButton, styles.compactButton]}
                  onPress={() => void pickPhoto(true)}
                >
                  <Ionicons
                    name="camera-outline"
                    size={18}
                    color={Colors.light.primaryDark}
                  />
                  <Text style={styles.secondaryButtonText}>
                    {t('diagnosis.takePhoto')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryButton, styles.compactButton]}
                  onPress={() => void pickPhoto(false)}
                >
                  <Ionicons
                    name="images-outline"
                    size={18}
                    color={Colors.light.primaryDark}
                  />
                  <Text style={styles.secondaryButtonText}>
                    {t('diagnosis.choosePhoto')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              {photo && !imageFailed ? (
                <Pressable
                  testID="diagnosis-open-photo"
                  accessibilityRole="imagebutton"
                  accessibilityLabel={t('diagnosis.enlarge')}
                  onPress={() => setViewerOpen(true)}
                >
                  <Image
                    testID="diagnosis-preview"
                    source={{ uri: photo.uri }}
                    style={[
                      styles.preview,
                      loading ? styles.previewSmall : null,
                    ]}
                    resizeMode="cover"
                    onError={() => setImageFailed(true)}
                  />
                </Pressable>
              ) : (
                <View style={styles.placeholder}>
                  <PlantIllustration />
                  <Text style={styles.placeholderText}>
                    {imageFailed
                      ? t('diagnosis.previewError')
                      : t('diagnosis.placeholder')}
                  </Text>
                </View>
              )}

              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => void pickPhoto(true)}
                  disabled={loading}
                >
                  <Ionicons
                    name="camera-outline"
                    size={18}
                    color={Colors.light.primaryDark}
                  />
                  <Text style={styles.secondaryButtonText}>
                    {t('diagnosis.takePhoto')}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => void pickPhoto(false)}
                  disabled={loading}
                >
                  <Ionicons
                    name="images-outline"
                    size={18}
                    color={Colors.light.primaryDark}
                  />
                  <Text style={styles.secondaryButtonText}>
                    {t('diagnosis.choosePhoto')}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                style={[
                  styles.primaryButton,
                  !photo || loading ? styles.primaryButtonDisabled : null,
                ]}
                onPress={() => void analyse()}
                disabled={!photo || loading}
              >
                <Ionicons name="search-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  {errorMessage && photo
                    ? t('diagnosis.retry')
                    : t('diagnosis.analyse')}
                </Text>
              </Pressable>

              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={Colors.light.primary} />
                  <Text style={styles.loadingText}>
                    {t('diagnosis.loading')}
                  </Text>
                </View>
              ) : null}

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color={Colors.light.dangerText}
                  />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {permissionBlocked && Platform.OS !== 'web' ? (
                <Pressable
                  testID="diagnosis-open-settings"
                  style={styles.settingsButton}
                  onPress={() => void Linking.openSettings()}
                >
                  <Ionicons
                    name="settings-outline"
                    size={18}
                    color={Colors.light.primaryDark}
                  />
                  <Text style={styles.secondaryButtonText}>
                    {t('diagnosis.openSettings')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {result ? (
            <>
              <View style={styles.card}>
                <View style={styles.resultHeader}>
                  <Ionicons
                    name={result.healthy ? 'leaf' : 'bug-outline'}
                    size={24}
                    color={
                      result.healthy
                        ? Colors.light.primary
                        : Colors.light.dangerText
                    }
                  />
                  <Text style={styles.resultName}>{result.name}</Text>
                </View>

                {result.healthy == null ? null : (
                  <View
                    style={[
                      styles.badge,
                      result.healthy
                        ? styles.badgeHealthy
                        : styles.badgeProblem,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        result.healthy
                          ? styles.badgeTextHealthy
                          : styles.badgeTextProblem,
                      ]}
                    >
                      {result.healthy
                        ? t('diagnosis.healthy')
                        : t('diagnosis.problem')}
                    </Text>
                  </View>
                )}

                {result.confidence == null ? null : (
                  <Text style={styles.confidence}>
                    {t('diagnosis.confidence', {
                      value: Math.round(result.confidence * 100),
                    })}
                  </Text>
                )}

                {result.advice ? (
                  <Text style={styles.advice}>{result.advice}</Text>
                ) : null}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t('diagnosis.statusTitle')}
                </Text>
                <View style={styles.statusRow}>
                  <StatusItem
                    icon="water-outline"
                    label={t('diagnosis.waterLabel')}
                    value={t(`diagnosis.water.${result.water}`)}
                    warning={
                      result.water === 'lack' || result.water === 'excess'
                    }
                  />
                  <StatusItem
                    icon="sunny-outline"
                    label={t('diagnosis.lightLabel')}
                    value={t(`diagnosis.light.${result.light}`)}
                    warning={
                      result.light === 'lack' || result.light === 'excess'
                    }
                  />
                  <StatusItem
                    icon="basket-outline"
                    label={t('diagnosis.harvestLabel')}
                    value={t(`diagnosis.harvest.${result.harvest}`)}
                    warning={false}
                  />
                </View>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={viewerOpen && photo != null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerOpen(false)}
      >
        <Pressable
          testID="diagnosis-viewer"
          style={styles.viewer}
          onPress={() => setViewerOpen(false)}
        >
          {photo ? (
            <Image
              source={{ uri: photo.uri }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
        <Pressable
          testID="diagnosis-viewer-close"
          accessibilityRole="button"
          accessibilityLabel={t('diagnosis.close')}
          style={styles.viewerClose}
          onPress={() => setViewerOpen(false)}
        >
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </Pressable>
      </Modal>
    </View>
  );
}
