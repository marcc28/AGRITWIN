import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { defaultPhotoIndex } from '../constants/gardenPhotos';

const FIELD_PHOTO_KEY = 'agritwin_field_photos';

type PhotoMap = Record<string, number>;
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

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeFieldPhotos(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function getMap(): Promise<PhotoMap> {
  const raw = await getItem(FIELD_PHOTO_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as PhotoMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function getFieldPhotoIndex(fieldId: number): Promise<number> {
  const map = await getMap();
  const stored = map[String(fieldId)];
  if (typeof stored === 'number' && Number.isFinite(stored)) {
    return stored;
  }
  return defaultPhotoIndex(fieldId);
}

export async function setFieldPhotoIndex(
  fieldId: number,
  index: number,
): Promise<void> {
  const map = await getMap();
  map[String(fieldId)] = index;
  await setItem(FIELD_PHOTO_KEY, JSON.stringify(map));
  notify();
}
