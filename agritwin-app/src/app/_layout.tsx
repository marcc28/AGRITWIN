import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';

import { getAuth } from '../services/auth';
import '../../i18n';

export default function RootLayout() {
  const segments = useSegments();

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const auth = await getAuth();

      if (!active) return;

      const inAuthGroup = segments[0] === 'auth';

      if (auth?.token && inAuthGroup) {
        router.replace('/app/home');
        return;
      }

      if (!auth?.token && !inAuthGroup) {
        router.replace('/auth/login');
      }
    }

    void checkAuth().catch((error: unknown) => {
      console.error('Error comprovant l autenticació:', error);
    });

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
