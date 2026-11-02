import { POST } from '@/services/payment-sheet+api';
import { stripe } from '@/utils/stripe-server';

jest.mock('@/utils/stripe-server', () => ({
  stripe: {
    customers: { create: jest.fn() },
    ephemeralKeys: { create: jest.fn() },
    paymentIntents: { create: jest.fn() },
  },
}));

describe('native payment sheet API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (stripe.customers.create as jest.Mock).mockResolvedValue({ id: 'cus_123' });
    (stripe.ephemeralKeys.create as jest.Mock).mockResolvedValue({ secret: 'ek_secret' });
    (stripe.paymentIntents.create as jest.Mock).mockResolvedValue({ client_secret: 'pi_secret' });
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_key';
  });

  it('creates Stripe credentials for PaymentSheet', async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      paymentIntent: 'pi_secret',
      ephemeralKey: 'ek_secret',
      customer: 'cus_123',
      publishableKey: 'pk_test_key',
    });
    expect(stripe.customers.create).toHaveBeenCalledTimes(1);
    expect(stripe.ephemeralKeys.create).toHaveBeenCalledWith(
      { customer: 'cus_123' },
      { apiVersion: '2025-04-30.basil' },
    );
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1256,
        currency: 'usd',
        customer: 'cus_123',
        automatic_payment_methods: { enabled: true },
      }),
    );
  });
});
