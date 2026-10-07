import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { getcontentfeed, getnews } from '../../../src/services/api';

import MarketScreen from '../../../src/app/app/market';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../../src/services/api', () => ({
  getcontentfeed: jest.fn(),
  getnews: jest.fn(),
}));
async function waitForMarketToLoad() {
  await waitFor(() => {
    expect(mockedGetContentFeed).toHaveBeenCalled();
    expect(mockedGetNews).toHaveBeenCalled();
  });
}

jest.mock('@/constants/theme', () => ({
  Colors: {
    light: {
      background: '#fff',
    },
    dark: {
      background: '#000',
    },
  },
}));

jest.mock('../../../src/styles/market.styles', () => ({
  getMarketStyles: () => ({
    trackWrap: {},
    track: {},
    segment: {},
    segmentOn: {},
    segmentOff: {},
    segmentText: {},
    list: {},
    priceCard: {},
    priceTop: {},
    productName: {},
    detail: {},
    priceMain: {},
    priceValue: {},
    priceBottom: {},
    smallInfo: {},
    buyBtn: {},
    buyText: {},
    chip: {},
    chipText: {},
    newsTitle: {},
    newsBody: {},
    source: {},
  }),
}));

const mockedGetContentFeed = getcontentfeed as jest.MockedFunction<
  typeof getcontentfeed
>;

const mockedGetNews = getnews as jest.MockedFunction<typeof getnews>;

describe('MarketScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the market tabs', async () => {
      mockedGetContentFeed.mockResolvedValue([]);
      mockedGetNews.mockResolvedValue([]);

      render(<MarketScreen />);
      await waitFor(() => {
        expect(mockedGetContentFeed).toHaveBeenCalledWith(0, 10);
        expect(mockedGetNews).toHaveBeenCalledWith(0, 10);
      });
      expect(screen.getByText('market.prices')).toBeTruthy();
      expect(screen.getByText('market.news')).toBeTruthy();
    });

    it('shows prices tab by default', async () => {
      mockedGetContentFeed.mockResolvedValue([
        {
          id: 1,
          product: 'Tomato',
          tecnical_name: 'Solanum lycopersicum',
          price: 2.5,
          price_per_kg: 5,
          left_units: 10,
        },
      ]);

      mockedGetNews.mockResolvedValue([]);

      render(<MarketScreen />);

      await waitFor(() => {
        expect(screen.getByText('Tomato')).toBeTruthy();
      });
      expect(screen.getByText('Solanum lycopersicum')).toBeTruthy();
      expect(screen.getByText('2.50 €')).toBeTruthy();
      expect(screen.getByText('5.00 €/kg')).toBeTruthy();
    });
  });

  describe('data loading', () => {
    it('loads products and news on mount', async () => {
      mockedGetContentFeed.mockResolvedValue([]);
      mockedGetNews.mockResolvedValue([]);

      render(<MarketScreen />);

      await waitFor(() => {
        expect(mockedGetContentFeed).toHaveBeenCalledTimes(1);
        expect(mockedGetNews).toHaveBeenCalledTimes(1);
      });

      expect(mockedGetContentFeed).toHaveBeenCalledWith(0, 10);
      expect(mockedGetNews).toHaveBeenCalledWith(0, 10);
    });

    it('renders multiple products', async () => {
      mockedGetContentFeed.mockResolvedValue([
        {
          id: 1,
          product: 'Tomato',
          tecnical_name: 'Solanum lycopersicum',
          price: 2.5,
          price_per_kg: 5,
          left_units: 10,
        },
        {
          id: 2,
          product: 'Potato',
          tecnical_name: 'Solanum tuberosum',
          price: 1.75,
          price_per_kg: 3.5,
          left_units: 20,
        },
      ]);

      mockedGetNews.mockResolvedValue([]);

      render(<MarketScreen />);

      await waitFor(() => {
        expect(screen.getByText('Tomato')).toBeTruthy();
      });
      expect(screen.getByText('Potato')).toBeTruthy();

      expect(screen.getByText('2.50 €')).toBeTruthy();
      expect(screen.getByText('1.75 €')).toBeTruthy();
    });

    it('renders product information correctly', async () => {
      mockedGetContentFeed.mockResolvedValue([
        {
          id: 1,
          product: 'Tomato',
          tecnical_name: 'Solanum lycopersicum',
          price: 2.5,
          price_per_kg: 5.25,
          left_units: 12.5,
        },
      ]);

      mockedGetNews.mockResolvedValue([]);

      render(<MarketScreen />);
      expect(await screen.findByTestId('product-item-1')).toBeTruthy();
      expect(screen.getByText('Solanum lycopersicum')).toBeTruthy();
      expect(screen.getByText('2.50 €')).toBeTruthy();
      expect(screen.getByText('5.25 €/kg')).toBeTruthy();
      expect(screen.getByText('12.50 market.units')).toBeTruthy();
      expect(screen.getByText('market.buy')).toBeTruthy();
    });
  });

  describe('tab navigation', () => {
    it('shows news when news tab is pressed', async () => {
      mockedGetContentFeed.mockResolvedValue([
        {
          id: 1,
          product: 'Tomato',
          tecnical_name: 'Solanum lycopersicum',
          price: 2.5,
          price_per_kg: 5,
          left_units: 10,
        },
      ]);

      mockedGetNews.mockResolvedValue([
        {
          id: 1,
          title: 'Market update',
          subtile: 'Agriculture',
          agent: 'Market Agency',
          content: 'Prices have increased this week.',
        },
      ]);

      render(<MarketScreen />);

      expect(await screen.findByTestId('product-item-1')).toBeTruthy();

      fireEvent.press(screen.getByTestId('market-tab-news'));

      expect(await screen.findByTestId('news-item-1')).toBeTruthy();

      expect(screen.getByText('Market update')).toBeTruthy();
      expect(screen.getByText('Prices have increased this week.')).toBeTruthy();
      expect(screen.getByText('Agriculture')).toBeTruthy();
      expect(screen.getByText('Market Agency')).toBeTruthy();

      expect(screen.queryByTestId('product-item-1')).toBeNull();
    });

    it('returns to prices when prices tab is pressed', async () => {
      mockedGetContentFeed.mockResolvedValue([
        {
          id: 1,
          product: 'Tomato',
          tecnical_name: 'Solanum lycopersicum',
          price: 2.5,
          price_per_kg: 5,
          left_units: 10,
        },
      ]);

      mockedGetNews.mockResolvedValue([
        {
          id: 1,
          title: 'Market update',
          subtile: 'Agriculture',
          agent: 'Market Agency',
          content: 'Prices have increased this week.',
        },
      ]);

      render(<MarketScreen />);

      expect(await screen.findByTestId('product-item-1')).toBeTruthy();

      fireEvent.press(screen.getByText('market.news'));
      expect(await screen.findByText('Market update')).toBeTruthy();

      fireEvent.press(screen.getByText('market.prices'));
      expect(await screen.findByTestId('product-item-1')).toBeTruthy();
      expect(screen.queryByText('Market update')).toBeNull();
    });
  });

  describe('news rendering', () => {
    it('renders multiple news items', async () => {
      mockedGetContentFeed.mockResolvedValue([]);

      mockedGetNews.mockResolvedValue([
        {
          id: 1,
          title: 'First news',
          subtile: 'Category 1',
          agent: 'Agent 1',
          content: 'First content',
        },
        {
          id: 2,
          title: 'Second news',
          subtile: 'Category 2',
          agent: 'Agent 2',
          content: 'Second content',
        },
      ]);

      render(<MarketScreen />);

      fireEvent.press(screen.getByTestId('market-tab-news'));

      expect(await screen.findByTestId('news-item-1')).toBeTruthy();
      expect(await screen.findByTestId('news-item-2')).toBeTruthy();

      expect(screen.getByText('First news')).toBeTruthy();
      expect(screen.getByText('Second news')).toBeTruthy();

      expect(screen.getByText('First content')).toBeTruthy();
      expect(screen.getByText('Second content')).toBeTruthy();

      expect(screen.getByText('Agent 1')).toBeTruthy();
      expect(screen.getByText('Agent 2')).toBeTruthy();
    });
  });

  describe('API errors', () => {
    it('handles API errors when loading data', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockedGetContentFeed.mockRejectedValue(
        new Error('Failed to load market data'),
      );

      mockedGetNews.mockResolvedValue([]);

      render(<MarketScreen />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'market.errors.loadFailed',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('does not render products when product loading fails', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockedGetContentFeed.mockRejectedValue(new Error('Products failed'));
      mockedGetNews.mockResolvedValue([]);

      render(<MarketScreen />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'market.errors.loadFailed',
          expect.any(Error),
        );
      });

      expect(screen.queryByTestId('product-item-1')).toBeNull();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('buy button', () => {
    it('renders the buy button for each product', async () => {
      mockedGetContentFeed.mockResolvedValue([
        {
          id: 1,
          product: 'Tomato',
          tecnical_name: 'Solanum lycopersicum',
          price: 2.5,
          price_per_kg: 5,
          left_units: 10,
        },
        {
          id: 2,
          product: 'Potato',
          tecnical_name: 'Solanum tuberosum',
          price: 1.5,
          price_per_kg: 3,
          left_units: 20,
        },
      ]);

      mockedGetNews.mockResolvedValue([]);

      render(<MarketScreen />);

      await waitFor(() => {
        expect(screen.findByTestId('product-item-1')).toBeTruthy();
      });

      const buyButtons = screen.getAllByText('market.buy');

      expect(buyButtons).toHaveLength(2);
    });
  });
});
