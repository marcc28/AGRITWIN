import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import { Animated } from 'react-native';

import MarketScreen from '../../../src/app/app/market';

import {
  getcontentfeed,
  getAnuncesCount,
  getMarketProductsCount,
  searchMarketProducts,
} from '@/services/api_market';

const mockPush = jest.fn();

jest.mock('@/services/api_market', () => ({
  getcontentfeed: jest.fn(),
  getAnuncesCount: jest.fn(),
  getMarketProductsCount: jest.fn(),
  searchMarketProducts: jest.fn(),
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

const setupApiMocks = () => {
  (getMarketProductsCount as jest.Mock).mockResolvedValue(6);
  (getAnuncesCount as jest.Mock).mockResolvedValue(0);

  (getcontentfeed as jest.Mock).mockImplementation(
    (offset: number, limit: number) =>
      Promise.resolve(mockProducts.slice(offset, offset + limit)),
  );

  (searchMarketProducts as jest.Mock).mockResolvedValue([mockProducts[0]]);
};

const renderScreen = () => render(<MarketScreen />);

describe('MarketScreen', () => {
  let animationSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    setupApiMocks();

    // Evitem executar animacions infinites durant els tests.
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
    it('renders the market screen', () => {
      const screen = renderScreen();

      expect(screen.getByTestId('market-screen')).toBeTruthy();
    });

    it('loads the initial products and counts', async () => {
      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      expect(getMarketProductsCount).toHaveBeenCalledTimes(1);
      expect(getAnuncesCount).toHaveBeenCalledTimes(1);

      expect(getcontentfeed).toHaveBeenCalledWith(0, 5);
    });

    it('shows the initial loading message', () => {
      let resolveCount!: (value: number) => void;

      (getMarketProductsCount as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          resolveCount = resolve;
        }),
      );

      const screen = renderScreen();

      expect(screen.getByText('Carregant...')).toBeTruthy();

      act(() => {
        resolveCount(6);
      });
    });

    it('renders the product information correctly', async () => {
      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-name-1')).toBeTruthy();
      });

      expect(screen.getByTestId('product-name-1')).toHaveTextContent(
        'Producte 1',
      );

      expect(screen.getByTestId('product-technical-name-1')).toHaveTextContent(
        'Nom tècnic 1',
      );

      expect(screen.getByTestId('product-price-1')).toHaveTextContent('2.50 €');

      expect(screen.getByTestId('product-price-kg-1')).toHaveTextContent(
        '1.50 €/kg',
      );

      expect(screen.getByTestId('product-units-1')).toHaveTextContent(
        '0.00 market.units',
      );
    });

    it('shows out of stock for products without units', async () => {
      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('buy-text-1')).toHaveTextContent('Esgotat');
      });

      expect(screen.getByTestId('buy-text-2')).toHaveTextContent('market.buy');
    });

    it('does not show more than five products initially', async () => {
      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-5')).toBeTruthy();
      });

      expect(screen.queryByTestId('product-item-6')).toBeNull();
    });
  });

  // --------------------------------------------------
  // NAVEGACIÓ A PRODUCTES
  // --------------------------------------------------

  describe('product navigation', () => {
    it('navigates to the product detail when pressed', async () => {
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

    it('converts numeric product IDs to strings', async () => {
      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-2')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('product-item-2'));

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/product/[id]',
        params: { id: '2' },
      });
    });
  });

  // --------------------------------------------------
  // CERCA DE PRODUCTES
  // --------------------------------------------------

  describe('product search', () => {
    it('renders the search input', () => {
      const screen = renderScreen();

      expect(
        screen.getByPlaceholderText('Cerca productes o notícies...'),
      ).toBeTruthy();
    });

    it('searches products when text is entered', async () => {
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
        { timeout: 3000 },
      );

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });
    });

    it('trims whitespace before searching', async () => {
      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      fireEvent.changeText(
        screen.getByPlaceholderText('Cerca productes o notícies...'),
        '  tomata  ',
      );

      await waitFor(() => {
        expect(searchMarketProducts).toHaveBeenCalledWith('tomata');
      });
    });

    it('does not search when the input contains only whitespace', async () => {
      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

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
      let resolveSearch!: (value: typeof mockProducts) => void;

      (searchMarketProducts as jest.Mock).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSearch = resolve;
        }),
      );

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
          expect(screen.getByText('Cercant...')).toBeTruthy();
        },
        { timeout: 3000 },
      );

      await act(async () => {
        resolveSearch([mockProducts[0]]);
      });

      await waitFor(() => {
        expect(screen.queryByText('Cercant...')).toBeNull();
      });
    });

    it('clears the search and restores the original products', async () => {
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
        expect(screen.getByTestId('product-item-5')).toBeTruthy();
      });

      expect(searchInput.props.value).toBe('');
    });

    it('shows an error when product search fails', async () => {
      (searchMarketProducts as jest.Mock).mockRejectedValueOnce(
        new Error('Search failed'),
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
        { timeout: 3000 },
      );

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('shows an empty message when search returns no products', async () => {
      (searchMarketProducts as jest.Mock).mockResolvedValueOnce([]);

      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      fireEvent.changeText(
        screen.getByPlaceholderText('Cerca productes o notícies...'),
        'producte-inexistent',
      );

      await waitFor(
        () => {
          expect(screen.getByText('No hi ha productes.')).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });
  });

  // --------------------------------------------------
  // PAGINACIÓ
  // --------------------------------------------------

  describe('pagination', () => {
    it('shows pagination when there are more than five products', async () => {
      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('market-page-indicator')).toHaveTextContent(
          '1 / 2',
        );
      });

      expect(screen.getByTestId('market-previous-page')).toBeDisabled();
      expect(screen.getByTestId('market-next-page')).toBeEnabled();
    });

    it('loads the next page on demand', async () => {
      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('market-next-page')).toBeEnabled();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('market-next-page'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('market-page-indicator')).toHaveTextContent(
          '2 / 2',
        );
      });

      expect(getcontentfeed).toHaveBeenLastCalledWith(5, 5);
      expect(screen.getByTestId('product-item-6')).toBeTruthy();
    });

    it('returns to the previous page', async () => {
      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('market-next-page')).toBeEnabled();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('market-next-page'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('market-page-indicator')).toHaveTextContent(
          '2 / 2',
        );
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId('market-previous-page'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('market-page-indicator')).toHaveTextContent(
          '1 / 2',
        );
      });
    });

    it('disables the next page button on the last page', async () => {
      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('market-next-page')).toBeEnabled();
      });

      fireEvent.press(screen.getByTestId('market-next-page'));

      await waitFor(() => {
        expect(screen.getByTestId('market-next-page')).toBeDisabled();
      });
    });

    it('does not load a page when the next button is disabled', async () => {
      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('market-next-page')).toBeEnabled();
      });

      fireEvent.press(screen.getByTestId('market-previous-page'));

      expect(getcontentfeed).toHaveBeenCalledTimes(1);
    });

    it('shows an error when loading the next page fails', async () => {
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

      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('market-next-page')).toBeEnabled();
      });

      fireEvent.press(screen.getByTestId('market-next-page'));

      await waitFor(() => {
        expect(
          screen.getByText(
            'No s’han pogut carregar més dades. Torna-ho a provar.',
          ),
        ).toBeTruthy();
      });

      expect(screen.getByTestId('market-page-indicator')).toHaveTextContent(
        '1 / 2',
      );

      consoleSpy.mockRestore();
    });
  });

  // --------------------------------------------------
  // RESULTATS BUITS
  // --------------------------------------------------

  describe('empty results', () => {
    it('shows a message when there are no products', async () => {
      (getcontentfeed as jest.Mock).mockResolvedValueOnce([]);

      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByText('No hi ha productes.')).toBeTruthy();
      });
    });

    it('does not show pagination when there is only one page', async () => {
      (getMarketProductsCount as jest.Mock).mockResolvedValueOnce(2);

      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('product-item-1')).toBeTruthy();
      });

      expect(screen.queryByTestId('market-page-indicator')).toBeNull();
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

      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByText('No hi ha productes.')).toBeTruthy();
      });

      expect(getcontentfeed).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('handles an error when loading the announcement count', async () => {
      (getAnuncesCount as jest.Mock).mockRejectedValueOnce(
        new Error('Announcement count failed'),
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

  // --------------------------------------------------
  // CICLE DE VIDA
  // --------------------------------------------------

  describe('lifecycle', () => {
    it('ignores product results that arrive after unmount', async () => {
      let resolveProducts!: (value: typeof mockProducts) => void;

      (getcontentfeed as jest.Mock).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveProducts = resolve;
        }),
      );

      const screen = renderScreen();

      await waitFor(() => {
        expect(getcontentfeed).toHaveBeenCalledWith(0, 5);
      });

      screen.unmount();

      await act(async () => {
        resolveProducts(mockProducts.slice(0, 5));
      });
    });

    it('starts and stops product button animations', async () => {
      const screen = renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('buy-button-1')).toBeTruthy();
      });

      expect(animationSpy).toHaveBeenCalledTimes(5);

      screen.unmount();

      // Una animació per cada producte visible.
      expect(animationSpy.mock.results.length).toBe(5);
    });
  });
});