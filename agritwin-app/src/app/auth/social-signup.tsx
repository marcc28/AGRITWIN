
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';

import Alert from '../../components/Alert';
import {
  getPrivacyPolicy,
  getSecurityPolicy,
} from '../../services/api';
import { completeSocialSignup } from '../../services/api_oauth';
import { setAuth } from '../../services/auth';
import { routeAfterAuth } from '../../services/routeAfterAuth';
import { styles } from '../../styles/signup.styles';
import { Gradients } from '@/constants/colors';

export default function SocialSignupScreen() {
  const { signupToken, email, name, provider } = useLocalSearchParams<{
    signupToken: string;
    email: string;
    name: string;
    provider: string;
  }>();

  const [username, setUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState(email || '');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

    setLegalTitle(
      type === 'privacy' ? 'Privacy Notice' : 'Security Policy',
    );

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

  // -----------------------------
  // Social signup
  // -----------------------------

  async function handleSignUp() {
    setErrorMessage('');

    const trimmedUsername = username.trim();

    if (!signupToken) {
      setErrorMessage(
        'El registre no és vàlid. Torna a iniciar sessió amb el proveïdor social.',
      );
      return;
    }

    if (!trimmedUsername) {
      setErrorMessage('Introdueix un nom d’usuari.');
      return;
    }

    if (!email && !signupEmail.trim()) {
      setErrorMessage('Introdueix el teu correu electrònic per completar el registre.');
      return;
    }

    if (!privacyAccepted) {
      setErrorMessage('Has d’acceptar la política de privacitat.');
      return;
    }

    if (!securityAccepted) {
      setErrorMessage('Has d’acceptar les condicions de seguretat.');
      return;
    }

    try {
      setLoading(true);

      const result = await completeSocialSignup(
        signupToken,
        trimmedUsername,
        privacyAccepted,
        securityAccepted,
        signupEmail.trim() || undefined,
      );

      await setAuth(
        trimmedUsername,
        result.access_token,
        result.refresh_token,
      );

      await routeAfterAuth();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No s’ha pogut completar el registre.';

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
      router.replace('/auth/login');
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

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        {/* Títol */}

        <Text style={styles.heading}>AgriTwin</Text>

        <Text style={styles.subtitle}>
          Completa el teu registre amb {provider || 'el proveïdor social'}
        </Text>

        {/* Error */}

        {errorMessage !== '' && (
          <View testID="social-signup-error">
            <Alert variant="danger" title="Error">
              {errorMessage}
            </Alert>
          </View>
        )}

        {/* Informació del compte Google */}

        <Text style={styles.legalText}>
          Benvingut/da a AgriTwin{name ? `, ${name}` : ''}.
        </Text>

        <Text style={styles.label}>Correu electrònic</Text>

        <TextInput
          style={styles.input}
          value={email || signupEmail}
          editable={!email && !loading}
          selectTextOnFocus={Boolean(email)}
          onChangeText={setSignupEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="nom@exemple.com"
        />

        {/* Username */}

        <TextInput
          testID="social-signup-username"
          style={styles.input}
          placeholder="Nom d'usuari"
          placeholderTextColor="#aaa"
          value={username}
          onChangeText={handleUsernameChange}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        {/* Legal */}

        <View style={styles.legalContainer}>
          {/* Privacy */}

          <View style={styles.checkboxRow}>
            <Pressable
              testID="privacy-checkbox-press"
              onPress={() => setPrivacyAccepted(!privacyAccepted)}
              disabled={loading}
              accessibilityRole="checkbox"
              accessibilityLabel="Accept privacy notice"
              accessibilityState={{
                checked: privacyAccepted,
                disabled: loading,
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  privacyAccepted && styles.checkboxChecked,
                ]}
              >
                {privacyAccepted && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </Pressable>

            <Text style={styles.legalText}>
              He llegit i accepto la{' '}
              <Text
                testID="privacy-checkbox-open"
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
              testID="security-checkbox-press"
              onPress={() => setSecurityAccepted(!securityAccepted)}
              disabled={loading}
              accessibilityRole="checkbox"
              accessibilityLabel="Accept security policy"
              accessibilityState={{
                checked: securityAccepted,
                disabled: loading,
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  securityAccepted && styles.checkboxChecked,
                ]}
              >
                {securityAccepted && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
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

        {/* Botons */}

        <View style={styles.buttonsContainer}>
          {/* Sign Up */}

          <Pressable
            testID="social-signup-button"
            style={styles.buttonWrapper}
            onPress={handleSignUp}
            disabled={loading}
          >
            <LinearGradient
              colors={Gradients.primary}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creant compte...' : 'Sign Up'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* LEGAL MODAL */}

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
                <Text style={styles.modalTitle}>
                  {legalTitle}
                </Text>

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

            {/* Content */}

            {legalLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" />

                <Text style={styles.modalLoadingText}>
                  Carregant document...
                </Text>
              </View>
            ) : legalError !== '' ? (
              <View style={styles.modalError}>
                <Text style={styles.modalErrorText}>
                  {legalError}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={true}
              >
                <Text style={styles.legalDocumentText}>
                  {legalContent}
                </Text>
              </ScrollView>
            )}

            {/* Footer */}

            <Pressable
              style={styles.modalButton}
              onPress={closeLegalDocument}
            >
              <Text style={styles.modalButtonText}>
                Tancar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
