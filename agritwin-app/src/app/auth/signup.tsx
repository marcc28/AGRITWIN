import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import Alert from '../../components/Alert';
import {
  getPrivacyPolicy,
  getSecurityPolicy,
  signup,
} from '../../services/api';
import { styles } from '../../styles/signup.styles';

export default function SignupScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordconfirm, setPasswordConf] = useState('');
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [securityAccepted, setSecurityAccepted] = useState(false);

  // -----------------------------
  // Legal document modal
  // -----------------------------

  const [legalVisible, setLegalVisible] = useState(false);
  const [legalTitle, setLegalTitle] = useState('');
  const [legalContent, setLegalContent] = useState('');
  const [legalVersion, setLegalVersion] = useState('');
  const [legalLoading, setLegalLoading] = useState(false);
  const [legalError, setLegalError] = useState('');

  async function openLegalDocument(type: 'privacy' | 'security') {
    setLegalVisible(true);
    setLegalLoading(true);
    setLegalError('');
    setLegalContent('');
    setLegalVersion('');

    // Mostrem el títol immediatament
    setLegalTitle(type === 'privacy' ? 'Privacy Notice' : 'Security Policy');

    try {
      const document =
        type === 'privacy'
          ? await getPrivacyPolicy()
          : await getSecurityPolicy();

      setLegalContent(document.content);
      setLegalVersion(document.version);
    } catch (error) {
      console.error('Error loading legal document:', error);

      setLegalError(
        error instanceof Error
          ? error.message
          : 'No s’ha pogut carregar el document',
      );
    } finally {
      setLegalLoading(false);
    }
  }

  function closeLegalDocument() {
    setLegalVisible(false);
  }

  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // -----------------------------
  // Signup
  // -----------------------------

  async function handleSignup() {
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedPasswordConfirm = passwordconfirm.trim();

    // Validació de camps
    if (
      !trimmedUsername ||
      !trimmedEmail ||
      !trimmedPassword ||
      !trimmedPasswordConfirm
    ) {
      setErrorMessage('Omple tots els camps');
      return;
    }

    // Validació de contrasenyes
    if (trimmedPassword !== trimmedPasswordConfirm) {
      setErrorMessage('Les contrasenyes no coincideixen');
      return;
    }

    // Validació Privacy
    if (!privacyAccepted) {
      setErrorMessage('Has d’acceptar la Privacy Notice');
      return;
    }

    // Validació Security
    if (!securityAccepted) {
      setErrorMessage('Has d’acceptar la Security Policy');
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMessage('Format d\'email incorrecte');
      return;
    }

    try {
      setLoading(true);

      const user = await signup(
        trimmedUsername,
        trimmedEmail,
        trimmedPassword,
        trimmedPasswordConfirm,
        privacyAccepted,
        securityAccepted,
      );

      console.log('Usuari creat:', user);

      setSuccessMessage("El compte s'ha creat correctament");

      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);
    } catch (error) {
      console.error('Error signup:', error);

      const message =
        error instanceof Error
          ? error.message
          : "No s'ha pogut crear el compte";

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // Navigation
  // -----------------------------

  function handleLogIn() {
    if (!loading) {
      router.push('/auth/login');
    }
  }

  // -----------------------------
  // Input handlers
  // -----------------------------

  function handleUsernameChange(value: string) {
    setUsername(value);

    if (errorMessage) {
      setErrorMessage('');
    }
  }

  function handleEmailChange(value: string) {
    setEmail(value);

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

  function handlePasswordConfirmChange(value: string) {
    setPasswordConf(value);

    if (errorMessage) {
      setErrorMessage('');
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        {/* Títol */}
        <Text style={styles.heading}>AgriTwin</Text>

        <Text style={styles.subtitle}>Crear compte</Text>

        {/* Error */}
        {errorMessage !== '' && (
          <Alert variant="danger" title="Error">
            {errorMessage}
          </Alert>
        )}

        {/* Success */}
        {successMessage !== '' && (
          <Alert variant="success" title="Compte creat">
            {successMessage}
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

        {/* Confirmació password */}
        <TextInput
          style={styles.input}
          placeholder="Repetir contrasenya"
          placeholderTextColor="#aaa"
          value={passwordconfirm}
          onChangeText={handlePasswordConfirmChange}
          secureTextEntry
          editable={!loading}
        />

        {/* Email */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={handleEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        {/* Legal */}
        <View style={styles.legalContainer}>
          {/* Privacy */}
          <View style={styles.checkboxRow}>
            <Pressable
              onPress={() => setPrivacyAccepted(!privacyAccepted)}
              disabled={loading}
            >
              <View
                style={[
                  styles.checkbox,
                  privacyAccepted && styles.checkboxChecked,
                ]}
              >
                {privacyAccepted && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </Pressable>

            <Text style={styles.legalText}>
              He llegit i accepto la{' '}
              <Text
                style={styles.link}
                onPress={() => openLegalDocument('privacy')}
              >
                Privacy Notice
              </Text>
              .
            </Text>
          </View>

          {/* Security */}
          <View style={styles.checkboxRow}>
            <Pressable
              onPress={() => setSecurityAccepted(!securityAccepted)}
              disabled={loading}
            >
              <View
                style={[
                  styles.checkbox,
                  securityAccepted && styles.checkboxChecked,
                ]}
              >
                {securityAccepted && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </Pressable>

            <Text style={styles.legalText}>
              He llegit i accepto la{' '}
              <Text
                style={styles.link}
                onPress={() => openLegalDocument('security')}
              >
                Security Policy
              </Text>
              .
            </Text>
          </View>
        </View>

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
          {/* Login */}
          <Pressable
            style={styles.buttonWrapper}
            onPress={handleLogIn}
            disabled={loading}
          >
            <LinearGradient
              colors={['#1089D3', '#12B1D1']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Log In</Text>
            </LinearGradient>
          </Pressable>

          {/* Sign Up */}
          <Pressable
            style={styles.buttonWrapper}
            onPress={handleSignup}
            disabled={loading}
          >
            <LinearGradient
              colors={['#1089D3', '#12B1D1']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creant compte...' : 'Sign Up'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* =====================================================
          LEGAL MODAL
          ===================================================== */}

      <Modal
        visible={legalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeLegalDocument}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>{legalTitle}</Text>

                {legalVersion !== '' && (
                  <Text style={styles.modalVersion}>
                    Version {legalVersion}
                  </Text>
                )}
              </View>

              <Pressable
                onPress={closeLegalDocument}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            {/* Contingut */}
            {legalLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" />

                <Text style={styles.modalLoadingText}>
                  Carregant document...
                </Text>
              </View>
            ) : legalError !== '' ? (
              <View style={styles.modalError}>
                <Text style={styles.modalErrorText}>{legalError}</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={true}
              >
                <Text style={styles.legalDocumentText}>{legalContent}</Text>
              </ScrollView>
            )}

            {/* Footer */}
            <Pressable style={styles.modalButton} onPress={closeLegalDocument}>
              <Text style={styles.modalButtonText}>Tancar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
