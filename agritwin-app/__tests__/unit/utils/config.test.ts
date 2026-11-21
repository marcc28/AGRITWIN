import { CURRENCY } from '@/utils/config';

describe('Stripe currency configuration', () => {
  it('uses the configured checkout currency', () => {
    expect(CURRENCY).toBe('usd');
  });
});
