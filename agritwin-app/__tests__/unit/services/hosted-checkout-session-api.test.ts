import { POST } from '@/services/hosted-checkout-session+api';
import { stripe } from '@/utils/stripe-server';

jest.mock('@/utils/stripe-server', () => ({
  stripe: { checkout: { sessions: { create: jest.fn() } } },
}));

describe('hosted checkout session API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      client_secret: 'cs_secret',
      url: 'https://checkout.stripe.com/cs_test',
    });
  });

  it('creates a hosted session using the request origin and amount', async () => {
    const response = await POST(
      new Request('https://app.test/api/checkout', {
        headers: { custom_donation: '12.34', origin: 'https://app.test' },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      client_secret: 'cs_secret',
      url: 'https://checkout.stripe.com/cs_test',
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        submit_type: 'donate',
        success_url: 'https://app.test/result?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://app.test/',
        ui_mode: 'hosted',
        line_items: [
          expect.objectContaining({
            quantity: 1,
            price_data: expect.objectContaining({ currency: 'usd', unit_amount: 1234 }),
          }),
        ],
      }),
    );
  });
});
