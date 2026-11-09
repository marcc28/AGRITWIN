import { useEffect } from 'react';
import {
  Image,
  ImageStyle,
  Platform,
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { router } from 'expo-router';

import { setAuth } from '../services/auth';
import { routeAfterAuth } from '../services/routeAfterAuth';
import {
  exchangeFacebookLoginTicket,
  exchangeXLoginTicket,
  socialGoogleLogin,
} from '../services/api_oauth';
import * as Linking from 'expo-linking';
const API_URL = process.env.EXPO_PUBLIC_API_URL;

WebBrowser.maybeCompleteAuthSession();

type SocialLoginStyles = {
  socialContainer: StyleProp<ViewStyle>;
  socialTitle: StyleProp<TextStyle>;
  socialAccounts: StyleProp<ViewStyle>;
  socialButton: StyleProp<ViewStyle>;
  socialIcon: StyleProp<ImageStyle>;
};

type Props = {
  styles: SocialLoginStyles;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onError: (message: string) => void;
  title: string;
};

export default function SocialLoginButtons({
  styles,
  loading,
  onLoadingChange,
  onError,
  title,
}: Props) {
  const googleRedirectUri =
    process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI ||
    (Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : undefined);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri: googleRedirectUri,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    async function handleGoogleResponse() {
      if (response?.type !== 'success') {
        return;
      }

      try {
        onLoadingChange(true);
        onError('');

        const idToken =
          response.params?.id_token || response.authentication?.idToken;

        if (!idToken) {
          console.error('Google response:', response);
          throw new Error('Google ID token not received');
        }

        const result = await socialGoogleLogin(idToken);

        // Usuari nou: completar el registre
        if ('signup_token' in result) {
          router.push({
            pathname: '/auth/social-signup',
            params: {
              signupToken: result.signup_token,
              email: result.email,
              name: result.name,
            },
          });

          return;
        }

        // Usuari existent
        await setAuth('google', result.access_token, result.refresh_token);

        await routeAfterAuth();
      } catch (error) {
        console.error('Google login error:', error);

        onError(error instanceof Error ? error.message : 'Google login failed');
      } finally {
        onLoadingChange(false);
      }
    }

    handleGoogleResponse();
  }, [response, onLoadingChange, onError]);
  const launchOAuthLogin = async (provider: 'x' | 'facebook') => {
    try {
      onLoadingChange(true);
      onError('');

      const redirectUri = Linking.createURL('auth/oauth-callback', {
        queryParams: { provider },
      });
      const loginUrl = new URL(
        `${API_URL}/api/v1/${provider === 'x' ? 'x/' : ''}${provider === 'x' ? 'login' : 'facebook/login'}`,
      );
      loginUrl.searchParams.set('app_redirect_uri', redirectUri);

      const result = await WebBrowser.openAuthSessionAsync(
        loginUrl.toString(),
        redirectUri,
      );
      if (result.type !== 'success') {
        return;
      }

      const ticket = new URL(result.url).searchParams.get('ticket');
      if (!ticket) {
        throw new Error(`${provider === 'x' ? 'X' : 'Facebook'} login ticket missing`);
      }

      const authResult =
        provider === 'x'
          ? await exchangeXLoginTicket(ticket)
          : await exchangeFacebookLoginTicket(ticket);

      if ('signup_token' in authResult) {
        router.push({
          pathname: '/auth/social-signup',
          params: {
            signupToken: authResult.signup_token,
            name: authResult.name,
            email: authResult.email || '',
            provider,
          },
        });
        return;
      }

      await setAuth(authResult.username, authResult.access_token, authResult.refresh_token);
      await routeAfterAuth();
    } catch (error) {
      console.error(`${provider} login error:`, error);

      onError(
        error instanceof Error
          ? error.message
          : `${provider === 'x' ? 'X' : 'Facebook'} authentication failed`,
      );
    } finally {
      onLoadingChange(false);
    }
  };
  return (
    <View style={styles.socialContainer}>
      <Text style={styles.socialTitle}>{title}</Text>

      <View style={styles.socialAccounts}>
        {/* Google */}
        <Pressable
          testID="google-button"
          style={styles.socialButton}
          disabled={loading || !request}
          onPress={() => promptAsync()}
        >
          <Image
            source={require('../../assets/images/google.png')}
            style={styles.socialIcon}
            resizeMode="contain"
          />
        </Pressable>

        {/* Facebook */}
        <Pressable
          testID="facebook-button"
          style={styles.socialButton}
          disabled={loading}
          onPress={() => launchOAuthLogin('facebook')}
        >
          <Image
            source={require('../../assets/images/facebook_inverted.png')}
            style={styles.socialIcon}
            resizeMode="contain"
          />
        </Pressable>

        {/* Twitter */}
        <Pressable
          testID="x-button"
          style={styles.socialButton}
          disabled={loading}
          onPress={() => launchOAuthLogin('x')}
        >
          <Image
            source={require('../../assets/images/twitter.png')}
            style={styles.socialIcon}
            resizeMode="contain"
          />
        </Pressable>
      </View>
    </View>
  );
}
