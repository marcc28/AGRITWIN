
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000';

import {
  getMarketProduct,
  getcontentfeed,
  searchMarketProducts,
  getMarketProductsCount,
} from '../../../src/services/api_market';

describe('market api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets a market product by id', async () => {
    const product = {
      id: 1,
      product: 'Tomata',
      tecnical_name: 'Solanum lycopersicum',
      price: 2.5,
      price_per_kg: 2.5,
      left_units: 10,
      image_url: 'https://example.com/tomata.png',
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => product,
    }) as jest.Mock;

    await expect(getMarketProduct('1')).resolves.toEqual(product);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/conte_mercat/1',
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
    );
  });

  it('encodes the product id', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'product 1' }),
    }) as jest.Mock;

    await getMarketProduct('product 1');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/conte_mercat/product%201',
      expect.any(Object),
    );
  });

  it('throws the api detail when getting a product fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        detail: 'Product not found',
      }),
    }) as jest.Mock;

    await expect(getMarketProduct('999')).rejects.toThrow(
      'Product not found',
    );
  });

  it('uses the default error when product detail is not a string', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        detail: { error: 'Not found' },
      }),
    }) as jest.Mock;

    await expect(getMarketProduct('999')).rejects.toThrow(
      'No s’ha pogut carregar el producte',
    );
  });

  it('searches market products', async () => {
    const products = [
      {
        id: 1,
        product: 'Tomata',
        price: 2.5,
      },
      {
        id: 2,
        product: 'Tomata cherry',
        price: 3.5,
      },
    ];

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => products,
    }) as jest.Mock;

    await expect(searchMarketProducts('tomata')).resolves.toEqual(products);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/conte_mercat/search?product=tomata',
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
    );
  });

  it('encodes the search product', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }) as jest.Mock;

    await searchMarketProducts('tomata cherry');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/conte_mercat/search?product=tomata%20cherry',
      expect.any(Object),
    );
  });

  it('throws when market product search fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        detail: 'Search failed',
      }),
    }) as jest.Mock;

    await expect(searchMarketProducts('tomata')).rejects.toThrow(
      'Search failed',
    );
  });

  it('gets the market content feed', async () => {
    const products = [
      { id: 1, product: 'Tomata' },
      { id: 2, product: 'Patata' },
    ];

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => products,
    }) as jest.Mock;

    await expect(getcontentfeed(0, 10)).resolves.toEqual(products);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/conte_mercat?offset=0&limit=10',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  });

  it('throws when getting the market content feed fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        detail: 'Feed error',
      }),
    }) as jest.Mock;

    await expect(getcontentfeed(0, 10)).rejects.toThrow('Feed error');
  });

  it('gets the market products count', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total: 25,
      }),
    }) as jest.Mock;

    await expect(getMarketProductsCount()).resolves.toBe(25);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/conte_mercat/count',
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
    );
  });

  it('throws when getting the market products count fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        total: 0,
      }),
    }) as jest.Mock;

    await expect(getMarketProductsCount()).rejects.toThrow(
      'Error obtenint el nombre total de productes',
    );
  });
});
