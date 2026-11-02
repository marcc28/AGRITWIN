import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import ExpoStripeProvider from '@/components/stripe-provider';

jest.mock('@stripe/stripe-react-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>(
    'react-native',
  );
  return {
    StripeProvider: ({ children }: { children: React.ReactNode }) => (
      <View testID="stripe-provider">{children}</View>
    ),
  };
});

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      plugins: [
        ['@stripe/stripe-react-native', { merchantIdentifier: 'merchant.test' }],
      ],
    },
  },
}));

jest.mock('expo-linking', () => ({ createURL: () => 'agritwin:///' }));

describe('native Stripe provider', () => {
  const originalKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    } else {
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = originalKey;
    }
  });

  it('requires a publishable key', () => {
    delete process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    expect(() =>
      render(
        <ExpoStripeProvider>
          <Text>checkout</Text>
        </ExpoStripeProvider>,
      ),
    ).toThrow('Falta EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY al fitxer .env');
  });

  it('renders its children when configured', () => {
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_key';

    render(
      <ExpoStripeProvider>
        <Text>checkout</Text>
      </ExpoStripeProvider>,
    );

    expect(screen.getByTestId('stripe-provider')).toBeTruthy();
    expect(screen.getByText('checkout')).toBeTruthy();
  });
});
