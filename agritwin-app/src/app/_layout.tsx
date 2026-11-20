import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import AgritwinLoadingScreen from '../components/AgritwinLoadingScreen';

import { isAuthError } from '../services/api';
import { setupAppFocusRefetch } from '../services/appFocus';
import { clearAuth, getAuth, refreshAuth } from '../services/auth';
import { getCurrentField } from '../services/currentField';
import {
  getCachedGardenPickerFields,
  loadGardenPickerFields,
} from '../services/gardenPicker';
import { preloadAppData } from '../services/queries';
import { queryClient } from '../services/queryClient';
import { persistOptions } from '../services/queryPersistence';
import '../../i18n';

export default function RootLayout() {
  const segments = useSegments();
  const { t } = useTranslation();
  // The single loading screen of the app: shown while the session is
  // checked and, the first time, while all the data is loaded.
  const [preparing, setPreparing] = useState(true);

  useEffect(() => setupAppFocusRefetch(), []);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        await routeBySession();
      } finally {
        if (active) {
          setPreparing(false);
        }
      }
    }

    async function routeBySession() {
      let auth = await getAuth();

      if (!auth?.token && auth?.refreshToken) {
        try {
          await refreshAuth();
          auth = await getAuth();
        } catch {
          await clearAuth();
          router.replace('/auth/login');
          return;
        }
      }

      if (!active) return;

      const inAuthGroup = segments[0] === 'auth';
      const onCreateField = segments[0] === 'create-field';

      if (auth?.token && inAuthGroup) {
        await sendToApp();
        return;
      }

      if (auth?.token && !onCreateField) {
        await keepCreateFieldIfNeeded();
        return;
      }

      if (!auth?.token && !inAuthGroup) {
        router.replace('/auth/login');
      }
    }

    async function sendToApp() {
      // With the gardens saved from the last session the app opens at once;
      // the list is refreshed in the background.
      const cached = await getCachedGardenPickerFields();
      if (!active) {
        return;
      }
      if (cached) {
        router.replace(
          cached.length === 0 ? '/create-field' : '/field-selection',
        );
        loadGardenPickerFields().catch(async (error: unknown) => {
          if (isAuthError(error)) {
            await clearAuth();
            router.replace('/auth/login');
          }
        });
        return;
      }

      // Nothing saved yet (first start or after logout): everything is
      // loaded once behind the loading screen, then every page is instant.
      setPreparing(true);
      try {
        const fields = await loadGardenPickerFields();
        const current = await getCurrentField().catch(() => null);
        await preloadAppData(current?.id ?? null, i18next.language);
        if (!active) {
          return;
        }
        router.replace(
          fields.length === 0 ? '/create-field' : '/field-selection',
        );
      } catch (error) {
        if (isAuthError(error)) {
          await clearAuth();
          router.replace('/auth/login');
          return;
        }
        router.replace('/field-selection');
      }
    }

    async function keepCreateFieldIfNeeded() {
      try {
        const fields = await loadGardenPickerFields();
        if (!active) {
          return;
        }
        if (fields.length === 0) {
          router.replace('/create-field');
        }
      } catch (error) {
        if (isAuthError(error)) {
          await clearAuth();
          router.replace('/auth/login');
        }
      }
    }

    void checkAuth().catch(() => undefined);

    return () => {
      active = false;
    };
  }, [segments]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          presentation: 'card',
        }}
      />
      {preparing ? (
        <View style={StyleSheet.absoluteFill}>
          <AgritwinLoadingScreen label={t('startup.loading')} />
        </View>
      ) : null}
    </PersistQueryClientProvider>
  );
}
