import { useEffect, useState } from 'react';
import { Image, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OptionChip } from '@/components/OptionChip';
import { Colors } from '@/constants/theme';
import {
  getMe,
  isAuthError,
  updateMe,
  updateMyEmail,
  type Me,
} from '@/services/api';
import { clearAuth } from '@/services/auth';
import { styles } from '@/styles/settings.styles';

const LANGUAGES = [
  { value: 'ca', labelKey: 'languages.catalan' },
  { value: 'es', labelKey: 'languages.spanish' },
  { value: 'en', labelKey: 'languages.english' },
  { value: 'it', labelKey: 'languages.italian' },
] as const;

export function AccountCard() {
  const { t, i18n } = useTranslation();
  const [me, setMe] = useState<Me | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    async function loadMe() {
      try {
        const data = await getMe();
        setMe(data);
        if (data.language && data.language !== i18n.language) {
          await i18n.changeLanguage(data.language);
        }
      } catch (error) {
        if (isAuthError(error)) {
          await clearAuth();
          router.replace('/auth/login');
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : t('settings.errors.loadProfile'),
        );
      }
    }

    void loadMe();
    // Load once when opening the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile(next: Me) {
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
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('settings.errors.saveProfile'),
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function savePrefs(next: Me) {
    setMe(next);
    await saveProfile(next);
  }

  async function handleLanguageChange(value: string) {
    if (!me || value === me.language) {
      return;
    }
    await i18n.changeLanguage(value);
    await savePrefs({ ...me, language: value });
  }

  async function handleLogout() {
    await clearAuth();
    router.replace('/auth/login');
  }

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
    if (me && (await saveProfile({ ...me, name: next }))) {
      setEditingName(false);
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
      setMe(await updateMyEmail(next));
      setEditingEmail(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('settings.errors.changeEmail'),
      );
    } finally {
      setSaving(false);
    }
  }

  function renderEditor(
    label: string,
    value: string,
    onChange: (text: string) => void,
    onCancel: () => void,
    onSave: () => void,
    email = false,
  ) {
    return (
      <View style={styles.languageBlock}>
        <Text style={styles.editLabel}>{label}</Text>
        <TextInput
          style={styles.accountInput}
          value={value}
          onChangeText={onChange}
          autoCapitalize={email ? 'none' : 'sentences'}
          autoCorrect={false}
          keyboardType={email ? 'email-address' : 'default'}
          editable={!saving}
        />
        <View style={styles.accountButtons}>
          <Pressable
            style={[styles.accountButton, styles.accountCancel]}
            onPress={onCancel}
            disabled={saving}
          >
            <Text style={styles.accountCancelText}>{t('settings.cancel')}</Text>
          </Pressable>
          <Pressable
            style={[styles.accountButton, styles.accountAccept]}
            onPress={onSave}
            disabled={saving}
          >
            <Text style={styles.accountAcceptText}>{t('settings.accept')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderRow(label: string, value: string, onPress: () => void) {
    return (
      <Pressable style={styles.editRow} onPress={onPress}>
        <View style={styles.editText}>
          <Text style={styles.editLabel}>{label}</Text>
          <Text style={styles.editValue}>{value}</Text>
        </View>
        <Ionicons
          name="create-outline"
          size={18}
          color={Colors.light.primary}
        />
      </Pressable>
    );
  }

  return (
    <View>
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <View style={styles.profileCard}>
        <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>

        {editingName
          ? renderEditor(
              t('settings.profileName'),
              nameDraft,
              setNameDraft,
              () => setEditingName(false),
              () => void handleSaveName(),
            )
          : renderRow(t('settings.profileName'), me?.name ?? '…', openNameEdit)}

        {editingEmail
          ? renderEditor(
              t('settings.email'),
              emailDraft,
              setEmailDraft,
              () => setEditingEmail(false),
              () => void handleSaveEmail(),
              true,
            )
          : renderRow(t('settings.email'), me?.email ?? '…', openEmailEdit)}

        {renderRow(t('settings.password'), t('settings.changePassword'), () =>
          router.push('/change-password'),
        )}

        <View style={styles.languageBlock}>
          <Text style={styles.languageLabel}>{t('settings.language')}</Text>
          <View style={styles.languageGrid}>
            {LANGUAGES.map((language) => (
              <OptionChip
                key={language.value}
                label={t(language.labelKey)}
                selected={(me?.language ?? i18n.language).startsWith(
                  language.value,
                )}
                onPress={() => void handleLanguageChange(language.value)}
                style={styles.chip}
                selectedStyle={styles.chipSelected}
                textStyle={styles.chipText}
                selectedTextStyle={styles.chipTextSelected}
              />
            ))}
          </View>
        </View>

        <Text style={[styles.sectionTitle, styles.preferencesTitle]}>
          {t('settings.preferences')}
        </Text>

        <View style={styles.editRow}>
          <Text style={styles.editValue}>{t('settings.notifications')}</Text>
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
          <Text style={styles.editValue}>{t('settings.weatherAlerts')}</Text>
          <Switch
            value={me?.weather_alerts_enabled ?? true}
            onValueChange={(value) =>
              me
                ? void savePrefs({ ...me, weather_alerts_enabled: value })
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

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Image
          source={require('@assets/images/logout.png')}
          style={styles.logoutIcon}
        />
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </Pressable>
    </View>
  );
}
