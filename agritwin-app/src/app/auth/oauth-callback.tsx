import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import Alert from '../../components/Alert';
import {
  exchangeFacebookLoginTicket,
  exchangeGoogleLoginTicket,
  exchangeXLoginTicket,
} from '../../services/api_oauth';
import { setAuth } from '../../services/auth';
import { routeAfterAuth } from '../../services/routeAfterAuth';

WebBrowser.maybeCompleteAuthSession();

export default function SocialOAuthCallbackScreen() {
  const { provider, ticket } = useLocalSearchParams<{
    provider: string;
    ticket: string;
  }>();
  const processedTicket = useRef<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const label =
    provider === 'x' ? 'X' : provider === 'google' ? 'Google' : 'Facebook';

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    if (!ticket || !provider) {
      setErrorMessage('El retorn social no ha inclòs el tiquet de sessió.');
      return;
    }
    if (processedTicket.current === ticket) return;
    processedTicket.current = ticket;

    async function finishLogin() {
      try {
        const result =
          provider === 'google'
            ? await exchangeGoogleLoginTicket(ticket)
            : provider === 'x'
              ? await exchangeXLoginTicket(ticket)
              : provider === 'facebook'
                ? await exchangeFacebookLoginTicket(ticket)
                : null;

        if (!result) {
          throw new Error('Proveïdor social no vàlid.');
        }
        if ('signup_token' in result) {
          router.replace({
            pathname: '/auth/social-signup',
            params: {
              signupToken: result.signup_token,
              name: result.name,
              email: result.email || '',
              provider,
            },
          });
          return;
        }

        await setAuth(
          result.username,
          result.access_token,
          result.refresh_token,
        );
        await routeAfterAuth();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No s’ha pogut iniciar sessió.',
        );
      }
    }

    void finishLogin();
  }, [provider, ticket]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        padding: 24,
      }}
    >
      {errorMessage ? (
        <>
          <Alert variant="danger" title="Error">
            {errorMessage}
          </Alert>
          <Pressable onPress={() => router.replace('/auth/login')}>
            <Text>Torna a iniciar sessió</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" />
          <Text>Finalitzant la sessió amb {label}...</Text>
        </>
      )}
    </View>
  );
}
