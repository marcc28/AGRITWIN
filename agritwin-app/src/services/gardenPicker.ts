import { getFields, type Field } from './api';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getAuth } from './auth';

export type GardenPickerState = {
  open: boolean;
  fields: Field[];
  currentId: number | null;
  loaded: boolean;
  refreshing: boolean;
};

type Listener = () => void;

let state: GardenPickerState = {
  open: false,
  fields: [],
  currentId: null,
  loaded: false,
  refreshing: false,
};

const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getGardenPicker(): GardenPickerState {
  return state;
}

export function setGardenPicker(next: Partial<GardenPickerState>): void {
  state = { ...state, ...next };
  notify();
}

export function subscribeGardenPicker(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let loadingPromise: Promise<Field[]> | null = null;
let loadingUsername: string | null = null;
let loadedUsername: string | null = null;

async function getCacheKey(): Promise<string | null> {
  const auth = await getAuth();
  return auth?.username
    ? `agritwin_garden_picker_fields_${auth.username}`
    : null;
}

async function readCachedFields(): Promise<Field[] | null> {
  try {
    const key = await getCacheKey();
    if (!key) return null;
    const raw =
      Platform.OS === 'web'
        ? localStorage.getItem(key)
        : await SecureStore.getItemAsync(key);
    if (!raw) return null;
    const fields: unknown = JSON.parse(raw);
    return Array.isArray(fields) ? (fields as Field[]) : null;
  } catch {
    return null;
  }
}

async function cacheFields(fields: Field[]): Promise<void> {
  try {
    const key = await getCacheKey();
    if (!key) return;
    const value = JSON.stringify(fields);
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch {
    // The in-memory list remains available if persistent storage is full/unavailable.
  }
}

export async function loadGardenPickerFields(
  forceRefresh = false,
): Promise<Field[]> {
  const auth = await getAuth();
  const username = auth?.username ?? null;

  if (loadedUsername !== username) {
    loadedUsername = username;
    state = {
      ...state,
      fields: [],
      loaded: false,
      refreshing: false,
      currentId: null,
    };
    notify();
  }

  if (!forceRefresh && state.loaded) {
    return state.fields;
  }

  if (loadingPromise && loadingUsername === username) {
    return loadingPromise;
  }

  state = { ...state, refreshing: true };
  notify();

  const request = (async () => {
    // Hydrate from local storage first so the picker can render before the API responds.
    if (!state.loaded) {
      const cached = await readCachedFields();
      if (cached) {
        state = { ...state, fields: cached, loaded: true };
        notify();
      }
    }

    return getFields();
  })()
    .then((fields) => {
      if (loadedUsername !== username) {
        return fields;
      }

      state = {
        ...state,
        fields,
        loaded: true,
        refreshing: false,
      };
      loadedUsername = username;

      notify();
      void cacheFields(fields);
      return fields;
    })
    .catch((error) => {
      if (loadedUsername === username) {
        state = { ...state, refreshing: false };
        notify();
      }
      throw error;
    });

  loadingPromise = request;
  loadingUsername = username;
  void request
    .finally(() => {
      if (loadingPromise === request) {
        loadingPromise = null;
        loadingUsername = null;
      }
    })
    .catch(() => undefined);

  return request;
}

// Obrir immediatament i refrescar en segon pla
export function openGardenPicker(): void {
  setGardenPicker({ open: true });

  loadGardenPickerFields(true).catch((error) => {
    console.error('Error actualitzant els camps:', error);
  });
}
