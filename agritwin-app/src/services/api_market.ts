import { getAuth } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not defined');
}

export type News = {
  id: string | number;
  title: string;
  subtile: string;
  agent: string;
  content: string;
  image_url?: string | null;
};

export type CountResponse = {
  total: number;
};

// --------------------------------------------------
// SEARCH NEWS
// --------------------------------------------------

export async function searchNews(title: string): Promise<News[]> {
  const response = await fetch(
    `${API_URL}/api/v1/anunces/search?title=${encodeURIComponent(title)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Error cercant notícies');
  }

  return data;
}

// --------------------------------------------------
// SEARCH MARKET PRODUCTS
// --------------------------------------------------

export type MarketProduct = {
  id: string | number;
  product: string;
  tecnical_name: string;
  price: number;
  price_per_kg: number;
  left_units: number;
  image_url?: string | null;
};

export async function getMarketProduct(id: string): Promise<MarketProduct> {
  const response = await fetch(
    `${API_URL}/api/v1/conte_mercat/${encodeURIComponent(id)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : 'No s’ha pogut carregar el producte',
    );
  }

  return data as MarketProduct;
}

export async function getnews(offset: number, limit: number): Promise<News[]> {
  const response = await fetch(
    `${API_URL}/api/v1/anunces?offset=${offset}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Error obtenint les notícies');
  }

  return data;
}

export async function getcontentfeed(offset: number, limit: number) {
  const response = await fetch(
    `${API_URL}/api/v1/conte_mercat?offset=${offset}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Error obtenint els anuncis');
  }

  return data;
}

export async function getNewsById(id: string): Promise<News> {
  const response = await fetch(
    `${API_URL}/api/v1/anunces/${encodeURIComponent(id)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : 'No s’ha pogut carregar la notícia.',
    );
  }

  return data as News;
}

export async function searchMarketProducts(product: string) {
  const response = await fetch(
    `${API_URL}/api/v1/conte_mercat/search?product=${encodeURIComponent(product)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Error cercant productes');
  }

  return data;
}

// --------------------------------------------------
// COUNT NEWS / ANUNCIS
// --------------------------------------------------
export async function getAnuncesCount(): Promise<number> {
  const response = await fetch(`${API_URL}/api/v1/anunces/count`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const data: CountResponse = await response.json();

  if (!response.ok) {
    throw new Error('Error obtenint el nombre total d’anuncis');
  }

  return data.total;
}

// --------------------------------------------------
// COUNT MARKET PRODUCTS
// --------------------------------------------------
export async function getMarketProductsCount(): Promise<number> {
  const response = await fetch(`${API_URL}/api/v1/conte_mercat/count`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const data: CountResponse = await response.json();

  if (!response.ok) {
    throw new Error('Error obtenint el nombre total de productes');
  }

  return data.total;
}
