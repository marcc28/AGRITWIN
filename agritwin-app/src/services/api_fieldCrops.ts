const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not defined');
}

// --------------------------------------------------
// TYPES
// --------------------------------------------------

export type FieldCrop = {
  id: string | number;
  field_id: string | number;
  crop_id: string | number;
  crop_name: string | null;
  planted_at?: string | null;
  expected_harvest_at?: string | null;
  status: string;
  notes?: string | null;
};

export type FieldCropCreate = {
  field_id: number;
  crop_id: number;
  planted_at?: string | null;
  expected_harvest_at?: string | null;
  status: string;
  notes?: string | null;
};

export type FieldCropUpdate = {
  planted_at?: string | null;
  expected_harvest_at?: string | null;
  status?: string;
  notes?: string | null;
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
// GET FIELD CROPS (PAGINATION + FILTERS)
// --------------------------------------------------

export async function getFieldCrops(
  offset: number,
  limit: number,
  token: string,
  filters?: {
    field_id?: number;
    crop_id?: number;
    status?: string;
  },
): Promise<FieldCrop[]> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });

  if (filters?.field_id != null) {
    params.append('field_id', String(filters.field_id));
  }

  if (filters?.crop_id != null) {
    params.append('crop_id', String(filters.crop_id));
  }

  if (filters?.status) {
    params.append('status', filters.status);
  }

  const response = await fetch(
    `${API_URL}/api/v1/crops/field-crops?${params.toString()}`,
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
        : 'Error obtenint els cultius del camp',
    );
  }

  return data as FieldCrop[];
}

// --------------------------------------------------
// GET FIELD CROPS COUNT
// --------------------------------------------------

export async function getFieldCropsCount(token: string): Promise<number> {
  const response = await fetch(`${API_URL}/api/v1/crops/field-crops/count`, {
    method: 'GET',
    headers: getHeaders(token),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : 'Error obtenint el nombre de cultius dels camps',
    );
  }

  return (data as CountResponse).total;
}

// --------------------------------------------------
// GET FIELD CROP BY ID
// --------------------------------------------------

export async function getFieldCropById(
  id: string | number,
  token: string,
): Promise<FieldCrop> {
  const response = await fetch(
    `${API_URL}/api/v1/crops/field-crops/${encodeURIComponent(id)}`,
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
        : 'No s’ha pogut carregar el cultiu del camp',
    );
  }

  return data as FieldCrop;
}

// --------------------------------------------------
// CREATE FIELD CROP
// --------------------------------------------------

export async function createFieldCrop(
  fieldCrop: FieldCropCreate,
  token: string,
): Promise<FieldCrop> {
  const response = await fetch(`${API_URL}/api/v1/crops/field-crops`, {
    method: 'POST',
    headers: getHeaders(token, true),
    body: JSON.stringify(fieldCrop),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof data?.detail === 'string'
        ? data.detail
        : `Error afegint el cultiu (${response.status})`,
    );
  }

  return data as FieldCrop;
}

// --------------------------------------------------
// UPDATE FIELD CROP
// --------------------------------------------------

export async function updateFieldCrop(
  id: string | number,
  fieldCrop: FieldCropUpdate,
  token: string,
): Promise<FieldCrop> {
  const response = await fetch(
    `${API_URL}/api/v1/crops/field-crops/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: getHeaders(token, true),
      body: JSON.stringify(fieldCrop),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : 'Error actualitzant el cultiu del camp',
    );
  }

  return data as FieldCrop;
}

// --------------------------------------------------
// DELETE FIELD CROP
// --------------------------------------------------

export async function deleteFieldCrop(
  id: string | number,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/v1/crops/field-crops/${encodeURIComponent(id)}`,
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
        : 'Error eliminant el cultiu del camp',
    );
  }
}
