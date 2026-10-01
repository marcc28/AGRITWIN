import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'agritwin_access_token';
const REFRESH_TOKEN_KEY = 'agritwin_refresh_token';
const USERNAME_KEY = 'agritwin_username';

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
  } else {
    return await SecureStore.getItemAsync(key);
  }
}

async function removeItem(key: string) {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

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

export async function getAuth() {
  const token = await getItem(TOKEN_KEY);
  const refreshToken = await getItem(REFRESH_TOKEN_KEY);
  const username = await getItem(USERNAME_KEY);

  if (!token) {
    return null;
  }

  return {
    token,
    refreshToken,
    username,
  };
}

export async function clearAuth() {
  await removeItem(TOKEN_KEY);
  await removeItem(REFRESH_TOKEN_KEY);
  await removeItem(USERNAME_KEY);
}
