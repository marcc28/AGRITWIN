import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Alert from '../../components/Alert';
import { forgotPassword } from '../../services/api';
import { styles } from '../../styles/login.styles';
import { Gradients } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmit() {
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage(t('forgotPassword.errors.required'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage(t('forgotPassword.errors.invalidEmail'));
      return;
    }

    try {
      setLoading(true);

      await forgotPassword(trimmedEmail);

      setSuccessMessage(t('forgotPassword.success'));
      setEmail('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('forgotPassword.errors.sendFailed'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.heading}>AgriTwin</Text>

        <Text style={styles.subtitle}>{t('forgotPassword.title')}</Text>

        {errorMessage !== '' && (
          <Alert variant="danger" title={t('common.error')}>
            {errorMessage}
          </Alert>
        )}

        {successMessage !== '' && (
          <Alert variant="success" title={t('forgotPassword.successTitle')}>
            {successMessage}
          </Alert>
        )}

        <Text style={styles.subtitle}>{t('forgotPassword.subtitle')}</Text>

        <TextInput
          testID="recovery-email-input"
          style={styles.input}
          placeholder={t('forgotPassword.email')}
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setErrorMessage('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <View style={styles.buttonsContainer}>
          <Pressable
            testID="send-recovery-email-button"
            style={styles.buttonWrapper}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={Gradients.primary}
              style={[
                styles.button,
                {
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {t('forgotPassword.send')}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        <Pressable onPress={() => router.back()} disabled={loading}>
          <Text style={styles.linkText}>{t('forgotPassword.back')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
