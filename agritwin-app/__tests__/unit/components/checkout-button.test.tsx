import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import CheckoutButton from '@/components/checkout-button';

it('calls its action and uses the optional enabled/disabled state', () => {
  const onPress = jest.fn();
  const screen = render(<CheckoutButton onPress={onPress} title="Pay now" />);

  fireEvent.press(screen.getByRole('button', { name: 'Pay now' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Pay now' })).toBeEnabled();

  screen.rerender(
    <CheckoutButton onPress={onPress} title="Pay now" disabled />,
  );
  expect(screen.getByRole('button', { name: 'Pay now' })).toBeDisabled();
});
