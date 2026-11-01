import { Alert } from 'react-native';
import { useState } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
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
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  async function openPaymentSheet(): Promise<void> {
    if (disabled || loading) return;

    const apiUrl = process.env.EXPO_PUBLIC_API_URL;

    if (!apiUrl) {
      Alert.alert('Error', 'Falta configurar l’URL de l’API.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/v1/payments/payment-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = data.detail ?? data.message;
        throw new Error(
          typeof detail === 'string'
            ? detail
            : `Error del servidor: HTTP ${response.status}`,
        );
      }
      const { paymentIntent, ephemeralKey, customer } = data;

      if (!paymentIntent || !ephemeralKey || !customer) {
        throw new Error('La resposta del servidor és incompleta.');
      }

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'AgriTwin',
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        returnURL: 'agritwin://stripe-redirect',
      });

      if (initError) {
        throw new Error(initError.message);
      }

      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          Alert.alert('Pagament no completat', paymentError.message);
        }
        return;
      }

      Alert.alert(
        'Pagament enviat',
        'Stripe ha completat el flux de pagament. La confirmació definitiva de la comanda arribarà del servidor.',
      );
    } catch (error) {
      Alert.alert(
        'Error de pagament',
        error instanceof Error
          ? error.message
          : 'No s’ha pogut iniciar el pagament.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <CheckoutButton
      onPress={openPaymentSheet}
      disabled={disabled || loading}
      title={loading ? 'Preparant pagament...' : 'Comprar'}
    />
  );
}
