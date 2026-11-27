import { authenticatedFetch, getAuth } from './auth';
import { forgetField, invalidateField } from './cacheInvalidation';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not defined');
}

export type LegalDocument = {
  document_type: string;
  version: string;
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
  /** True when the readings come from the simulated device of the garden. */
  simulated?: boolean;
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

  const response = await authenticatedFetch(url, {
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
    simulated: data.simulated === true,
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

type MeListener = (me: Me) => void;

const meListeners = new Set<MeListener>();

export function subscribeMe(listener: MeListener) {
  meListeners.add(listener);
  return () => {
    meListeners.delete(listener);
  };
}

export async function getMe(): Promise<Me> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await authenticatedFetch(`${API_URL}/api/v1/me`, {
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

  const response = await authenticatedFetch(`${API_URL}/api/v1/me`, {
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

  meListeners.forEach((listener) => listener(data as Me));
  return data as Me;
}

export async function updateMyEmail(email: string): Promise<Me> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await authenticatedFetch(`${API_URL}/api/v1/me/email`, {
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

  const response = await authenticatedFetch(`${API_URL}/api/v1/me/password`, {
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
  lat?: number | null;
  lon?: number | null;
  field_type: string | null;
  soil_type: string | null;
  size_m2: number | null;
  boundary?: { lat: number; lon: number }[] | null;
  excluded_zones?: { lat: number; lon: number }[][];
  device_count: number;
  devices_online?: number;
  /** True while the garden has no real board and shows simulated data. */
  simulated_data?: boolean;
};

export type FieldPayload = {
  name: string;
  location: string | null;
  lat?: number | null;
  lon?: number | null;
  field_type: string | null;
  soil_type: string | null;
  size_m2: number | null;
  boundary?: { lat: number; lon: number }[] | null;
  excluded_zones?: { lat: number; lon: number }[][];
};

export type GeoLocation = {
  lat: number;
  lon: number;
  label?: string | null;
};

export type FieldDevice = {
  id: string;
  battery_status: boolean;
  brand?: string | null;
  serial_number?: string | null;
};

export type DevicePayload = {
  id: string;
  brand: string;
  serial_number: string;
};

export type FieldDetail = Field & {
  devices: FieldDevice[];
};

export async function getField(id: number): Promise<FieldDetail> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await authenticatedFetch(`${API_URL}/api/v1/fields/${id}`, {
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

  const response = await authenticatedFetch(`${API_URL}/api/v1/fields`, {
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
    ...(field.devices_online == null
      ? {}
      : { devices_online: Number(field.devices_online) }),
    ...(field.simulated_data == null
      ? {}
      : { simulated_data: field.simulated_data === true }),
  }));
}

export async function updateDevice(
  fieldId: number,
  deviceId: string,
  payload: Omit<DevicePayload, 'id'>,
): Promise<FieldDevice> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await authenticatedFetch(
    `${API_URL}/api/v1/fields/${fieldId}/devices/${encodeURIComponent(deviceId)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify(payload),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      errorDetail(data, 'No s’ha pogut actualitzar el dispositiu'),
    );
  }

  invalidateField(fieldId);
  return data as FieldDevice;
}

export async function deleteDevice(
  fieldId: number,
  deviceId: string,
): Promise<void> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await authenticatedFetch(
    `${API_URL}/api/v1/fields/${fieldId}/devices/${encodeURIComponent(deviceId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    },
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(errorDetail(data, 'No s’ha pogut treure el dispositiu'));
  }

  invalidateField(fieldId);
}

export async function createDevice(
  fieldId: number,
  payload: DevicePayload,
): Promise<FieldDevice> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await authenticatedFetch(
    `${API_URL}/api/v1/fields/${fieldId}/devices`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify(payload),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(errorDetail(data, 'No s’ha pogut enllaçar el dispositiu'));
  }

  invalidateField(fieldId);
  return data as FieldDevice;
}

export async function createField(payload: FieldPayload): Promise<Field> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  if (payload.boundary)
    await requireGeometrySupport(
      'FieldCreate',
      !!payload.excluded_zones?.length,
    );

  const response = await authenticatedFetch(`${API_URL}/api/v1/fields`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(errorDetail(data, 'No s’ha pogut crear el camp'));
  }

  invalidateField();
  return data as Field;
}

export async function geocodeLocation(query: string): Promise<GeoLocation> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await authenticatedFetch(
    `${API_URL}/api/v1/geocode?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(errorDetail(data, 'No s’ha trobat aquesta ubicació'));
  }

  return data as GeoLocation;
}

export async function updateField(
  id: number,
  payload: FieldPayload,
): Promise<Field> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  if ('boundary' in payload)
    await requireGeometrySupport(
      'FieldUpdate',
      !!payload.excluded_zones?.length,
    );

  const response = await authenticatedFetch(`${API_URL}/api/v1/fields/${id}`, {
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

  invalidateField(id);
  return data as Field;
}

export async function deleteField(id: number): Promise<void> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await authenticatedFetch(`${API_URL}/api/v1/fields/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${auth.token}`,
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(errorDetail(data, 'No s’ha pogut esborrar el camp'));
  }

  forgetField(id);
}

// --------------------------------------------------
// WEATHER FORECAST
// --------------------------------------------------
export type WeatherCondition = {
  code: number | null;
  main: string;
  description: string;
  icon: string;
};

export type WeatherWind = {
  speed: number;
  direction_deg: number | null;
  gust: number | null;
};

export type HourlyWeather = {
  time: string;
  temperature: number;
  rain_probability: number | null;
  condition: WeatherCondition;
};

export type DailyWeather = {
  date: string;
  temp_min: number;
  temp_max: number;
  rain_probability: number;
  rain_mm: number;
  condition: WeatherCondition;
  wind: WeatherWind;
  uv_index_max: number | null;
  sunrise: string | null;
  sunset: string | null;
};

export type WeatherAlert = {
  type: string;
  message: string;
  starts_at: string | null;
  day: string | null;
  rain_probability: number | null;
  rain_mm: number | null;
  temperature: number | null;
  wind_speed: number | null;
};

export type FieldWeather = {
  units: string;
  lang: string;
  temperature_unit: string;
  wind_speed_unit: string;
  fetched_at: string | null;
  location: {
    field_id: number | null;
    name: string | null;
    country: string | null;
    latitude: number;
    longitude: number;
    timezone_offset: number;
  };
  current: {
    observed_at: string;
    temperature: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    clouds: number;
    rain_last_hour_mm: number;
    condition: WeatherCondition;
    wind: WeatherWind;
    rain_probability: number | null;
    uv_index: number | null;
    is_day: boolean;
  };
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  current_alerts?: WeatherAlert[];
  alerts?: WeatherAlert[];
};

export class WeatherRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function getFieldWeather(
  fieldId: number,
  lang: string,
  days = 3,
): Promise<FieldWeather> {
  const auth = await getAuth();

  if (!auth?.token) {
    throw new WeatherRequestError('Not authenticated', 401);
  }

  const response = await authenticatedFetch(
    `${API_URL}/api/v1/weather/fields/${fieldId}?days=${days}&lang=${encodeURIComponent(lang)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : '';
    throw new WeatherRequestError(detail, response.status);
  }

  return data as FieldWeather;
}

export async function reverseGeocodeLocation(
  lat: number,
  lon: number,
): Promise<GeoLocation> {
  const auth = await getAuth();
  if (!auth?.token) throw new Error('Not authenticated');
  const response = await authenticatedFetch(
    `${API_URL}/api/v1/reverse-geocode?lat=${lat}&lon=${lon}`,
    { headers: { Authorization: `Bearer ${auth.token}` } },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(errorDetail(data, 'Address not found for this location'));
  return data as GeoLocation;
}

async function requireGeometrySupport(model: string, exclusions: boolean) {
  const specification = await fetch(`${API_URL}/openapi.json`);
  const schema = await specification.json();
  const properties = schema?.components?.schemas?.[model]?.properties;
  if (
    !specification.ok ||
    !properties?.boundary ||
    (exclusions && !properties.excluded_zones)
  ) {
    throw new Error(
      'The backend must be updated before saving field boundaries',
    );
  }
}

// --------------------------------------------------
// FORGOT PASSWORD
// --------------------------------------------------

export async function forgotPassword(email: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/password/forget-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      errorDetail(data, 'No s’ha pogut enviar el correu de recuperació'),
    );
  }
}

export type TaskPriority = 'high' | 'medium' | 'low';

export type GardenTask = {
  id: number;
  title: string;
  details: string | null;
  due_on: string | null;
  source: 'ai' | 'user';
  priority: TaskPriority;
  completion_reason: string | null;
  completed: boolean;
  can_delete: boolean;
  created_at: string;
};

// What the user can change in a task. Only the sent fields change.
export type TaskChanges = {
  completed?: boolean;
  title?: string;
  details?: string | null;
  priority?: TaskPriority;
  due_on?: string;
};

export type GardenRecommendation = {
  id: number;
  title: string;
  details: string | null;
  due_on: string;
  signature: string;
};

export type GardenTaskList = {
  today: string;
  has_sensors: boolean;
  refresh: boolean;
  tasks: GardenTask[];
  recommendations: GardenRecommendation[];
};

async function taskRequest(
  path: string,
  fallback: string,
  init: { method?: string; body?: unknown } = {},
): Promise<unknown> {
  const auth = await getAuth();
  if (!auth?.token) {
    throw new Error('Not authenticated');
  }

  const response = await authenticatedFetch(`${API_URL}/api/v1/tasks${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      ...(init.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  if (response.status === 204) {
    return null;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(errorDetail(data, fallback));
  }
  return data;
}

export async function getGardenTasks(
  fieldId: number,
  lang: string,
): Promise<GardenTaskList> {
  const data = await taskRequest(
    `?field_id=${fieldId}&lang=${encodeURIComponent(lang)}`,
    'No s’han pogut carregar les tasques',
  );
  return data as GardenTaskList;
}

export async function createGardenTask(
  fieldId: number,
  title: string,
  dueOn: string,
  priority: TaskPriority,
  details?: string,
): Promise<GardenTask> {
  const data = await taskRequest('', 'No s’ha pogut crear la tasca', {
    method: 'POST',
    body: {
      field_id: fieldId,
      title,
      due_on: dueOn,
      priority,
      details: details?.trim() || null,
    },
  });
  return data as GardenTask;
}

export async function updateGardenTask(
  fieldId: number,
  taskId: number,
  changes: TaskChanges,
): Promise<GardenTask> {
  const data = await taskRequest(
    `/${taskId}?field_id=${fieldId}`,
    'No s’ha pogut actualitzar la tasca',
    { method: 'PATCH', body: changes },
  );
  return data as GardenTask;
}

export async function deleteGardenTask(
  fieldId: number,
  taskId: number,
): Promise<void> {
  await taskRequest(
    `/${taskId}?field_id=${fieldId}`,
    'No s’ha pogut esborrar la tasca',
    { method: 'DELETE' },
  );
}

export async function dismissRecommendation(
  fieldId: number,
  recommendationId: number,
): Promise<void> {
  await taskRequest(
    `/recommendations/${recommendationId}/seen?field_id=${fieldId}`,
    'No s’ha pogut actualitzar la recomanació',
    { method: 'POST' },
  );
}

export async function convertRecommendation(
  fieldId: number,
  recommendationId: number,
): Promise<void> {
  await taskRequest(
    `/recommendations/${recommendationId}/task?field_id=${fieldId}`,
    'No s’ha pogut actualitzar la recomanació',
    { method: 'POST' },
  );
}
