import Stripe from 'stripe';

import { stripe } from '@/utils/stripe-server';

jest.mock('stripe', () => {
  const Stripe = Object.assign(jest.fn(), {
    createFetchHttpClient: jest.fn(() => 'fetch-http-client'),
  });
  return { __esModule: true, default: Stripe };
});

it('configures the Stripe client with the server key and fetch transport', () => {
  expect(Stripe).toHaveBeenCalledWith(
    undefined,
    expect.objectContaining({
      apiVersion: '"2026-09-30.endive',
      httpClient: 'fetch-http-client',
      appInfo: { name: 'expo-router-stripe' },
    }),
  );
  expect(stripe).toBeDefined();
});
