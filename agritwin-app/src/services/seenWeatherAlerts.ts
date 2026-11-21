import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SEEN_ALERTS_KEY = 'agritwin_seen_weather_alerts';
const MAX_SEEN_ALERTS = 20;

let seenAlerts: string[] | null = null;

async function readSeenAlerts(): Promise<string[]> {
  try {
    const raw =
      Platform.OS === 'web'
        ? localStorage.getItem(SEEN_ALERTS_KEY)
        : await SecureStore.getItemAsync(SEEN_ALERTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((key): key is string => typeof key === 'string')
      : [];
  } catch {
    return [];
  }
}

async function saveSeenAlerts(keys: string[]) {
  const value = JSON.stringify(keys);
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(SEEN_ALERTS_KEY, value);
    } else {
      await SecureStore.setItemAsync(SEEN_ALERTS_KEY, value);
    }
  } catch {
    // The alerts are still marked as seen until the app is closed.
  }
}

export async function getSeenAlerts(): Promise<string[]> {
  seenAlerts ??= await readSeenAlerts();
  return seenAlerts;
}

export async function markAlertSeen(key: string): Promise<void> {
  const seen = await getSeenAlerts();
  seenAlerts = [...seen.filter((item) => item !== key), key].slice(
    -MAX_SEEN_ALERTS,
  );
  await saveSeenAlerts(seenAlerts);
}
