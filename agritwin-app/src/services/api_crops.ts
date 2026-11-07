const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not defined');
}

// --------------------------------------------------
// TYPES
// --------------------------------------------------

export type Crop = {
  id: string | number;
  name: string;
  scientific_name: string;
  category: string;
};

export type CropCreate = {
  name: string;
  scientific_name: string;
  category: string;
};

export type CropUpdate = {
  name?: string;
  scientific_name?: string;
  category?: string;
};

export type CountResponse = {
  total: number;
};

// --------------------------------------------------
// HELPER: AUTH HEADERS
// --------------------------------------------------

function getHeaders(token: string, contentType = false) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
  };
}

// --------------------------------------------------
// GET CROPS (PAGINATION)
// --------------------------------------------------

export async function getCrops(
  offset: number,
  limit: number,
  token: string,
): Promise<Crop[]> {
  const response = await fetch(
    `${API_URL}/api/v1/crops?offset=${offset}&limit=${limit}`,
    {
      method: 'GET',
      headers: getHeaders(token),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : 'Error obtenint els cultius',
    );
  }

  return data as Crop[];
}

// --------------------------------------------------
// GET CROP BY ID
// --------------------------------------------------

export async function getCropById(
  id: string | number,
  token: string,
): Promise<Crop> {
  const response = await fetch(
    `${API_URL}/api/v1/crops/${encodeURIComponent(id)}`,
    {
      method: 'GET',
      headers: getHeaders(token),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : 'No s’ha pogut carregar el cultiu',
    );
  }

  return data as Crop;
}

// --------------------------------------------------
// SEARCH CROPS
// --------------------------------------------------

export async function searchCrops(
  name: string,
  token: string,
): Promise<Crop[]> {
  const response = await fetch(
    `${API_URL}/api/v1/crops/search?name=${encodeURIComponent(name)}`,
    {
      method: 'GET',
      headers: getHeaders(token),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string' ? data.detail : 'Error cercant cultius',
    );
  }

  return data as Crop[];
}

// --------------------------------------------------
// COUNT CROPS
// --------------------------------------------------

export async function getCropsCount(token: string): Promise<number> {
  const response = await fetch(`${API_URL}/api/v1/crops/count`, {
    method: 'GET',
    headers: getHeaders(token),
  });

  const data: CountResponse = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof (data as any).detail === 'string'
        ? (data as any).detail
        : 'Error obtenint el nombre total de cultius',
    );
  }

  return data.total;
}

// --------------------------------------------------
// CREATE CROP
// --------------------------------------------------

export async function createCrop(
  crop: CropCreate,
  token: string,
): Promise<Crop> {
  const response = await fetch(`${API_URL}/api/v1/crops`, {
    method: 'POST',
    headers: getHeaders(token, true),
    body: JSON.stringify(crop),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string' ? data.detail : 'Error creant el cultiu',
    );
  }

  return data as Crop;
}

// --------------------------------------------------
// UPDATE CROP
// --------------------------------------------------

export async function updateCrop(
  id: string | number,
  crop: CropUpdate,
  token: string,
): Promise<Crop> {
  const response = await fetch(
    `${API_URL}/api/v1/crops/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: getHeaders(token, true),
      body: JSON.stringify(crop),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : 'Error actualitzant el cultiu',
    );
  }

  return data as Crop;
}

// --------------------------------------------------
// DELETE CROP
// --------------------------------------------------

export async function deleteCrop(
  id: string | number,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/v1/crops/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: getHeaders(token),
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(
      typeof data?.detail === 'string'
        ? data.detail
        : 'Error eliminant el cultiu',
    );
  }
}
