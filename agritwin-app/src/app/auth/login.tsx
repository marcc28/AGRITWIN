import { useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Alert from '../../components/Alert';
import { styles } from '../../styles/login.styles';
import { login } from '../../services/api';
import { setAuth } from '../../services/auth';

export default function LoginScreen() {
  const { t } = useTranslation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLogin() {
    setErrorMessage('');

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername && !trimmedPassword) {
      setErrorMessage(t('login.errors.usernameAndPassword'));
      return;
    }

    if (!trimmedUsername) {
      setErrorMessage(t('login.errors.username'));
      return;
    }

    if (!trimmedPassword) {
      setErrorMessage(t('login.errors.password'));
      return;
    }

    try {
      setLoading(true);

      const data = await login(trimmedUsername, trimmedPassword);

      await setAuth(
        trimmedUsername,
        data.access_token,
        data.refresh_token,
      );

      router.replace('/app/home');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('login.errors.invalidCredentials');

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  function handleSignUp() {
    router.push('/auth/signup');
  }

  function handleUsernameChange(value: string) {
    setUsername(value);

    if (errorMessage) {
      setErrorMessage('');
    }
  }

  function handlePasswordChange(value: string) {
    setPassword(value);

    if (errorMessage) {
      setErrorMessage('');
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.container}>

        <Text style={styles.heading}>
          AgriTwin
        </Text>

        <Text style={styles.subtitle}>
          {t('login.title')}
        </Text>

        {errorMessage !== '' && (
          <Alert variant="danger" title={t('common.error')}>
            {errorMessage}
          </Alert>
        )}

        <TextInput
          testID="username-button"
          style={styles.input}
          placeholder={t('login.username')}
          placeholderTextColor="#aaa"
          value={username}
          onChangeText={handleUsernameChange}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <TextInput
          testID="password-button"
          style={styles.input}
          placeholder={t('login.password')}
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={handlePasswordChange}
          secureTextEntry
          editable={!loading}
        />

        <View style={styles.socialContainer}>
          <Text style={styles.socialTitle}>
            {t('login.socialLogin')}
          </Text>

          <View style={styles.socialAccounts}>
            <Pressable
              style={styles.socialButton}
              disabled={loading}
            >
              <Image
                source={require('../../../assets/images/google.png')}
                style={styles.socialIcon}
                resizeMode="contain"
              />
            </Pressable>

            <Pressable
              style={styles.socialButton}
              disabled={loading}
            >
              <Image
                source={require('../../../assets/images/instagram.png')}
                style={styles.socialIcon}
                resizeMode="contain"
              />
            </Pressable>

            <Pressable
              style={styles.socialButton}
              disabled={loading}
            >
              <Image
                source={require('../../../assets/images/twitter.png')}
                style={styles.socialIcon}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.buttonsContainer}>

          <Pressable
            testID="signup-button"
            style={styles.buttonWrapper}
            onPress={handleSignUp}
            disabled={loading}
          >
            <LinearGradient
              colors={['#1089D3', '#12B1D1']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {t('login.signUp')}
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            testID="login-button"
            style={styles.buttonWrapper}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={['#1089D3', '#12B1D1']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {loading
                  ? t('login.loggingIn')
                  : t('login.logIn')}
              </Text>
            </LinearGradient>
          </Pressable>

        </View>
      </View>
    </View>
  );
}