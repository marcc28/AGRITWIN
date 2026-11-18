import { AppState, Platform, type AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

/**
 * When the app comes back from the background, every visible query whose
 * data is stale is refreshed, so the user never keeps looking at old data.
 * On web the browser focus events are used automatically.
 */
export function setupAppFocusRefetch(): () => void {
  if (Platform.OS === 'web') {
    return () => undefined;
  }

  const subscription = AppState.addEventListener(
    'change',
    (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    },
  );

  return () => subscription.remove();
}
