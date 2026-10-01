import { useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import Alert from '../../components/Alert';
import { styles } from '../../styles/login.styles';
import { login } from '../../services/api';
import { setAuth } from '../../services/auth';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLogin() {
    setErrorMessage('');

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    // Validació
    if (!trimmedUsername && !trimmedPassword) {
      setErrorMessage('Introdueix el nom d’usuari i la contrasenya');
      return;
    }

    if (!trimmedUsername) {
      setErrorMessage('Introdueix el nom d’usuari');
      return;
    }

    if (!trimmedPassword) {
      setErrorMessage('Introdueix la contrasenya');
      return;
    }

    try {
      setLoading(true);

      const data = await login(trimmedUsername, trimmedPassword);

      console.log('Login correcte:', data);

      await setAuth(trimmedUsername, data.access_token, data.refresh_token);

      router.replace('/app/home');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Contrasenya incorrecta. Fes sign up si no tens compte.';

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
        {/* Títol */}
        <Text style={styles.heading}>AgriTwin</Text>

        <Text style={styles.subtitle}>Inicia sessió</Text>

        {/* Alert d'error */}
        {errorMessage !== '' && (
          <Alert variant="danger" title="Error">
            {errorMessage}
          </Alert>
        )}

        {/* Username */}
        <TextInput
          style={styles.input}
          placeholder="Nom d'usuari"
          placeholderTextColor="#aaa"
          value={username}
          onChangeText={handleUsernameChange}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        {/* Password */}
        <TextInput
          style={styles.input}
          placeholder="Contrasenya"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={handlePasswordChange}
          secureTextEntry
          editable={!loading}
        />

        {/* Login social */}
        <View style={styles.socialContainer}>
          <Text style={styles.socialTitle}>O inicia sessió amb</Text>

          <View style={styles.socialAccounts}>
            {/* Google */}
            <Pressable style={styles.socialButton} disabled={loading}>
              <Image
                source={require('../../../assets/images/google.png')}
                style={styles.socialIcon}
                resizeMode="contain"
              />
            </Pressable>

            {/* Instagram */}
            <Pressable style={styles.socialButton} disabled={loading}>
              <Image
                source={require('../../../assets/images/instagram.png')}
                style={styles.socialIcon}
                resizeMode="contain"
              />
            </Pressable>

            {/* Facebook */}
            <Pressable style={styles.socialButton} disabled={loading}>
              <Image
                source={require('../../../assets/images/twitter.png')}
                style={styles.socialIcon}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        </View>
        {/* Botons */}
        <View style={styles.buttonsContainer}>
          {/* Sign Up */}
          <Pressable
            style={styles.buttonWrapper}
            onPress={handleSignUp}
            disabled={loading}
          >
            <LinearGradient
              colors={['#1089D3', '#12B1D1']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Sign Up</Text>
            </LinearGradient>
          </Pressable>

          {/* Login */}
          <Pressable
            style={styles.buttonWrapper}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={['#1089D3', '#12B1D1']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Iniciant sessió...' : 'Log In'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
