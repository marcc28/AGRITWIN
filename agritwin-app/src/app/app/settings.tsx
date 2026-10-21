import { useEffect, useState } from 'react';
import {
  Text,
  View,
  Pressable,
  Image,
  ScrollView,
  Switch,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import {
  getMe,
  getFields,
  isAuthError,
  updateMe,
  updateMyEmail,
  type Me,
  type Field,
} from '../../services/api';
import { clearAuth } from '../../services/auth';
import {
  getCurrentField,
  setCurrentField,
  subscribeCurrentField,
} from '../../services/currentField';
import { FieldPhoto } from '../../components/FieldPhoto';
import { styles } from '../../styles/settings.styles';
import { Colors } from '../../constants/theme';

const LANGUAGES = [
  { value: 'ca', labelKey: 'languages.catalan' },
  { value: 'es', labelKey: 'languages.spanish' },
  { value: 'en', labelKey: 'languages.english' },
  { value: 'it', labelKey: 'languages.italian' },
] as const;

function openField(fieldId: number) {
  router.push({
    pathname: '/field-detail',
    params: { id: String(fieldId) },
  });
}

function Chip({
  label,
  selected,
  onPress,
}: Readonly<{
  label: string;
  selected: boolean;
  onPress: () => void;
}>) {
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
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [currentFieldId, setCurrentFieldId] = useState<number | null>(null);

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
        const stored = await getCurrentField();
        const storedStillMine = gardenList.some(
          (field) => field.id === stored?.id,
        );
        let nextCurrent = storedStillMine ? stored : null;
        if (!nextCurrent && gardenList[0]) {
          nextCurrent = {
            id: gardenList[0].id,
            name: gardenList[0].name,
          };
        }
        if (nextCurrent) {
          setCurrentFieldId(nextCurrent.id);
          if (
            stored?.id !== nextCurrent.id ||
            stored?.name !== nextCurrent.name
          ) {
            await setCurrentField(nextCurrent);
          }
        } else {
          setCurrentFieldId(null);
        }
      } catch (error) {
        if (isAuthError(error)) {
          await clearAuth();
          router.replace('/auth/login');
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : t('settings.errors.loadProfile');
        setErrorMessage(message);
      }
    }

    void loadMe();
    return subscribeCurrentField(() => {
      void getCurrentField().then((stored) => {
        setCurrentFieldId(stored?.id ?? null);
      });
    });
    // Load once when opening the profile screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function savePrefs(next: Me) {
    setMe(next);
    try {
      setSaving(true);
      setErrorMessage('');
      const saved = await updateMe({
        name: next.name,
        language: next.language,
        notifications_enabled: next.notifications_enabled,
        weather_alerts_enabled: next.weather_alerts_enabled,
      });
      setMe(saved);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('settings.errors.saveProfile');
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

  function openNameEdit() {
    setEditingEmail(false);
    setNameDraft(me?.name ?? '');
    setEditingName(true);
    setErrorMessage('');
  }

  function openEmailEdit() {
    setEditingName(false);
    setEmailDraft(me?.email ?? '');
    setEditingEmail(true);
    setErrorMessage('');
  }

  async function handleSaveName() {
    const next = nameDraft.trim();
    if (!next) {
      setErrorMessage(t('settings.errors.nameRequired'));
      return;
    }
    if (!me) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      const saved = await updateMe({
        name: next,
        language: me.language,
        notifications_enabled: me.notifications_enabled,
        weather_alerts_enabled: me.weather_alerts_enabled,
      });
      setMe(saved);
      setEditingName(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('settings.errors.saveProfile');
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEmail() {
    const next = emailDraft.trim().toLowerCase();
    if (!next.includes('@') || !next.includes('.')) {
      setErrorMessage(t('settings.errors.invalidEmail'));
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
          : t('settings.errors.changeEmail');
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSetCurrent(field: Field) {
    await setCurrentField({ id: field.id, name: field.name });
    setCurrentFieldId(field.id);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <View style={styles.container}>
          <Text style={styles.date}>{t('settings.eyebrow')}</Text>
          <Text style={styles.title}>{t('settings.title')}</Text>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <View style={styles.profileCard}>
            <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>

            {editingName ? (
              <View style={styles.languageBlock}>
                <Text style={styles.editLabel}>
                  {t('settings.profileName')}
                </Text>
                <TextInput
                  style={styles.accountInput}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  autoCorrect={false}
                  editable={!saving}
                />
                <View style={styles.accountButtons}>
                  <Pressable
                    style={[styles.accountButton, styles.accountCancel]}
                    onPress={() => setEditingName(false)}
                    disabled={saving}
                  >
                    <Text style={styles.accountCancelText}>
                      {t('settings.cancel')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.accountButton, styles.accountAccept]}
                    onPress={() => void handleSaveName()}
                    disabled={saving}
                  >
                    <Text style={styles.accountAcceptText}>
                      {t('settings.accept')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.editRow} onPress={openNameEdit}>
                <View style={styles.editText}>
                  <Text style={styles.editLabel}>
                    {t('settings.profileName')}
                  </Text>
                  <Text style={styles.editValue}>{me?.name ?? '…'}</Text>
                </View>
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={Colors.light.primary}
                />
              </Pressable>
            )}

            {editingEmail ? (
              <View style={styles.languageBlock}>
                <Text style={styles.editLabel}>{t('settings.email')}</Text>
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
                    <Text style={styles.accountCancelText}>
                      {t('settings.cancel')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.accountButton, styles.accountAccept]}
                    onPress={() => void handleSaveEmail()}
                    disabled={saving}
                  >
                    <Text style={styles.accountAcceptText}>
                      {t('settings.accept')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.editRow} onPress={openEmailEdit}>
                <View style={styles.editText}>
                  <Text style={styles.editLabel}>{t('settings.email')}</Text>
                  <Text style={styles.editValue}>{me?.email ?? '…'}</Text>
                </View>
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={Colors.light.primary}
                />
              </Pressable>
            )}

            <Pressable
              style={styles.editRow}
              onPress={() => router.push('/change-password')}
            >
              <View style={styles.editText}>
                <Text style={styles.editLabel}>{t('settings.password')}</Text>
                <Text style={styles.editValue}>
                  {t('settings.changePassword')}
                </Text>
              </View>
              <Ionicons
                name="create-outline"
                size={18}
                color={Colors.light.primary}
              />
            </Pressable>

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

          <Text style={styles.gardenTitle}>{t('settings.myGardens')}</Text>

          {fields.length === 0 ? (
            <Text style={styles.emptyGardens}>
              {t('settings.emptyGardens')}
            </Text>
          ) : (
            <View style={styles.gardenGrid}>
              {fields.map((field) => (
                <View
                  key={field.id}
                  style={[
                    styles.gardenCard,
                    currentFieldId === field.id
                      ? styles.gardenCardCurrent
                      : null,
                  ]}
                >
                  <Pressable onPress={() => openField(field.id)}>
                    <View>
                      <FieldPhoto
                        fieldId={field.id}
                        style={styles.gardenPhoto}
                      />
                      {currentFieldId === field.id ? (
                        <View style={styles.gardenBadge}>
                          <Text style={styles.gardenBadgeText}>
                            {t('settings.currentBadge')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.gardenBody}>
                      <Text style={styles.gardenName} numberOfLines={1}>
                        {field.name}
                      </Text>
                      <Text style={styles.gardenMeta} numberOfLines={1}>
                        {field.location ?? '—'}
                      </Text>
                      <Text style={styles.gardenMeta}>
                        {t('settings.arduinos', {
                          count: field.device_count,
                        })}
                      </Text>
                    </View>
                  </Pressable>
                  {currentFieldId === field.id ? null : (
                    <View style={styles.gardenActions}>
                      <Pressable onPress={() => void handleSetCurrent(field)}>
                        <Text style={styles.gardenEdit}>
                          {t('settings.setCurrent')}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

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
