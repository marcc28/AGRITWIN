import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import ExpoStripeProvider from '@/components/stripe-provider.web';

it('renders its children on web without a native Stripe provider', () => {
  render(
    <ExpoStripeProvider>
      <Text>stripe-child</Text>
    </ExpoStripeProvider>,
  );

  expect(screen.getByText('stripe-child')).toBeTruthy();
});
