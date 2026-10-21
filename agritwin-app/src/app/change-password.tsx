import { useState } from 'react';
import { Text, View, Pressable, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { updateMyPassword } from '../services/api';
import { styles } from '../styles/change-password.styles';
import { Colors } from '../constants/theme';

function mapPasswordApiError(
  message: string,
  t: (key: string) => string,
): string {
  if (message === 'Incorrect current password') {
    return t('settings.passwordScreen.errors.incorrectCurrent');
  }
  if (message === 'Passwords do not match') {
    return t('settings.passwordScreen.errors.mismatch');
  }
  if (message === 'Password must be at least 8 characters') {
    return t('settings.passwordScreen.errors.tooShort');
  }
  if (
    message === 'Not authenticated' ||
    message === 'Could not validate credentials'
  ) {
    return t('settings.passwordScreen.errors.unauthenticated');
  }
  return message || t('settings.passwordScreen.errors.saveFailed');
}

function passwordFormError(
  currentPassword: string,
  newPassword: string,
  newPasswordConf: string,
  t: (key: string) => string,
): string | null {
  if (!currentPassword) {
    return t('settings.passwordScreen.errors.currentRequired');
  }
  if (!newPassword) {
    return t('settings.passwordScreen.errors.newRequired');
  }
  if (!newPasswordConf) {
    return t('settings.passwordScreen.errors.confirmRequired');
  }
  if (newPassword.length < 8) {
    return t('settings.passwordScreen.errors.tooShort');
  }
  if (newPassword !== newPasswordConf) {
    return t('settings.passwordScreen.errors.mismatch');
  }
  if (newPassword === currentPassword) {
    return t('settings.passwordScreen.errors.sameAsCurrent');
  }
  return null;
}

function goToProfile() {
  router.replace('/app/settings');
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  shown,
  onToggle,
  hideLabel,
  showLabel,
  disabled,
  hint,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  shown: boolean;
  onToggle: () => void;
  hideLabel: string;
  showLabel: string;
  disabled: boolean;
  hint?: string;
}>) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.light.textMuted}
          secureTextEntry={!shown}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
        />
        <Pressable
          style={styles.eyeButton}
          onPress={onToggle}
          accessibilityLabel={shown ? hideLabel : showLabel}
        >
          <Ionicons
            name={shown ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={Colors.light.textMuted}
          />
        </Pressable>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </>
  );
}

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConf, setNewPasswordConf] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSave() {
    const formError = passwordFormError(
      currentPassword,
      newPassword,
      newPasswordConf,
      t,
    );
    if (formError) {
      setErrorMessage(formError);
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      await updateMyPassword(currentPassword, newPassword, newPasswordConf);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConf('');
      setSuccess(true);
    } catch (error) {
      const raw =
        error instanceof Error
          ? error.message
          : t('settings.passwordScreen.errors.saveFailed');
      setErrorMessage(mapPasswordApiError(raw, t));
    } finally {
      setSaving(false);
    }
  }

  const hideLabel = t('settings.passwordScreen.hidePassword');
  const showLabel = t('settings.passwordScreen.showPassword');

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {success ? (
            <View style={styles.successCard}>
              <View style={styles.successIconWrap}>
                <Ionicons
                  name="checkmark"
                  size={36}
                  color={Colors.light.primary}
                />
              </View>
              <Text style={styles.successEyebrow}>
                {t('settings.passwordScreen.eyebrow')}
              </Text>
              <Text style={styles.successTitle}>
                {t('settings.passwordScreen.successTitle')}
              </Text>
              <Text style={styles.successSubtitle}>
                {t('settings.passwordScreen.successSubtitle')}
              </Text>
              <Pressable style={styles.successButton} onPress={goToProfile}>
                <Text style={styles.saveText}>
                  {t('settings.passwordScreen.backToAccount')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Pressable style={styles.backRow} onPress={goToProfile}>
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={Colors.light.textSecondary}
                />
                <Text style={styles.backText}>
                  {t('settings.passwordScreen.back')}
                </Text>
              </Pressable>

              <Text style={styles.eyebrow}>
                {t('settings.passwordScreen.eyebrow')}
              </Text>
              <Text style={styles.title}>
                {t('settings.passwordScreen.title')}
              </Text>
              <Text style={styles.subtitle}>
                {t('settings.passwordScreen.subtitle')}
              </Text>

              <View style={styles.card}>
                <PasswordField
                  label={t('settings.passwordScreen.current')}
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder={t('settings.passwordScreen.currentPlaceholder')}
                  shown={showCurrent}
                  onToggle={() => setShowCurrent((value) => !value)}
                  hideLabel={hideLabel}
                  showLabel={showLabel}
                  disabled={saving}
                />
                <PasswordField
                  label={t('settings.passwordScreen.new')}
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder={t('settings.passwordScreen.newPlaceholder')}
                  shown={showNew}
                  onToggle={() => setShowNew((value) => !value)}
                  hideLabel={hideLabel}
                  showLabel={showLabel}
                  disabled={saving}
                  hint={t('settings.passwordScreen.hint')}
                />
                <PasswordField
                  label={t('settings.passwordScreen.confirm')}
                  value={newPasswordConf}
                  onChange={setNewPasswordConf}
                  placeholder={t('settings.passwordScreen.confirmPlaceholder')}
                  shown={showConfirm}
                  onToggle={() => setShowConfirm((value) => !value)}
                  hideLabel={hideLabel}
                  showLabel={showLabel}
                  disabled={saving}
                />

                {errorMessage ? (
                  <Text style={styles.errorText}>{errorMessage}</Text>
                ) : null}

                <Pressable
                  style={[
                    styles.saveButton,
                    saving ? styles.saveButtonDisabled : null,
                  ]}
                  onPress={() => void handleSave()}
                  disabled={saving}
                >
                  <Text style={styles.saveText}>
                    {saving
                      ? t('settings.passwordScreen.saving')
                      : t('settings.passwordScreen.save')}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={goToProfile}
                  disabled={saving}
                >
                  <Text style={styles.cancelText}>
                    {t('settings.passwordScreen.cancel')}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
