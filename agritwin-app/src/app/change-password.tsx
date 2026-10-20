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

function goToProfile() {
  router.replace('/app/settings');
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
    if (!currentPassword) {
      setErrorMessage(t('settings.passwordScreen.errors.currentRequired'));
      return;
    }
    if (!newPassword) {
      setErrorMessage(t('settings.passwordScreen.errors.newRequired'));
      return;
    }
    if (!newPasswordConf) {
      setErrorMessage(t('settings.passwordScreen.errors.confirmRequired'));
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage(t('settings.passwordScreen.errors.tooShort'));
      return;
    }
    if (newPassword !== newPasswordConf) {
      setErrorMessage(t('settings.passwordScreen.errors.mismatch'));
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMessage(t('settings.passwordScreen.errors.sameAsCurrent'));
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
                <Text style={styles.label}>
                  {t('settings.passwordScreen.current')}
                </Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder={t(
                      'settings.passwordScreen.currentPlaceholder',
                    )}
                    placeholderTextColor={Colors.light.textMuted}
                    secureTextEntry={!showCurrent}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!saving}
                  />
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() => setShowCurrent((value) => !value)}
                    accessibilityLabel={
                      showCurrent
                        ? t('settings.passwordScreen.hidePassword')
                        : t('settings.passwordScreen.showPassword')
                    }
                  >
                    <Ionicons
                      name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.light.textMuted}
                    />
                  </Pressable>
                </View>

                <Text style={styles.label}>
                  {t('settings.passwordScreen.new')}
                </Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder={t('settings.passwordScreen.newPlaceholder')}
                    placeholderTextColor={Colors.light.textMuted}
                    secureTextEntry={!showNew}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!saving}
                  />
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() => setShowNew((value) => !value)}
                    accessibilityLabel={
                      showNew
                        ? t('settings.passwordScreen.hidePassword')
                        : t('settings.passwordScreen.showPassword')
                    }
                  >
                    <Ionicons
                      name={showNew ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.light.textMuted}
                    />
                  </Pressable>
                </View>
                <Text style={styles.hint}>
                  {t('settings.passwordScreen.hint')}
                </Text>

                <Text style={styles.label}>
                  {t('settings.passwordScreen.confirm')}
                </Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={newPasswordConf}
                    onChangeText={setNewPasswordConf}
                    placeholder={t(
                      'settings.passwordScreen.confirmPlaceholder',
                    )}
                    placeholderTextColor={Colors.light.textMuted}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!saving}
                  />
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() => setShowConfirm((value) => !value)}
                    accessibilityLabel={
                      showConfirm
                        ? t('settings.passwordScreen.hidePassword')
                        : t('settings.passwordScreen.showPassword')
                    }
                  >
                    <Ionicons
                      name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.light.textMuted}
                    />
                  </Pressable>
                </View>

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
