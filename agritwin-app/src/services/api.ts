import { getAuth } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not defined');
}

export type LegalDocument = {
  document_type: string;
  version: string;
  content: string;
};

export type News = {
  id: string | number;
  title: string;
  subtile: string;
  agent: string;
  content: string;
};
// --------------------------------------------------
// SIGN UP
// --------------------------------------------------

export async function signup(
  username: string,
  email: string,
  password: string,
  passwordConfirm: string,
  privacyAccepted: boolean,
  securityAccepted: boolean,
) {
  const response = await fetch(`${API_URL}/api/v1/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      email,
      password,
      password_conf: passwordConfirm,
      privacy_terms_accepted: privacyAccepted,
      security_terms_accepted: securityAccepted,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "No s'ha pogut crear l'usuari");
  }

  return data;
}

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

export async function login(username: string, password: string) {
  const body = new URLSearchParams({
    username,
    password,
  }).toString();

  const response = await fetch(`${API_URL}/api/v1/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Error iniciant sessió');
  }

  return data;
}

export async function getnews(offset: number, limite: number): Promise<News[]> {
  const response = await fetch(
    `${API_URL}/api/v1/anunces?offset=${offset}&limite=${limite}`,
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

export async function getanunces(offset: number, limite: number) {
  const response = await fetch(
    `${API_URL}/api/v1/anunces?offset=${offset}&limite=${limite}`,
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

export async function getcontentfeed(offset: number, limite: number) {
  const response = await fetch(
    `${API_URL}/api/v1/conte_mercat?offset=${offset}&limite=${limite}`,
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
// --------------------------------------------------
// PRIVACY NOTICE
// --------------------------------------------------

export async function getPrivacyPolicy(): Promise<LegalDocument> {
  const response = await fetch(`${API_URL}/api/v1/legal/privacy`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'No s’ha pogut carregar la Privacy Notice');
  }

  return data as LegalDocument;
}

// --------------------------------------------------
// SECURITY POLICY
// --------------------------------------------------

export async function getSecurityPolicy(): Promise<LegalDocument> {
  const response = await fetch(`${API_URL}/api/v1/legal/security`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'No s’ha pogut carregar la Security Policy');
  }

  return data as LegalDocument;
}

// --------------------------------------------------
// GET DASHBOARD DATA
// --------------------------------------------------

export type Reading = {
  timestamp: string;
  temperature: number;
  air_humidity: number;
  soil_humidity: number;
  light: number;
};

export type Dashboard = {
  field_name: string | null;
  device_ids: string[];
  latest: Reading | null;
  history: Reading[];
};

export async function getDashboard(fieldId?: number): Promise<Dashboard> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const url =
    fieldId == null
      ? `${API_URL}/api/v1/dashboard`
      : `${API_URL}/api/v1/dashboard?field_id=${fieldId}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${auth.token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'No s’ha pogut carregar el dashboard');
  }

  const deviceIds: string[] = Array.isArray(data.device_ids)
    ? data.device_ids
    : data.device_id
      ? [data.device_id]
      : [];

  return {
    field_name: data.field_name ?? null,
    device_ids: deviceIds,
    latest: data.latest ?? null,
    history: data.history ?? [],
  };
}

export type Me = {
  username: string;
  email: string;
  name: string;
  language: string;
  notifications_enabled: boolean;
  weather_alerts_enabled: boolean;
};

export type MeUpdate = {
  name: string;
  language: string;
  notifications_enabled: boolean;
  weather_alerts_enabled: boolean;
};

function errorDetail(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === 'string') {
      return detail;
    }
  }
  return fallback;
}

export async function getMe(): Promise<Me> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/v1/me`, {
    headers: {
      Authorization: `Bearer ${auth.token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(errorDetail(data, 'No s’ha pogut carregar el perfil'));
  }

  return data as Me;
}

export async function updateMe(payload: MeUpdate): Promise<Me> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/v1/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(errorDetail(data, 'No s’ha pogut guardar el perfil'));
  }

  return data as Me;
}

export async function updateMyEmail(email: string): Promise<Me> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/v1/me/email`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(errorDetail(data, 'No s’ha pogut canviar el correu'));
  }

  return data as Me;
}

export async function updateMyPassword(
  currentPassword: string,
  newPassword: string,
  newPasswordConf: string,
): Promise<void> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/v1/me/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      new_password_conf: newPasswordConf,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(errorDetail(data, 'No s’ha pogut canviar la contrasenya'));
  }
}

export type Field = {
  id: number;
  name: string;
  location: string | null;
  field_type: string | null;
  soil_type: string | null;
  size_m2: number | null;
  device_count: number;
};

export type FieldDevice = {
  id: string;
  battery_status: boolean;
};

export type FieldDetail = Field & {
  devices: FieldDevice[];
};

export async function getField(id: number): Promise<FieldDetail> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/v1/fields/${id}`, {
    headers: {
      Authorization: `Bearer ${auth.token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(errorDetail(data, 'No s’ha pogut carregar el camp'));
  }

  return data as FieldDetail;
}

export function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.message === 'Not authenticated' ||
    error.message === 'Could not validate credentials'
  );
}

export async function getFields(): Promise<Field[]> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/v1/fields`, {
    headers: {
      Authorization: `Bearer ${auth.token}`,
    },
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    throw new Error('No s’ha pogut carregar els camps');
  }

  if (!response.ok) {
    throw new Error(errorDetail(data, 'No s’ha pogut carregar els camps'));
  }

  if (!Array.isArray(data)) {
    throw new TypeError('No s’ha pogut carregar els camps');
  }

  return data.map((field) => ({
    ...field,
    id: Number(field.id),
    device_count: Number(field.device_count),
  }));
}

export async function updateField(
  id: number,
  payload: {
    name: string;
    location: string | null;
    field_type: string | null;
    soil_type: string | null;
    size_m2: number | null;
  },
): Promise<Field> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/v1/fields/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'No s’ha pogut guardar el camp');
  }

  return data as Field;
}
