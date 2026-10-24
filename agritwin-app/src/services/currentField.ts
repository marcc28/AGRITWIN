import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CURRENT_FIELD_KEY = 'agritwin_current_field';

export type CurrentField = {
  id: number;
  name: string;
};

type Listener = () => void;

const listeners = new Set<Listener>();

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
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string) {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeCurrentField(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function getCurrentField(): Promise<CurrentField | null> {
  const raw = await getItem(CURRENT_FIELD_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CurrentField;
    if (typeof parsed?.id !== 'number' || typeof parsed?.name !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setCurrentField(field: CurrentField): Promise<void> {
  const current = await getCurrentField();
  if (current?.id === field.id && current?.name === field.name) {
    return;
  }

  await setItem(CURRENT_FIELD_KEY, JSON.stringify(field));
  notify();
}

export async function clearCurrentField(): Promise<void> {
  await removeItem(CURRENT_FIELD_KEY);
  notify();
}
