import { useEffect, useState } from 'react';
import {
  Text,
  View,
  Pressable,
  Image,
  ScrollView,
  Switch,
  TextInput,
  type ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import {
  getMe,
  getFields,
  getDashboard,
  updateMe,
  updateMyEmail,
  updateMyPassword,
  type Me,
  type Field,
  type Dashboard,
} from '../../services/api';
import { clearAuth } from '../../services/auth';
import { SensorModal } from '../../components/SensorModal';
import { styles } from '../../styles/settings.styles';
import { Colors } from '../../constants/theme';

const GARDEN_PHOTOS: ImageSourcePropType[] = [
  require('@assets/images/garden-home.jpg'),
  require('@assets/images/garden-field.jpg'),
  require('@assets/images/garden-greenhouse.jpg'),
  require('@assets/images/garden-orchard.jpg'),
  require('@assets/images/garden-herbs.jpg'),
];

const LANGUAGES = [
  { value: 'ca', labelKey: 'languages.catalan' },
  { value: 'es', labelKey: 'languages.spanish' },
  { value: 'en', labelKey: 'languages.english' },
  { value: 'it', labelKey: 'languages.italian' },
] as const;

function gardenPhoto(index: number): ImageSourcePropType {
  return GARDEN_PHOTOS[index % GARDEN_PHOTOS.length];
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
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

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const [me, setMe] = useState<Me | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dataMessage, setDataMessage] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConf, setNewPasswordConf] = useState('');

  useEffect(() => {
    async function loadMe() {
      try {
        const data = await getMe();
        setMe(data);
        if (data.language && data.language !== i18n.language) {
          await i18n.changeLanguage(data.language);
        }
        const gardenList = await getFields();
        setFields(gardenList);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'No s’ha pogut carregar el perfil';
        setErrorMessage(message);
      }
    }

    void loadMe();
    // Load once when opening the profile screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function savePrefs(next: Me) {
    setMe(next);
    try {
      setSaving(true);
      setErrorMessage('');
      const saved = await updateMe({
        language: next.language,
        notifications_enabled: next.notifications_enabled,
        weather_alerts_enabled: next.weather_alerts_enabled,
      });
      setMe(saved);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No s’ha pogut guardar el perfil';
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  const handleLanguageChange = async (value: string) => {
    if (!me || value === me.language) {
      return;
    }

    await i18n.changeLanguage(value);
    await savePrefs({ ...me, language: value });
  };

  const handleLogout = async () => {
    await clearAuth();
    router.replace('/auth/login');
  };

  function openEmailEdit() {
    setEditingPassword(false);
    setEmailDraft(me?.email ?? '');
    setEditingEmail(true);
    setErrorMessage('');
  }

  function openPasswordEdit() {
    setEditingEmail(false);
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConf('');
    setEditingPassword(true);
    setErrorMessage('');
  }

  async function handleSaveEmail() {
    const next = emailDraft.trim().toLowerCase();
    if (!next.includes('@') || !next.includes('.')) {
      setErrorMessage('Introdueix un correu vàlid');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      const saved = await updateMyEmail(next);
      setMe(saved);
      setEditingEmail(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No s’ha pogut canviar el correu';
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePassword() {
    if (newPassword.length < 8) {
      setErrorMessage('La contrasenya ha de tenir almenys 8 caràcters');
      return;
    }
    if (newPassword !== newPasswordConf) {
      setErrorMessage('Les contrasenyes no coincideixen');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      await updateMyPassword(currentPassword, newPassword, newPasswordConf);
      setEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConf('');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No s’ha pogut canviar la contrasenya';
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDatos(fieldId: number) {
    try {
      setDataMessage('');
      const data = await getDashboard(fieldId);
      setDashboard(data);

      if (!data.latest) {
        setDataMessage(
          data.device_ids.length === 0
            ? 'Aquest camp encara no té cap dispositiu.'
            : 'Encara no hi ha cap lectura.',
        );
        setModalVisible(false);
        return;
      }

      setModalVisible(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No s’han pogut carregar les dades';
      setDataMessage(message);
      setModalVisible(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <View style={styles.container}>
          <Text style={styles.date}>USER PROFILE</Text>
          <Text style={styles.title}>{t('settings.title')}</Text>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <View style={styles.profileCard}>
            <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>

            {editingEmail ? (
              <View style={styles.languageBlock}>
                <Text style={styles.editLabel}>Email</Text>
                <TextInput
                  style={styles.accountInput}
                  value={emailDraft}
                  onChangeText={setEmailDraft}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!saving}
                />
                <View style={styles.accountButtons}>
                  <Pressable
                    style={[styles.accountButton, styles.accountCancel]}
                    onPress={() => setEditingEmail(false)}
                    disabled={saving}
                  >
                    <Text style={styles.accountCancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.accountButton, styles.accountAccept]}
                    onPress={() => void handleSaveEmail()}
                    disabled={saving}
                  >
                    <Text style={styles.accountAcceptText}>Acceptar</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.editRow} onPress={openEmailEdit}>
                <View style={styles.editText}>
                  <Text style={styles.editLabel}>Email</Text>
                  <Text style={styles.editValue}>{me?.email ?? '…'}</Text>
                </View>
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={Colors.light.primary}
                />
              </Pressable>
            )}

            {editingPassword ? (
              <View style={styles.languageBlock}>
                <Text style={styles.editLabel}>Password</Text>
                <TextInput
                  style={styles.accountInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Contrasenya actual"
                  placeholderTextColor={Colors.light.textMuted}
                  secureTextEntry
                  editable={!saving}
                />
                <TextInput
                  style={styles.accountInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Contrasenya nova"
                  placeholderTextColor={Colors.light.textMuted}
                  secureTextEntry
                  editable={!saving}
                />
                <TextInput
                  style={styles.accountInput}
                  value={newPasswordConf}
                  onChangeText={setNewPasswordConf}
                  placeholder="Confirma la contrasenya"
                  placeholderTextColor={Colors.light.textMuted}
                  secureTextEntry
                  editable={!saving}
                />
                <View style={styles.accountButtons}>
                  <Pressable
                    style={[styles.accountButton, styles.accountCancel]}
                    onPress={() => setEditingPassword(false)}
                    disabled={saving}
                  >
                    <Text style={styles.accountCancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.accountButton, styles.accountAccept]}
                    onPress={() => void handleSavePassword()}
                    disabled={saving}
                  >
                    <Text style={styles.accountAcceptText}>Acceptar</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.editRow} onPress={openPasswordEdit}>
                <View style={styles.editText}>
                  <Text style={styles.editLabel}>Password</Text>
                  <Text style={styles.editValue}>Change password</Text>
                </View>
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={Colors.light.primary}
                />
              </Pressable>
            )}

            <View style={styles.languageBlock}>
              <Text style={styles.languageLabel}>{t('settings.language')}</Text>
              <View style={styles.chipRow}>
                {LANGUAGES.map((language) => (
                  <Chip
                    key={language.value}
                    label={t(language.labelKey)}
                    selected={(me?.language ?? i18n.language).startsWith(
                      language.value,
                    )}
                    onPress={() => void handleLanguageChange(language.value)}
                  />
                ))}
              </View>
            </View>

            <Text style={styles.preferencesTitle}>
              {t('settings.preferences')}
            </Text>

            <View style={styles.editRow}>
              <Text style={styles.editValue}>
                {t('settings.notifications')}
              </Text>
              <Switch
                value={me?.notifications_enabled ?? true}
                onValueChange={(value) =>
                  me
                    ? void savePrefs({ ...me, notifications_enabled: value })
                    : undefined
                }
                disabled={!me || saving}
                trackColor={{
                  false: Colors.light.border,
                  true: Colors.light.primary,
                }}
              />
            </View>

            <View style={styles.editRow}>
              <Text style={styles.editValue}>
                {t('settings.weatherAlerts')}
              </Text>
              <Switch
                value={me?.weather_alerts_enabled ?? true}
                onValueChange={(value) =>
                  me
                    ? void savePrefs({
                        ...me,
                        weather_alerts_enabled: value,
                      })
                    : undefined
                }
                disabled={!me || saving}
                trackColor={{
                  false: Colors.light.border,
                  true: Colors.light.primary,
                }}
              />
            </View>
          </View>

          <Text style={styles.gardenTitle}>My gardens</Text>

          {dataMessage ? (
            <Text style={styles.errorText}>{dataMessage}</Text>
          ) : null}

          {fields.length === 0 ? (
            <Text style={styles.emptyGardens}>Encara no tens cap jardí.</Text>
          ) : (
            <View style={styles.gardenGrid}>
              {fields.map((field, index) => (
                <View key={field.id} style={styles.gardenCard}>
                  <Image
                    source={gardenPhoto(index)}
                    style={styles.gardenPhoto}
                    resizeMode="cover"
                  />
                  <View style={styles.gardenBody}>
                    <Text style={styles.gardenName} numberOfLines={1}>
                      {field.name}
                    </Text>
                    <Text style={styles.gardenMeta} numberOfLines={1}>
                      {field.location ?? '—'}
                    </Text>
                    <Text style={styles.gardenMeta}>
                      {field.device_count} Arduino
                      {field.device_count === 1 ? '' : 's'}
                    </Text>
                    <View style={styles.gardenActions}>
                      <Pressable onPress={() => void handleDatos(field.id)}>
                        <Text style={styles.gardenEdit}>Datos</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: '/edit-field',
                            params: { id: String(field.id) },
                          })
                        }
                      >
                        <Text style={styles.gardenEdit}>Edit</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {dashboard && dashboard.latest ? (
            <SensorModal
              visible={modalVisible}
              dashboard={dashboard}
              latest={dashboard.latest}
              onClose={() => setModalVisible(false)}
            />
          ) : null}

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Image
              source={require('@assets/images/logout.png')}
              style={styles.logoutIcon}
            />
            <Text style={styles.logoutText}>{t('settings.logout')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
