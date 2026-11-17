
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { clearCurrentField } from './currentField';

const TOKEN_KEY = 'agritwin_access_token';
const REFRESH_TOKEN_KEY = 'agritwin_refresh_token';
const USERNAME_KEY = 'agritwin_username';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string) {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }

  return await SecureStore.getItemAsync(key);
}

async function removeItem(key: string) {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

// Guardar els tokens
export async function setAuth(
  username: string,
  accessToken: string,
  refreshToken?: string,
) {
  await setItem(USERNAME_KEY, username);
  await setItem(TOKEN_KEY, accessToken);

  if (refreshToken) {
    await setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

// Recuperar els tokens
export async function getAuth() {
  const token = await getItem(TOKEN_KEY);
  const refreshToken = await getItem(REFRESH_TOKEN_KEY);
  const username = await getItem(USERNAME_KEY);

  if (!token && !refreshToken) {
    return null;
  }

  return {
    token,
    refreshToken,
    username,
  };
}

// Renovar l'access token
export async function refreshAuth() {
  const refreshToken = await getItem(REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured');
  }

  const response = await fetch(
    `${API_URL.replace(/\/$/, '')}/api/v1/refresh`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
      }).toString(),
    },
  );

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      await clearAuth();
    }

    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('Refresh response does not contain access_token');
  }

  const username = await getItem(USERNAME_KEY);

  await setItem(TOKEN_KEY, data.access_token);

  // Si el servidor rota el refresh token, guardar el nou.
  // Si no el retorna, conservar l'anterior.
  if (data.refresh_token) {
    await setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    username,
  };
}

let refreshInFlight: ReturnType<typeof refreshAuth> | null = null;

/** Sends an authenticated request and refreshes/retries once after a 401. */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  accessToken?: string,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const headerToken = headers
    .get('Authorization')
    ?.replace(/^Bearer\s+/i, '');
  const hasAuthorization = Boolean(accessToken ?? headerToken);

  if (!hasAuthorization) {
    return fetch(input, init);
  }

  // The stored token is canonical, so callers holding an older token still
  // automatically use the latest value after another request refreshes it.
  const token = (await getAuth())?.token ?? accessToken ?? headerToken;
  if (!token) return fetch(input, init);

  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(input, { ...init, headers });

  if (response.status !== 401) {
    return response;
  }

  // A concurrent request may already have refreshed the shared token.
  const currentAuth = await getAuth();
  if (currentAuth?.token && currentAuth.token !== token) {
    headers.set('Authorization', `Bearer ${currentAuth.token}`);
    return fetch(input, { ...init, headers });
  }

  try {
    refreshInFlight ??= refreshAuth().finally(() => {
      refreshInFlight = null;
    });
    const refreshed = await refreshInFlight;
    headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
    return await fetch(input, { ...init, headers });
  } catch {
    // Keep the original 401 so the calling service can handle it as usual.
    return response;
  }
}

// Eliminar tota la informació d'autenticació
export async function clearAuth() {
  await removeItem(TOKEN_KEY);
  await removeItem(REFRESH_TOKEN_KEY);
  await removeItem(USERNAME_KEY);

  await clearCurrentField();
}
