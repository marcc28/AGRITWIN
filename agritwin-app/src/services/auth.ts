import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { clearCurrentField } from './currentField';
import { clearQueryCache } from './queryPersistence';

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

let expiredSessionCleanup: Promise<void> | null = null;

async function expireSession() {
  expiredSessionCleanup ??= (async () => {
    try {
      await clearAuth();
    } finally {
      router.replace('/auth/login');
    }
  })().finally(() => {
    expiredSessionCleanup = null;
  });

  await expiredSessionCleanup;
}

export type Auth = {
  token: string | null;
  refreshToken: string | null;
  username: string | null;
};

/**
 * Every API call needs the token. Reading the secure store is slow on a
 * phone, so the credentials are read once and kept in memory until they
 * change (setAuth / refreshAuth / clearAuth).
 */
let authInMemory: Promise<Auth | null> | null = null;

/** Forgets the credentials kept in memory (they stay in the secure store). */
export function resetAuthCache() {
  authInMemory = null;
}

// Guardar els tokens
export async function setAuth(
  username: string,
  accessToken: string,
  refreshToken?: string,
) {
  const previousUsername = await getItem(USERNAME_KEY);
  if (previousUsername && previousUsername !== username) {
    // Another user: data cached for the previous account must not show up.
    await clearQueryCache();
  }

  resetAuthCache();
  try {
    await setItem(USERNAME_KEY, username);
    await setItem(TOKEN_KEY, accessToken);

    if (refreshToken) {
      await setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  } finally {
    resetAuthCache();
  }
}

async function readAuth(): Promise<Auth | null> {
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

// Recuperar els tokens
export async function getAuth(): Promise<Auth | null> {
  if (!authInMemory) {
    const reading = readAuth();
    authInMemory = reading;
    // A failed read must not be remembered.
    reading.catch(() => {
      if (authInMemory === reading) {
        authInMemory = null;
      }
    });
  }
  return authInMemory;
}

// Renovar l'access token
export async function refreshAuth() {
  const refreshToken = await getItem(REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    await expireSession();
    throw new Error('No refresh token available');
  }

  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured');
  }

  const response = await fetch(`${API_URL.replace(/\/$/, '')}/api/v1/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      await expireSession();
    }

    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    await expireSession();
    throw new Error('Refresh response does not contain access_token');
  }

  const username = await getItem(USERNAME_KEY);

  resetAuthCache();
  try {
    await setItem(TOKEN_KEY, data.access_token);

    // Si el servidor rota el refresh token, guardar el nou.
    // Si no el retorna, conservar l'anterior.
    if (data.refresh_token) {
      await setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    }
  } finally {
    // Every next request uses the new token.
    resetAuthCache();
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
  const headerToken = headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
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
    const response = await fetch(input, { ...init, headers });
    if (response.status === 401) {
      await expireSession();
    }
    return response;
  }

  try {
    refreshInFlight ??= refreshAuth().finally(() => {
      refreshInFlight = null;
    });
    const refreshed = await refreshInFlight;
    headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
    const retryResponse = await fetch(input, { ...init, headers });
    if (retryResponse.status === 401) {
      await expireSession();
    }
    return retryResponse;
  } catch {
    // Keep the original 401 so the calling service can handle it as usual.
    return response;
  }
}

// Eliminar tota la informació d'autenticació
export async function clearAuth() {
  resetAuthCache();
  try {
    await removeItem(TOKEN_KEY);
    await removeItem(REFRESH_TOKEN_KEY);
    await removeItem(USERNAME_KEY);
  } finally {
    resetAuthCache();
  }

  await clearCurrentField();
  await clearQueryCache();
}
