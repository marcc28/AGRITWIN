import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import ProductScreen from '../../../src/app/product/[id]';
import { getMarketProduct } from '@/services/api_market';

const mockBack = jest.fn();
let mockId: string | string[] = '1';

jest.mock('@/services/api_market', () => ({
  getMarketProduct: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
  useLocalSearchParams: () => ({
    id: mockId,
  }),
}));

jest.mock('@/components/checkout-form', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockCheckoutForm(props: any) {
    return (
      <Text testID="checkout-form">
        {`${props.productId}-${props.quantity}-${props.disabled}`}
      </Text>
    );
  };
});

const mockProduct = {
  id: 1,
  product: 'Tomata',
  tecnical_name: 'Solanum lycopersicum',
  price: 2.5,
  price_per_kg: 2.5,
  left_units: 10,
  image_url: 'https://example.com/tomata.png',
};

describe('ProductScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockId = '1';
    (getMarketProduct as jest.Mock).mockResolvedValue(mockProduct);
  });

  it('carrega i mostra un producte', async () => {
    const screen = render(<ProductScreen />);

    expect(screen.getByText('Carregant producte...')).toBeTruthy();

    await waitFor(
      () => {
        expect(screen.getByText('Tomata')).toBeTruthy();
      },
      { timeout: 5000 },
    );

    expect(getMarketProduct).toHaveBeenCalledWith('1');
    expect(screen.getByText('Solanum lycopersicum')).toBeTruthy();
    expect(screen.getAllByText('2,50 €')).toHaveLength(2);
    expect(screen.getByText('10 disponibles')).toBeTruthy();
  });

  it('mostra la imatge del producte', async () => {
    const screen = render(<ProductScreen />);

    await waitFor(() => {
      expect(screen.getByLabelText('Imatge de Tomata')).toBeTruthy();
    });
  });

  it('no mostra imatge quan el producte no en té', async () => {
    (getMarketProduct as jest.Mock).mockResolvedValueOnce({
      ...mockProduct,
      image_url: null,
    });

    const screen = render(<ProductScreen />);

    await waitFor(() => {
      expect(screen.getByText('Tomata')).toBeTruthy();
    });

    expect(screen.queryByLabelText('Imatge de Tomata')).toBeNull();
  });

  it('incrementa la quantitat', async () => {
    const screen = render(<ProductScreen />);

    await waitFor(() => {
      expect(screen.getByText('Tomata')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Augmentar quantitat'));

    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('5,00 €')).toBeTruthy();
    expect(screen.getByTestId('checkout-form')).toHaveTextContent('1-2-false');
  });

  it('decrementa la quantitat', async () => {
    const screen = render(<ProductScreen />);

    await waitFor(() => {
      expect(screen.getByText('Tomata')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Augmentar quantitat'));
    fireEvent.press(screen.getByLabelText('Reduir quantitat'));

    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getAllByText('2,50 €')).toHaveLength(2);
  });

  it('no permet baixar de la quantitat mínima', async () => {
    const screen = render(<ProductScreen />);

    await waitFor(() => {
      expect(screen.getByText('Tomata')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Reduir quantitat'));

    expect(screen.getByText('1')).toBeTruthy();
  });

  it('no permet superar les unitats disponibles', async () => {
    (getMarketProduct as jest.Mock).mockResolvedValueOnce({
      ...mockProduct,
      left_units: 1,
    });

    const screen = render(<ProductScreen />);

    await waitFor(() => {
      expect(screen.getByText('Tomata')).toBeTruthy();
    });

    expect(screen.getByLabelText('Augmentar quantitat')).toBeDisabled();
  });

  it('mostra el missatge de producte sense estoc', async () => {
    (getMarketProduct as jest.Mock).mockResolvedValueOnce({
      ...mockProduct,
      left_units: 0,
    });

    const screen = render(<ProductScreen />);

    await waitFor(() => {
      expect(screen.getByText('Sense estoc')).toBeTruthy();
    });

    expect(screen.getByText('Actualment no disponible')).toBeTruthy();

    expect(screen.getByTestId('checkout-form')).toHaveTextContent('1-1-true');

    expect(screen.getByLabelText('Augmentar quantitat')).toBeDisabled();
  });

  it('mostra un error quan falla la càrrega', async () => {
    (getMarketProduct as jest.Mock).mockRejectedValueOnce(
      new Error('Producte no trobat'),
    );

    const screen = render(<ProductScreen />);

    await waitFor(() => {
      expect(screen.getByText('Producte no disponible')).toBeTruthy();
      expect(screen.getByText('Producte no trobat')).toBeTruthy();
    });
  });

  it('mostra el missatge per defecte si lerror no és una instància dError', async () => {
    (getMarketProduct as jest.Mock).mockRejectedValueOnce('Error desconegut');

    const screen = render(<ProductScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('No s’ha pogut carregar el producte.'),
      ).toBeTruthy();
    });
  });

  it('mostra un error quan no hi ha cap id', async () => {
    mockId = '';

    const screen = render(<ProductScreen />);

    await waitFor(() => {
      expect(screen.getByText('No s’ha indicat cap producte.')).toBeTruthy();
    });

    expect(getMarketProduct).not.toHaveBeenCalled();
  });

  it('accepta un id en format array', async () => {
    mockId = ['25', '26'];

    render(<ProductScreen />);

    await waitFor(() => {
      expect(getMarketProduct).toHaveBeenCalledWith('25');
    });
  });

  it('torna enrere quan el producte no està disponible', async () => {
    (getMarketProduct as jest.Mock).mockRejectedValueOnce(new Error('Error'));

    const screen = render(<ProductScreen />);

    await waitFor(() => {
      expect(screen.getByText('Producte no disponible')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Tornar a la pantalla anterior'));

    expect(mockBack).toHaveBeenCalled();
  });

  it('mostra el missatge per defecte si el producte és null', async () => {
    (getMarketProduct as jest.Mock).mockResolvedValueOnce(null);

    const screen = render(<ProductScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('No s’han pogut carregar les dades del producte.'),
      ).toBeTruthy();
    });
  });
});
