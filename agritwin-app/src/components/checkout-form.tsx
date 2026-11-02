import { router } from 'expo-router';
import CheckoutButton from './checkout-button';

type CheckoutFormProps = {
  productId: string;
  quantity: number;
  disabled: boolean;
};

export default function CheckoutForm({
  productId,
  quantity,
  disabled,
}: CheckoutFormProps) {
  async function openPaymentModal(): Promise<void> {
    try {
      const response = await fetch(
        'http://LA_TEVA_API/api/hosted-checkout-session',
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

      if (!response.ok) {
        throw new Error(`Error en crear el pagament: ${response.status}`);
      }

      const { url } = await response.json();

      if (!url) {
        throw new Error('El servidor no ha retornat cap URL de pagament.');
      }

      router.push(url);
    } catch (error) {
      console.error('Error en iniciar el pagament:', error);
    }
  }

  return (
    <CheckoutButton
      onPress={openPaymentModal}
      title="Checkout"
      disabled={disabled}
    />
  );
}
