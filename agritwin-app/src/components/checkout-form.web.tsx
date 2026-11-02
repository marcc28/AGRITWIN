import { useState } from 'react';
import CheckoutButton from './checkout-button';

type CheckoutFormProps = {
  productId: string;
  quantity: number;
  disabled?: boolean;
};

export default function CheckoutForm({
  productId,
  quantity,
  disabled = false,
}: CheckoutFormProps) {
  const [loading, setLoading] = useState(false);

  async function openCheckout(): Promise<void> {
    if (disabled || loading) return;

    const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

    if (!apiUrl) {
      window.alert("Falta configurar l'URL de l'API.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${apiUrl}/api/v1/payments/checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId,
            quantity,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const detail =
          typeof data.detail === 'string'
            ? data.detail
            : typeof data.message === 'string'
              ? data.message
              : null;
        throw new Error(
          detail ?? `Error HTTP ${response.status}`,
        );
      }

      if (!data.url) {
        throw new Error("El servidor no ha retornat l'URL de Stripe.");
      }

      // Redirigeix el navegador a Stripe Hosted Checkout.
      window.location.assign(data.url);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "No s'ha pogut iniciar el pagament.",
      );

      setLoading(false);
    }
  }

  return (
    <CheckoutButton
      onPress={openCheckout}
      disabled={disabled || loading}
      title={loading ? 'Obrint Stripe...' : 'Comprar'}
    />
  );
}
