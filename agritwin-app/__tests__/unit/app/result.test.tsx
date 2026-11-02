import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import PaymentResultScreen from '@/app/result';

let mockSessionId: string | undefined;
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ session_id: mockSessionId }),
  useRouter: () => ({ replace: mockReplace }),
}));

describe('PaymentResultScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionId = 'cs_test_123';
  });

  it('shows the returned Stripe session status', async () => {
    const screen = render(<PaymentResultScreen />);

    await waitFor(() => {
      expect(
        screen.getByText("La sessió de pagament s'ha rebut correctament."),
      ).toBeTruthy();
    });
    expect(screen.queryByText('Comprovant el pagament...')).toBeNull();
  });

  it('shows a warning when Stripe did not return a session id', async () => {
    mockSessionId = undefined;
    const screen = render(<PaymentResultScreen />);

    await waitFor(() => {
      expect(
        screen.getByText("No hem rebut l'identificador de la sessió de Stripe."),
      ).toBeTruthy();
    });
  });

  it('returns to the home route', () => {
    const screen = render(<PaymentResultScreen />);

    fireEvent.press(screen.getByText("Tornar a l'inici"));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
