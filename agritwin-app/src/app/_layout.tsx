import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';

import { getFields, isAuthError } from '../services/api';
import { clearAuth, getAuth } from '../services/auth';
import '../../i18n';

export default function RootLayout() {
  const segments = useSegments();

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const auth = await getAuth();

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
      try {
        const fields = await getFields();
        if (!active) {
          return;
        }
        router.replace(fields.length === 0 ? '/create-field' : '/app/home');
      } catch (error) {
        if (isAuthError(error)) {
          await clearAuth();
          router.replace('/auth/login');
          return;
        }
        router.replace('/app/home');
      }
    }

    async function keepCreateFieldIfNeeded() {
      try {
        const fields = await getFields();
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
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        presentation: 'card',
      }}
    />
  );
}
