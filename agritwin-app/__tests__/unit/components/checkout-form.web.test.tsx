import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import CheckoutForm from '@/components/checkout-form.web';

const mockFetch = jest.fn();
const mockAlert = jest.fn();
const mockAssign = jest.fn();

describe('CheckoutForm web (Stripe Hosted Checkout)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
    global.fetch = mockFetch as typeof fetch;
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: { alert: mockAlert, location: { assign: mockAssign } },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/session' }),
    });
  });

  it('requests a hosted Stripe session and redirects to the returned URL', async () => {
    const screen = render(<CheckoutForm productId="42" quantity={2} />);

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() =>
      expect(mockAssign).toHaveBeenCalledWith(
        'https://checkout.stripe.com/session',
      ),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/payments/checkout-session',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ productId: '42', quantity: 2 }),
      }),
    );
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('reports a failed checkout session response and allows retry', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Producte no disponible' }),
    });
    const screen = render(<CheckoutForm productId="42" quantity={1} />);

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith('Producte no disponible'),
    );
    expect(screen.getByRole('button', { name: 'Comprar' })).toBeEnabled();
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it('uses the API message when detail is not text', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        detail: { error: 'bad' },
        message: 'Comanda invàlida',
      }),
    });
    const screen = render(<CheckoutForm productId="42" quantity={1} />);

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith('Comanda invàlida'),
    );
  });

  it('uses an HTTP status when the API provides no error message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    const screen = render(<CheckoutForm productId="42" quantity={1} />);

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith('Error HTTP 503'),
    );
  });

  it('does not redirect when the server omits the checkout URL', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const screen = render(<CheckoutForm productId="42" quantity={1} />);

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith(
        "El servidor no ha retornat l'URL de Stripe.",
      ),
    );
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it('reports missing API configuration without requesting a session', async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    const screen = render(<CheckoutForm productId="42" quantity={1} />);

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith(
        "Falta configurar l'URL de l'API.",
      ),
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('normalizes an API URL with a trailing slash', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com/';
    const screen = render(<CheckoutForm productId="42" quantity={1} />);

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() => expect(mockAssign).toHaveBeenCalled());
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/payments/checkout-session',
      expect.any(Object),
    );
  });

  it('reports network errors and allows retry', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connexió rebutjada'));
    const screen = render(<CheckoutForm productId="42" quantity={1} />);

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));

    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith('Connexió rebutjada'),
    );
    expect(screen.getByRole('button', { name: 'Comprar' })).toBeEnabled();
  });

  it('uses a fallback for unexpected failures and honors disabled state', async () => {
    mockFetch.mockRejectedValueOnce('network failure');
    const screen = render(
      <CheckoutForm productId="42" quantity={1} disabled={false} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));
    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith(
        "No s'ha pogut iniciar el pagament.",
      ),
    );

    screen.rerender(<CheckoutForm productId="42" quantity={1} disabled />);
    fireEvent.press(screen.getByRole('button', { name: 'Comprar' }));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
