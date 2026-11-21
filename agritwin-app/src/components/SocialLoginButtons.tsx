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

import * as WebBrowser from 'expo-web-browser';

import { router } from 'expo-router';

import { setAuth } from '../services/auth';
import { routeAfterAuth } from '../services/routeAfterAuth';
import {
  exchangeFacebookLoginTicket,
  exchangeGoogleLoginTicket,
  exchangeXLoginTicket,
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
  const launchOAuthLogin = async (provider: 'google' | 'x' | 'facebook') => {
    try {
      onLoadingChange(true);
      onError('');

      const redirectUri = Linking.createURL('auth/oauth-callback', {
        queryParams: { provider },
      });
      const loginPath =
        provider === 'google'
          ? 'login'
          : provider === 'x'
            ? 'x/login'
            : 'facebook/login';
      const loginUrl = new URL(`${API_URL}/api/v1/${loginPath}`);
      loginUrl.searchParams.set('app_redirect_uri', redirectUri);

      const result = await WebBrowser.openAuthSessionAsync(
        loginUrl.toString(),
        redirectUri,
      );
      // Native deep links open the callback route, which exchanges the ticket.
      // On web, the popup returns its URL to this screen instead.
      if (Platform.OS !== 'web') {
        return;
      }
      if (result.type !== 'success') {
        return;
      }

      const ticket = new URL(result.url).searchParams.get('ticket');
      if (!ticket) {
        throw new Error(`${providerLabel(provider)} login ticket missing`);
      }

      const authResult =
        provider === 'google'
          ? await exchangeGoogleLoginTicket(ticket)
          : provider === 'x'
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

      await setAuth(
        authResult.username,
        authResult.access_token,
        authResult.refresh_token,
      );
      await routeAfterAuth();
    } catch (error) {
      console.error(`${provider} login error:`, error);

      onError(
        error instanceof Error
          ? error.message
          : `${providerLabel(provider)} authentication failed`,
      );
    } finally {
      onLoadingChange(false);
    }
  };

  function providerLabel(provider: 'google' | 'x' | 'facebook') {
    return provider === 'x'
      ? 'X'
      : provider === 'google'
        ? 'Google'
        : 'Facebook';
  }

  return (
    <View style={styles.socialContainer}>
      <Text style={styles.socialTitle}>{title}</Text>

      <View style={styles.socialAccounts}>
        {/* Google */}
        <Pressable
          testID="google-button"
          style={styles.socialButton}
          disabled={loading}
          onPress={() => launchOAuthLogin('google')}
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
