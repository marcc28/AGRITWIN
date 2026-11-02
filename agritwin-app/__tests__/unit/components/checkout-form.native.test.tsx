import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import CheckoutForm from '@/components/checkout-form.native';
import { useStripe } from '@stripe/stripe-react-native';

jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: jest.fn(),
}));

const mockInitPaymentSheet = jest.fn();
const mockPresentPaymentSheet = jest.fn();
const mockFetch = jest.fn();
let mockAlert: jest.SpyInstance;

const paymentResponse = {
  paymentIntent: 'pi_secret',
  ephemeralKey: 'ek_secret',
  customer: 'cus_123',
};

describe('CheckoutForm native (Stripe PaymentSheet)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com/';
    global.fetch = mockFetch as typeof fetch;
    (useStripe as jest.Mock).mockReturnValue({
      initPaymentSheet: mockInitPaymentSheet,
      presentPaymentSheet: mockPresentPaymentSheet,
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => paymentResponse,
    });
    mockInitPaymentSheet.mockResolvedValue({});
    mockPresentPaymentSheet.mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates and presents a PaymentSheet for the selected product and quantity', async () => {
    const screen = render(
      <CheckoutForm productId="42" quantity={3} disabled={false} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() => expect(mockPresentPaymentSheet).toHaveBeenCalled());
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/payments/payment-sheet',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: '42', quantity: 3 }),
      }),
    );
    expect(mockInitPaymentSheet).toHaveBeenCalledWith({
      merchantDisplayName: 'AgriTwin',
      customerId: 'cus_123',
      customerEphemeralKeySecret: 'ek_secret',
      paymentIntentClientSecret: 'pi_secret',
      returnURL: 'agritwin://stripe-redirect',
    });
    expect(mockAlert).toHaveBeenCalledWith(
      'Pagament enviat',
      expect.stringContaining('confirmació definitiva'),
    );
    expect(screen.getByRole('button', { name: 'Comprar' })).toBeEnabled();
  });

  it('does not request a payment when disabled', () => {
    const screen = render(
      <CheckoutForm productId="42" quantity={1} disabled />,
    );

    expect(screen.getByRole('button', { name: 'Comprar' })).toBeDisabled();
    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('reports missing API configuration without making a request', async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    const screen = render(
      <CheckoutForm productId="42" quantity={1} disabled={false} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Falta configurar l’URL de l’API.',
      ),
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('reports server errors and restores the button', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ detail: 'Estoc insuficient' }),
    });
    const screen = render(
      <CheckoutForm productId="42" quantity={3} disabled={false} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith(
        'Error de pagament',
        'Estoc insuficient',
      ),
    );
    expect(screen.getByRole('button', { name: 'Comprar' })).toBeEnabled();
    expect(mockInitPaymentSheet).not.toHaveBeenCalled();
  });

  it('uses the server message when its detail is not text', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: { error: 'invalid' }, message: 'Invalid order' }),
    });
    const screen = render(
      <CheckoutForm productId="42" quantity={1} disabled={false} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith(
      'Error de pagament',
      'Invalid order',
    ));
  });

  it('uses the HTTP status when the server error has no text', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({ detail: { error: 'invalid' } }),
    });
    const screen = render(
      <CheckoutForm productId="42" quantity={1} disabled={false} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith(
      'Error de pagament',
      'Error del servidor: HTTP 502',
    ));
  });

  it('rejects incomplete Stripe credentials', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ paymentIntent: 'pi_secret' }),
    });
    const screen = render(
      <CheckoutForm productId="42" quantity={1} disabled={false} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith(
        'Error de pagament',
        'La resposta del servidor és incompleta.',
      ),
    );
    expect(mockInitPaymentSheet).not.toHaveBeenCalled();
  });

  it('shows Stripe setup failures', async () => {
    mockInitPaymentSheet.mockResolvedValueOnce({
      error: { message: 'No es pot configurar Stripe' },
    });
    const screen = render(
      <CheckoutForm productId="42" quantity={1} disabled={false} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith(
        'Error de pagament',
        'No es pot configurar Stripe',
      ),
    );
    expect(mockPresentPaymentSheet).not.toHaveBeenCalled();
  });

  it('silently handles a cancelled payment and permits retry', async () => {
    mockPresentPaymentSheet.mockResolvedValueOnce({
      error: { code: 'Canceled', message: 'Cancelled' },
    });
    const screen = render(
      <CheckoutForm productId="42" quantity={1} disabled={false} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() => expect(mockPresentPaymentSheet).toHaveBeenCalled());
    expect(mockAlert).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Comprar' })).toBeEnabled();
  });

  it('reports a non-cancelled Stripe payment error and permits retry', async () => {
    mockPresentPaymentSheet.mockResolvedValueOnce({
      error: { code: 'Failed', message: 'La targeta ha estat rebutjada' },
    });
    const screen = render(
      <CheckoutForm productId="42" quantity={1} disabled={false} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith(
        'Pagament no completat',
        'La targeta ha estat rebutjada',
      ),
    );
    expect(screen.getByRole('button', { name: 'Comprar' })).toBeEnabled();
  });

  it('ignores a second press while the payment is being prepared', async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const screen = render(
      <CheckoutForm productId="42" quantity={1} disabled={false} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));
    fireEvent.press(
      screen.getByRole('button', { name: 'Preparant pagament...' }),
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);

    resolveFetch?.({
      ok: true,
      json: async () => paymentResponse,
    } as Response);
    await waitFor(() => expect(mockPresentPaymentSheet).toHaveBeenCalled());
  });

  it('handles unexpected non-Error failures with a fallback message', async () => {
    mockFetch.mockRejectedValueOnce('network failure');
    const screen = render(
      <CheckoutForm productId="42" quantity={1} disabled={false} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith(
      'Error de pagament',
      'No s’ha pogut iniciar el pagament.',
    ));
  });
});
