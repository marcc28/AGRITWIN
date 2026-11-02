import { GET } from '@/services/stripe-results+api';
import { stripe } from '@/utils/stripe-server';

jest.mock('@/utils/stripe-server', () => ({
  stripe: { checkout: { sessions: { retrieve: jest.fn() } } },
}));

it('retrieves and expands a Stripe checkout session', async () => {
  const session = { id: 'cs_test_123', payment_status: 'paid' };
  (stripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue(session);

  const response = await GET(
    new Request('https://app.test/result?session_id=cs_test_123'),
  );

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual(session);
  expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith(
    'cs_test_123',
    { expand: ['line_items', 'payment_intent'] },
  );
});

it('rejects a result request with no session id', async () => {
  await expect(GET(new Request('https://app.test/result'))).rejects.toThrow(
    'Please provide a valid session_id (`cs_test_...`)',
  );
});
