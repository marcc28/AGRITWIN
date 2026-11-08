import React from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';

import MarketScreen from '../../../src/app/app/market';

import {
  getcontentfeed,
  getnews,
  searchMarketProducts,
  searchNews,
  getAnuncesCount,
  getMarketProductsCount,
} from '@/services/api_market';

const mockPush = jest.fn();

jest.mock('@/services/api_market', () => ({
  getcontentfeed: jest.fn(),
  getnews: jest.fn(),
  searchMarketProducts: jest.fn(),
  searchNews: jest.fn(),
  getAnuncesCount: jest.fn(),
  getMarketProductsCount: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

const mockProducts = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  product: `Producte ${index + 1}`,
  tecnical_name: `Nom tècnic ${index + 1}`,
  price: 2.5 + index,
  price_per_kg: 1.5 + index,
  left_units: index === 0 ? 0 : 10,
  image_url: `https://example.com/product-${index + 1}.png`,
}));

const mockNews = [
  {
    id: 1,
    title: 'Notícia de prova',
    subtile: 'Subtítol de prova',
    agent: 'Agent de prova',
    content: 'Contingut de la notícia',
    image_url: 'https://example.com/news.png',
  },
];

const setupApiMocks = () => {
  (getMarketProductsCount as jest.Mock).mockResolvedValue(6);
  (getAnuncesCount as jest.Mock).mockResolvedValue(1);

  (getcontentfeed as jest.Mock).mockImplementation(
    (offset: number, limit: number) =>
      Promise.resolve(mockProducts.slice(offset, offset + limit)),
  );
  (getnews as jest.Mock).mockImplementation((offset: number, limit: number) =>
    Promise.resolve(mockNews.slice(offset, offset + limit)),
  );

  (searchMarketProducts as jest.Mock).mockResolvedValue([mockProducts[0]]);
  (searchNews as jest.Mock).mockResolvedValue(mockNews);
};

const renderScreen = () => render(<MarketScreen />);

describe('MarketScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupApiMocks();
  });

  // --------------------------------------------------
  // CÀRREGA INICIAL
  // --------------------------------------------------

  it('mostra el component i carrega les dades inicials', async () => {
    const screen = renderScreen();

    expect(screen.getByTestId('market-screen')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });

    expect(getMarketProductsCount).toHaveBeenCalled();
    expect(getAnuncesCount).toHaveBeenCalled();

    expect(getcontentfeed).toHaveBeenCalledWith(0, 5);
    expect(getnews).toHaveBeenCalledWith(0, 5);
  }, 15000);

  it('mostra el nom i els preus dels productes', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('product-name-1')).toHaveTextContent(
        'Producte 1',
      );
    });

    expect(screen.getByTestId('product-technical-name-1')).toHaveTextContent(
      'Nom tècnic 1',
    );

    expect(screen.getByTestId('product-price-1')).toHaveTextContent('2.50 €');

    expect(screen.getByTestId('product-price-kg-1')).toHaveTextContent(
      '1.50 €/kg',
    );

    expect(screen.getByTestId('product-units-1')).toBeTruthy();
  });

  it('mostra Esgotat quan un producte no té unitats', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('buy-text-1')).toHaveTextContent('Esgotat');
    });

    expect(screen.getByTestId('buy-text-2')).toHaveTextContent('market.buy');
  });

  it('handles image hover for products and news with and without images', async () => {
    (getnews as jest.Mock).mockResolvedValueOnce([
      { ...mockNews[0], image_url: null, url_image: mockNews[0].image_url },
    ]);
    (getcontentfeed as jest.Mock).mockResolvedValueOnce(
      mockProducts.map((product, index) =>
        index === 0
          ? { ...product, image_url: null, url_image: null }
          : index === 1
            ? { ...product, image_url: null, url_image: product.image_url }
            : product,
      ),
    );
    const screen = renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId('product-item-1')).toBeTruthy(),
    );
    fireEvent(screen.getByTestId('product-item-1'), 'hoverIn', {
      nativeEvent: { pageX: 120, pageY: 240 },
    });
    fireEvent(screen.getByTestId('product-item-2'), 'hoverIn', {
      nativeEvent: { pageX: 120, pageY: 240 },
    });
    fireEvent(screen.getByTestId('product-item-2'), 'hoverOut');

    fireEvent.press(screen.getByTestId('market-tab-news'));
    await waitFor(() => expect(screen.getByTestId('news-item-1')).toBeTruthy());
    fireEvent(screen.getByTestId('news-item-1'), 'hoverIn', {
      nativeEvent: { pageX: 140, pageY: 250 },
    });
    fireEvent(screen.getByTestId('news-item-1'), 'hoverOut');
  });

  it('treats whitespace-only input as an empty search', async () => {
    const screen = renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId('product-item-1')).toBeTruthy(),
    );

    fireEvent.changeText(
      screen.getByPlaceholderText('Cerca productes o notícies...'),
      '   ',
    );

    await waitFor(() => {
      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });
    expect(searchMarketProducts).not.toHaveBeenCalled();
  });

  it('shows the searching state while a query is pending', async () => {
    let resolveSearch: ((value: typeof mockProducts) => void) | undefined;
    (searchMarketProducts as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve;
        }),
    );
    const screen = renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId('product-item-1')).toBeTruthy(),
    );

    fireEvent.changeText(
      screen.getByPlaceholderText('Cerca productes o notícies...'),
      'tomata',
    );

    await waitFor(() => expect(screen.getByText('Cercant...')).toBeTruthy());
    await act(async () => resolveSearch?.([mockProducts[0]]));
    await waitFor(() => expect(screen.queryByText('Cercant...')).toBeNull());
  });

  it('ignores market results that arrive after unmount', async () => {
    let resolveProducts: ((value: typeof mockProducts) => void) | undefined;
    (getcontentfeed as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveProducts = resolve;
        }),
    );
    const screen = renderScreen();

    await waitFor(() => expect(getcontentfeed).toHaveBeenCalled());
    screen.unmount();
    await act(async () => resolveProducts?.(mockProducts));

    expect(getnews).toHaveBeenCalledWith(0, 5);
  });

  // --------------------------------------------------
  // NAVEGACIÓ A PRODUCTES
  // --------------------------------------------------

  it('navega al detall quan es prem un producte', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('product-item-1'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/product/[id]',
      params: { id: '1' },
    });
  });

  // --------------------------------------------------
  // PESTANYA DE NOTÍCIES
  // --------------------------------------------------

  it('canvia a la pestanya de notícies', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('market-tab-news'));

    await waitFor(() => {
      expect(screen.getByTestId('news-item-1')).toBeTruthy();
    });

    expect(screen.getByTestId('news-title-1')).toHaveTextContent(
      'Notícia de prova',
    );

    expect(screen.getByTestId('news-subtitle-1')).toHaveTextContent(
      'Subtítol de prova',
    );

    expect(screen.getByTestId('news-content-1')).toHaveTextContent(
      'Contingut de la notícia',
    );
  });

  it('navega al detall quan es prem una notícia', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('market-tab-news'));

    await waitFor(() => {
      expect(screen.getByTestId('news-item-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('news-item-1'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/news/[id]',
      params: { id: '1' },
    });
  });

  // --------------------------------------------------
  // PAGINACIÓ
  // --------------------------------------------------

  it('mostra la paginació quan hi ha més de cinc productes', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('market-page-indicator')).toHaveTextContent(
        '1 / 2',
      );
    });

    expect(screen.getByTestId('market-previous-page')).toBeDisabled();
    expect(screen.getByTestId('market-next-page')).toBeEnabled();
  });

  it('avança a la pàgina següent', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('market-next-page')).toBeEnabled();
    });

    fireEvent.press(screen.getByTestId('market-next-page'));

    await waitFor(() => {
      expect(screen.getByTestId('market-page-indicator')).toHaveTextContent(
        '2 / 2',
      );
    });

    expect(getcontentfeed).toHaveBeenLastCalledWith(5, 5);
    expect(screen.getByTestId('product-item-6')).toBeTruthy();
  });

  it('torna a la pàgina anterior', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('market-next-page')).toBeEnabled();
    });

    fireEvent.press(screen.getByTestId('market-next-page'));

    await waitFor(() => {
      expect(screen.getByTestId('market-page-indicator')).toHaveTextContent(
        '2 / 2',
      );
    });

    fireEvent.press(screen.getByTestId('market-previous-page'));

    await waitFor(() => {
      expect(screen.getByTestId('market-page-indicator')).toHaveTextContent(
        '1 / 2',
      );
    });
  });

  // --------------------------------------------------
  // CERCA DE PRODUCTES
  // --------------------------------------------------

  it("cerca productes quan s'introdueix un text", async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });

    fireEvent.changeText(
      screen.getByPlaceholderText('Cerca productes o notícies...'),
      'tomata',
    );

    await waitFor(
      () => {
        expect(searchMarketProducts).toHaveBeenCalledWith('tomata');
      },
      { timeout: 2000 },
    );

    await waitFor(() => {
      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });
  });

  it('neteja la cerca i recupera tots els productes', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });

    const searchInput = screen.getByPlaceholderText(
      'Cerca productes o notícies...',
    );

    fireEvent.changeText(searchInput, 'tomata');

    await waitFor(() => {
      expect(searchMarketProducts).toHaveBeenCalledWith('tomata');
    });

    fireEvent.press(screen.getByText('×'));

    await waitFor(() => {
      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });
  });

  it('mostra un error si falla la cerca de productes', async () => {
    (searchMarketProducts as jest.Mock).mockRejectedValueOnce(
      new Error('Error de cerca'),
    );

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });

    fireEvent.changeText(
      screen.getByPlaceholderText('Cerca productes o notícies...'),
      'tomata',
    );

    await waitFor(
      () => {
        expect(screen.getByText('Error en realitzar la cerca.')).toBeTruthy();
      },
      { timeout: 2000 },
    );

    consoleSpy.mockRestore();
  });

  // --------------------------------------------------
  // CERCA DE NOTÍCIES
  // --------------------------------------------------

  it('cerca notícies quan la pestanya de notícies està seleccionada', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('market-tab-news'));

    await waitFor(() => {
      expect(screen.getByTestId('news-item-1')).toBeTruthy();
    });

    fireEvent.changeText(
      screen.getByPlaceholderText('Cerca productes o notícies...'),
      'mercat',
    );

    await waitFor(
      () => {
        expect(searchNews).toHaveBeenCalledWith('mercat');
      },
      { timeout: 2000 },
    );
  });

  it('mostra un error si falla la cerca de notícies', async () => {
    (searchNews as jest.Mock).mockRejectedValueOnce(
      new Error('Error de cerca'),
    );

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('market-tab-news'));

    await waitFor(() => {
      expect(screen.getByTestId('news-item-1')).toBeTruthy();
    });

    fireEvent.changeText(
      screen.getByPlaceholderText('Cerca productes o notícies...'),
      'mercat',
    );

    await waitFor(
      () => {
        expect(screen.getByText('Error en realitzar la cerca.')).toBeTruthy();
      },
      { timeout: 2000 },
    );

    consoleSpy.mockRestore();
  });

  // --------------------------------------------------
  // RESULTATS BUITS
  // --------------------------------------------------

  it('mostra un missatge quan no hi ha productes', async () => {
    (getcontentfeed as jest.Mock).mockResolvedValueOnce([]);

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText('No hi ha productes.')).toBeTruthy();
    });
  });

  it('mostra un missatge quan no hi ha notícies', async () => {
    (getnews as jest.Mock).mockResolvedValueOnce([]);

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('market-tab-news'));

    await waitFor(() => {
      expect(screen.getByText('No hi ha notícies.')).toBeTruthy();
    });
  });

  // --------------------------------------------------
  // ERROR EN LA CÀRREGA INICIAL
  // --------------------------------------------------

  it('gestiona un error quan falla la càrrega inicial', async () => {
    (getMarketProductsCount as jest.Mock).mockRejectedValueOnce(
      new Error('Error de connexió'),
    );

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText('No hi ha productes.')).toBeTruthy();
    });

    expect(getcontentfeed).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
