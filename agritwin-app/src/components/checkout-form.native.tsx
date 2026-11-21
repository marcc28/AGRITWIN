import { Alert } from 'react-native';
import { useState } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  async function openPaymentSheet(): Promise<void> {
    if (disabled || loading) return;

    const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

    if (!apiUrl) {
      Alert.alert(t('market.checkout.error'), t('market.checkout.missingApi'));
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
        const detail =
          typeof data.detail === 'string'
            ? data.detail
            : typeof data.message === 'string'
              ? data.message
              : null;
        throw new Error(
          detail ?? `Error del servidor: HTTP ${response.status}`,
        );
      }
      const { paymentIntent, ephemeralKey, customer } = data;

      if (!paymentIntent || !ephemeralKey || !customer) {
        throw new Error(t('market.checkout.incompleteResponse'));
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
          Alert.alert(
            t('market.checkout.paymentIncomplete'),
            paymentError.message,
          );
        }
        return;
      }

      Alert.alert(
        t('market.checkout.paymentSent'),
        t('market.checkout.paymentConfirmation'),
      );
    } catch (error) {
      Alert.alert(
        t('market.checkout.error'),
        error instanceof Error
          ? error.message
          : t('market.checkout.startFailed'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <CheckoutButton
      onPress={openPaymentSheet}
      disabled={disabled || loading}
      title={
        loading ? t('market.checkout.preparing') : t('market.checkout.buy')
      }
    />
  );
}
