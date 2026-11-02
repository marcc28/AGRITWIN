import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import ProductHeader from '@/components/product/ProductHeader';
import ProductPrice from '@/components/product/ProductPrice';
import ProductQuantity from '@/components/product/ProductQuantity';
import ProductTotal from '@/components/product/ProductTotal';

const product = {
  id: 3,
  product: 'Tomata',
  tecnical_name: 'Solanum lycopersicum',
  price: 2.5,
  price_per_kg: 2.5,
  left_units: 4,
  image_url: 'https://example.com/tomata.png',
};

describe('product display components', () => {
  it('shows product identity and an optional image', () => {
    const screen = render(<ProductHeader product={product} />);

    expect(screen.getByText('Tomata')).toBeTruthy();
    expect(screen.getByText('Solanum lycopersicum')).toBeTruthy();
    expect(screen.getByLabelText('Imatge de Tomata')).toBeTruthy();

    screen.rerender(<ProductHeader product={{ ...product, image_url: null }} />);
    expect(screen.queryByLabelText('Imatge de Tomata')).toBeNull();
  });

  it('formats price and stock states', () => {
    const screen = render(
      <ProductPrice unitPrice={2.5} available={4} outOfStock={false} />,
    );

    expect(screen.getByText('2,50 €')).toBeTruthy();
    expect(screen.getByText('4 disponibles')).toBeTruthy();

    screen.rerender(
      <ProductPrice unitPrice={2.5} available={0} outOfStock />,
    );
    expect(screen.getByText('Sense estoc')).toBeTruthy();
  });

  it('increments and decrements within stock limits', () => {
    const onChange = jest.fn();
    const screen = render(
      <ProductQuantity
        quantity={2}
        available={3}
        outOfStock={false}
        onChange={onChange}
      />,
    );

    fireEvent.press(screen.getByLabelText('Augmentar quantitat'));
    expect(onChange).toHaveBeenCalledWith(expect.any(Function));
    expect(onChange.mock.calls[0][0](2)).toBe(3);

    fireEvent.press(screen.getByLabelText('Reduir quantitat'));
    expect(onChange.mock.calls[1][0](2)).toBe(1);

    screen.rerender(
      <ProductQuantity
        quantity={1}
        available={0}
        outOfStock
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText('Reduir quantitat')).toBeDisabled();
    expect(screen.getByLabelText('Augmentar quantitat')).toBeDisabled();
  });

  it('shows the order quantity and formatted total', () => {
    const screen = render(
      <ProductTotal quantity={3} unitPrice={2.5} total={7.5} />,
    );

    expect(screen.getByText('3 kg × 2,50 €/kg')).toBeTruthy();
    expect(screen.getByText('7,50 €')).toBeTruthy();
  });
});
