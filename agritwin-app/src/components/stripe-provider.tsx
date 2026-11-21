import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

const merchantId = Constants.expoConfig?.plugins?.find(
  (p) => Array.isArray(p) && p[0] === '@stripe/stripe-react-native',
)?.[1]?.merchantIdentifier;

type Props = Omit<
  React.ComponentProps<typeof StripeProvider>,
  'publishableKey' | 'merchantIdentifier'
>;

export default function ExpoStripeProvider({
  children,
  ...props
}: Props): React.JSX.Element {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error('Falta EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY al fitxer .env');
  }

  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier={merchantId}
      urlScheme={Linking.createURL('/').split(':')[0]}
      {...props}
    >
      {children}
    </StripeProvider>
  );
}
