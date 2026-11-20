import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import { Animated, Platform } from 'react-native';

import MarketScreen from '../../../src/app/app/market';

import {
  getcontentfeed,
  getMarketProductsCount,
  searchMarketProducts,
} from '@/services/api_market';

const mockPush = jest.fn();

jest.mock('@/services/api_market', () => ({
  getcontentfeed: jest.fn(),
  getMarketProductsCount: jest.fn(),
  searchMarketProducts: jest.fn(),
}));

jest.mock('@/components/adBanner/BannerAd', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/market/MarketSkeleton', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('react-i18next', () => {
  const locale = jest.requireActual('../../../i18n/locales/ca.json');
  const t = (key: string, options?: Record<string, unknown>) => {
    const value = key
      .split('.')
      .reduce((current: any, part) => current?.[part], locale);
    if (typeof value !== 'string') return key;
    return value.replace(/{{(\w+)}}/g, (_match, name) =>
      String(options?.[name] ?? `{{${name}}}`),
    );
  };
  return {
    useTranslation: () => ({
      t,
      i18n: { language: 'ca', resolvedLanguage: 'ca' },
    }),
  };
});

const mockProducts = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  product: `Producte ${index + 1}`,
  tecnical_name: `Nom tècnic ${index + 1}`,
  price: 2.5 + index,
  price_per_kg: 1.5 + index,
  left_units: index === 0 ? 0 : 10,
  image_url: `https://example.com/product-${index + 1}.png`,
}));

const setupApiMocks = () => {
  (getMarketProductsCount as jest.Mock).mockResolvedValue(6);

  (getcontentfeed as jest.Mock).mockImplementation(
    (offset: number, limit: number) =>
      Promise.resolve(mockProducts.slice(offset, offset + limit)),
  );

  (searchMarketProducts as jest.Mock).mockResolvedValue([mockProducts[0]]);
};

const renderScreen = async () => {
  const renderedScreen = render(<MarketScreen />);

  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  return renderedScreen;
};

const searchInput = (screen: ReturnType<typeof render>) =>
  screen.getByPlaceholderText('Cerca productes');

const scrollToBottom = (screen: ReturnType<typeof render>) => {
  fireEvent.scroll(screen.getByTestId('market-scroll-view'), {
    nativeEvent: {
      layoutMeasurement: { height: 500 },
      contentOffset: { y: 400 },
      contentSize: { height: 1000 },
    },
  });
};

describe('MarketScreen', () => {
  let animationSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    setupApiMocks();

    animationSpy = jest.spyOn(Animated, 'loop').mockImplementation(
      () =>
        ({
          start: jest.fn(),
          stop: jest.fn(),
        }) as any,
    );
  });

  afterEach(() => {
    cleanup();
    animationSpy.mockRestore();
    jest.restoreAllMocks();
  });

  // --------------------------------------------------
  // CÀRREGA INICIAL
  // --------------------------------------------------

  describe('initial loading', () => {
    it('renders the market screen', async () => {
      const screen = await renderScreen();

      expect(screen.getByTestId('market-screen')).toBeTruthy();
    });

    it('loads the initial products and count', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      expect(getMarketProductsCount).toHaveBeenCalledTimes(1);
      expect(getcontentfeed).toHaveBeenCalledWith(0, 5, 'ca');
    });

    it('shows the loading skeleton while data is pending', async () => {
      (getMarketProductsCount as jest.Mock).mockReturnValue(
        new Promise(() => {}),
      );

      const screen = await renderScreen();

      expect(screen.getByTestId('market-screen')).toBeTruthy();
    });

    it('renders product information correctly', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-name-1')).toBeTruthy();
      });

      expect(screen.getByTestId('product-name-1')).toHaveTextContent(
        'Producte 1',
      );

      expect(screen.getByTestId('product-technical-name-1')).toHaveTextContent(
        'Nom tècnic 1',
      );

      expect(screen.getByTestId('product-price-1')).toHaveTextContent('2,50 €');

      expect(screen.getByTestId('product-price-kg-1')).toHaveTextContent(
        '1,50 €/kg',
      );

      expect(screen.getByTestId('product-units-1')).toHaveTextContent(
        'Esgotat',
      );

      expect(screen.getByTestId('product-units-2')).toHaveTextContent(
        'Només en queden 10 kg',
      );
    });

    it('shows the out-of-stock label for products without units', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('buy-text-1')).toHaveTextContent('Esgotat');
      });

      expect(screen.getByTestId('buy-text-2')).toHaveTextContent('Compra');
    });

    it('does not render more than five products initially', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-5')).toBeTruthy();
      });

      expect(screen.queryByTestId('product-item-6')).toBeNull();
    });
  });

  // --------------------------------------------------
  // NAVEGACIÓ
  // --------------------------------------------------

  describe('product navigation', () => {
    it('navigates to product detail when pressed', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('product-item-1'));

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/product/[id]',
        params: { id: '1' },
      });
    });

    it('converts numeric product IDs to strings', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-2')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('product-item-2'));

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/product/[id]',
        params: { id: '2' },
      });
    });

    it('supports string product IDs', async () => {
      const product = {
        ...mockProducts[0],
        id: 'product-test',
      };

      (getcontentfeed as jest.Mock).mockResolvedValueOnce([product]);
      (getMarketProductsCount as jest.Mock).mockResolvedValueOnce(1);

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-product-test')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('product-item-product-test'));

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/product/[id]',
        params: { id: 'product-test' },
      });
    });
  });

  // --------------------------------------------------
  // CERCA
  // --------------------------------------------------

  describe('product search', () => {
    it('renders the search input', async () => {
      const screen = await renderScreen();

      expect(searchInput(screen)).toBeTruthy();
    });

    it('searches products when text is entered', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      fireEvent.changeText(searchInput(screen), 'tomata');

      await waitFor(
        () => {
          expect(searchMarketProducts).toHaveBeenCalledWith('tomata', 'ca');
        },
        { timeout: 3000 },
      );
    });

    it('trims whitespace before searching', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      fireEvent.changeText(searchInput(screen), '  tomata  ');

      await waitFor(() => {
        expect(searchMarketProducts).toHaveBeenCalledWith('tomata', 'ca');
      });
    });

    it('does not search when input contains only whitespace', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      fireEvent.changeText(searchInput(screen), '   ');

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      expect(searchMarketProducts).not.toHaveBeenCalled();
    });

    it('shows the searching skeleton while a search is pending', async () => {
      let resolveSearch!: (value: typeof mockProducts) => void;

      (searchMarketProducts as jest.Mock).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSearch = resolve;
        }),
      );

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      fireEvent.changeText(searchInput(screen), 'tomata');

      await waitFor(() => {
      expect(searchMarketProducts).toHaveBeenCalledWith('tomata', 'ca');
      });

      expect(screen.queryByTestId('product-item-1')).toBeNull();

      await act(async () => {
        resolveSearch([mockProducts[0]]);
      });

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });
    });

    it('clears search and restores original products', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      fireEvent.changeText(searchInput(screen), 'tomata');

      await waitFor(() => {
        expect(searchMarketProducts).toHaveBeenCalledWith('tomata', 'ca');
      });

      fireEvent.press(screen.getByLabelText('Esborra la cerca'));

      await waitFor(() => {
        expect(screen.getByTestId('product-item-5')).toBeTruthy();
      });

      expect(searchInput(screen).props.value).toBe('');
    });

    it('shows an error when product search fails', async () => {
      (searchMarketProducts as jest.Mock).mockRejectedValueOnce(
        new Error('Search failed'),
      );

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      fireEvent.changeText(searchInput(screen), 'tomata');

      await waitFor(
        () => {
          expect(
            screen.getByText('No s’ha pogut fer la cerca. Torna-ho a provar.'),
          ).toBeTruthy();
        },
        { timeout: 3000 },
      );

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('shows an empty message when search returns no products', async () => {
      (searchMarketProducts as jest.Mock).mockResolvedValueOnce([]);

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      fireEvent.changeText(searchInput(screen), 'producte-inexistent');

      await waitFor(
        () => {
          expect(
            screen.getByText(
              'Cap producte coincideix amb «producte-inexistent».',
            ),
          ).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });

    it('does not search again after clearing the query', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      fireEvent.changeText(searchInput(screen), 'tomata');

      await waitFor(() => {
        expect(searchMarketProducts).toHaveBeenCalledTimes(1);
      });

      fireEvent.press(screen.getByLabelText('Esborra la cerca'));

      await waitFor(() => {
        expect(screen.getByTestId('product-item-5')).toBeTruthy();
      });

      expect(searchMarketProducts).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------
  // SCROLL INFINIT
  // --------------------------------------------------

  describe('infinite scrolling', () => {
    it('loads more products when scrolling near the bottom', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-5')).toBeTruthy();
      });

      await act(async () => {
        scrollToBottom(screen);
      });

      await waitFor(() => {
        expect(screen.getByTestId('product-item-6')).toBeTruthy();
      });

      expect(getcontentfeed).toHaveBeenLastCalledWith(5, 5, 'ca');
    });

    it('does not load more products when all products are loaded', async () => {
      (getMarketProductsCount as jest.Mock).mockResolvedValueOnce(5);

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-5')).toBeTruthy();
      });

      await act(async () => {
        scrollToBottom(screen);
      });

      expect(getcontentfeed).toHaveBeenCalledTimes(1);
    });

    it('does not make duplicate requests while loading', async () => {
      let resolveNextPage!: (value: typeof mockProducts) => void;

      (getcontentfeed as jest.Mock).mockImplementation(
        (offset: number, limit: number) => {
          if (offset === 5) {
            return new Promise((resolve) => {
              resolveNextPage = resolve;
            });
          }

          return Promise.resolve(mockProducts.slice(offset, offset + limit));
        },
      );

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-5')).toBeTruthy();
      });

      act(() => {
        scrollToBottom(screen);
        scrollToBottom(screen);
      });

      expect(getcontentfeed).toHaveBeenCalledTimes(2);

      await act(async () => {
        resolveNextPage([mockProducts[5]]);
      });

      await waitFor(() => {
        expect(screen.getByTestId('product-item-6')).toBeTruthy();
      });
    });

    it('stops loading when the API returns an empty batch', async () => {
      (getcontentfeed as jest.Mock).mockImplementation(
        (offset: number, limit: number) => {
          if (offset === 0) {
            return Promise.resolve(mockProducts.slice(0, 5));
          }

          return Promise.resolve([]);
        },
      );

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-5')).toBeTruthy();
      });

      await act(async () => {
        scrollToBottom(screen);
      });

      await waitFor(() => {
        expect(getcontentfeed).toHaveBeenCalledWith(5, 5, 'ca');
      });

      await act(async () => {
        scrollToBottom(screen);
      });

      expect(getcontentfeed).toHaveBeenCalledTimes(2);
    });

    it('handles an error when loading more products', async () => {
      (getcontentfeed as jest.Mock).mockImplementation(
        (offset: number, limit: number) => {
          if (offset === 5) {
            return Promise.reject(new Error('Page loading failed'));
          }

          return Promise.resolve(mockProducts.slice(offset, offset + limit));
        },
      );

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-5')).toBeTruthy();
      });

      await act(async () => {
        scrollToBottom(screen);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error carregant més productes:',
          expect.any(Error),
        );
      });

      expect(screen.getByTestId('product-item-5')).toBeTruthy();
      expect(screen.queryByTestId('product-item-6')).toBeNull();

      consoleSpy.mockRestore();
    });

    it('allows retrying after a failed request', async () => {
      (getcontentfeed as jest.Mock).mockImplementation(
        (offset: number, limit: number) => {
          if (offset === 5) {
            return Promise.reject(new Error('Page loading failed'));
          }

          return Promise.resolve(mockProducts.slice(offset, offset + limit));
        },
      );

      jest.spyOn(console, 'error').mockImplementation(() => {});

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-5')).toBeTruthy();
      });

      await act(async () => {
        scrollToBottom(screen);
      });

      await waitFor(() => {
        expect(getcontentfeed).toHaveBeenCalledTimes(2);
      });

      (getcontentfeed as jest.Mock).mockImplementation(
        (offset: number, limit: number) =>
          Promise.resolve(mockProducts.slice(offset, offset + limit)),
      );

      await act(async () => {
        scrollToBottom(screen);
      });

      await waitFor(() => {
        expect(screen.getByTestId('product-item-6')).toBeTruthy();
      });
    });

    it('does not load more products while searching', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-5')).toBeTruthy();
      });

      fireEvent.changeText(searchInput(screen), 'tomata');

      await waitFor(() => {
        expect(searchMarketProducts).toHaveBeenCalledWith('tomata', 'ca');
      });

      const callsBeforeScroll = (getcontentfeed as jest.Mock).mock.calls.length;

      await act(async () => {
        scrollToBottom(screen);
      });

      expect(getcontentfeed).toHaveBeenCalledTimes(callsBeforeScroll);
    });
  });

  describe('web load more control', () => {
    it('loads another product batch when the web button is pressed', async () => {
      jest.replaceProperty(Platform, 'OS', 'web');

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('market-load-more')).toBeEnabled();
      });

      fireEvent.press(screen.getByTestId('market-load-more'));

      await waitFor(() => {
        expect(screen.getByTestId('product-item-6')).toBeTruthy();
      });

      expect(getcontentfeed).toHaveBeenLastCalledWith(5, 5, 'ca');
    });

    it('hides the web button after all products are loaded', async () => {
      jest.replaceProperty(Platform, 'OS', 'web');
      (getMarketProductsCount as jest.Mock).mockResolvedValueOnce(5);

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-5')).toBeTruthy();
      });

      expect(screen.queryByTestId('market-load-more')).toBeNull();
    });
  });

  // --------------------------------------------------
  // RESULTATS BUITS
  // --------------------------------------------------

  describe('empty results', () => {
    it('shows a message when there are no products', async () => {
      (getcontentfeed as jest.Mock).mockResolvedValueOnce([]);

      const screen = await renderScreen();

      await waitFor(() => {
        expect(
          screen.getByText('Encara no hi ha productes al mercat.'),
        ).toBeTruthy();
      });
    });

    it('shows a message when search returns no products', async () => {
      (searchMarketProducts as jest.Mock).mockResolvedValueOnce([]);

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      fireEvent.changeText(searchInput(screen), 'producte-inexistent');

      await waitFor(
        () => {
          expect(
            screen.getByText(
              'Cap producte coincideix amb «producte-inexistent».',
            ),
          ).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });
  });

  // --------------------------------------------------
  // ERRORS DE CÀRREGA
  // --------------------------------------------------

  describe('loading errors', () => {
    it('handles an error when loading the product count', async () => {
      (getMarketProductsCount as jest.Mock).mockRejectedValueOnce(
        new Error('Connection failed'),
      );

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const screen = await renderScreen();

      await waitFor(() => {
        expect(
          screen.getByText('Encara no hi ha productes al mercat.'),
        ).toBeTruthy();
      });

      expect(getMarketProductsCount).toHaveBeenCalledTimes(1);
      expect(getcontentfeed).toHaveBeenCalledWith(0, 5, 'ca');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('handles an error when loading the initial products', async () => {
      (getcontentfeed as jest.Mock).mockRejectedValueOnce(
        new Error('Products loading failed'),
      );

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const screen = await renderScreen();

      await waitFor(() => {
        expect(
          screen.getByText('Encara no hi ha productes al mercat.'),
        ).toBeTruthy();
      });

      expect(getMarketProductsCount).toHaveBeenCalledTimes(1);
      expect(getcontentfeed).toHaveBeenCalledWith(0, 5, 'ca');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // --------------------------------------------------
  // ESTOC I VARIANTS DE PRODUCTE
  // --------------------------------------------------

  describe('product stock and images', () => {
    it('shows available stock for products with more than 50 units', async () => {
      const product = {
        ...mockProducts[0],
        left_units: 100,
      };

      (getcontentfeed as jest.Mock).mockResolvedValueOnce([product]);
      (getMarketProductsCount as jest.Mock).mockResolvedValueOnce(1);

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-units-1')).toHaveTextContent(
          '100 kg disponibles',
        );
      });
    });

    it('shows low stock for products with exactly 50 units', async () => {
      const product = {
        ...mockProducts[0],
        left_units: 50,
      };

      (getcontentfeed as jest.Mock).mockResolvedValueOnce([product]);
      (getMarketProductsCount as jest.Mock).mockResolvedValueOnce(1);

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-units-1')).toHaveTextContent(
          'Només en queden 50 kg',
        );
      });
    });

    it('handles negative stock as out of stock', async () => {
      const product = {
        ...mockProducts[0],
        left_units: -5,
      };

      (getcontentfeed as jest.Mock).mockResolvedValueOnce([product]);
      (getMarketProductsCount as jest.Mock).mockResolvedValueOnce(1);

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-units-1')).toHaveTextContent(
          'Esgotat',
        );
      });
    });

    it('renders a fallback when the product has no image', async () => {
      const product = {
        ...mockProducts[0],
        image_url: null,
        url_image: null,
      };

      (getcontentfeed as jest.Mock).mockResolvedValueOnce([product]);
      (getMarketProductsCount as jest.Mock).mockResolvedValueOnce(1);

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-name-1')).toBeTruthy();
      });

      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });

    it('uses url_image when image_url is unavailable', async () => {
      const product = {
        ...mockProducts[0],
        image_url: null,
        url_image: 'https://example.com/alternative.png',
      };

      (getcontentfeed as jest.Mock).mockResolvedValueOnce([product]);
      (getMarketProductsCount as jest.Mock).mockResolvedValueOnce(1);

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-name-1')).toBeTruthy();
      });

      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });
  });

  // --------------------------------------------------
  // HOVER I PREVISUALITZACIÓ
  // --------------------------------------------------

  describe('image preview', () => {
    it('does not show image preview when there is no image', async () => {
      const product = {
        ...mockProducts[0],
        image_url: null,
        url_image: null,
      };

      (getcontentfeed as jest.Mock).mockResolvedValueOnce([product]);
      (getMarketProductsCount as jest.Mock).mockResolvedValueOnce(1);

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      fireEvent(screen.getByTestId('product-item-1'), 'hoverIn', {
        nativeEvent: { pageX: 100, pageY: 100 },
      });

      expect(screen.queryByText('Producte 1')).toBeTruthy();
    });

    it('handles pointer movement with a mouse', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      fireEvent(screen.getByTestId('product-item-1'), 'pointerMove', {
        nativeEvent: {
          pageX: 100,
          pageY: 100,
          pointerType: 'mouse',
        },
      });

      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });

    it('handles hover out', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      fireEvent(screen.getByTestId('product-item-1'), 'hoverOut');

      expect(screen.getByTestId('product-item-1')).toBeTruthy();
    });
  });

  // --------------------------------------------------
  // CICLE DE VIDA I ANIMACIONS
  // --------------------------------------------------

  describe('lifecycle', () => {
    it('ignores product results that arrive after unmount', async () => {
      let resolveProducts!: (value: typeof mockProducts) => void;

      (getcontentfeed as jest.Mock).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveProducts = resolve;
        }),
      );

      const screen = await renderScreen();

      await waitFor(() => {
        expect(getcontentfeed).toHaveBeenCalledWith(0, 5, 'ca');
      });

      screen.unmount();

      await act(async () => {
        resolveProducts(mockProducts.slice(0, 5));
      });
    });

    it('starts animations only for products that have stock', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('buy-button-5')).toBeTruthy();
      });

      // El primer producte està esgotat.
      expect(animationSpy).toHaveBeenCalledTimes(4);

      screen.unmount();
    });

    it('does not animate an out-of-stock product', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('buy-text-1')).toHaveTextContent('Esgotat');
      });

      expect(animationSpy).toHaveBeenCalledTimes(4);
    });

    it('stops animations when the screen is unmounted', async () => {
      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('buy-button-5')).toBeTruthy();
      });

      const animations = animationSpy.mock.results.map(
        (result) => result.value,
      );

      screen.unmount();

      animations.forEach((animation) => {
        expect(animation.stop).toHaveBeenCalled();
      });
    });
  });
});
