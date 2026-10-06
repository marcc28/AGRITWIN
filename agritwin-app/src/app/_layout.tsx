import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';

import { getAuth } from '../services/auth';
import '../../i18n';

export default function RootLayout() {
  const segments = useSegments();

  useEffect(() => {
    async function checkAuth() {
      const auth = await getAuth();

      const inAuthGroup = segments[0] === 'auth';

      if (auth?.token && inAuthGroup) {
        router.replace('/app/home');
        return;
      }

      if (!auth?.token && !inAuthGroup) {
        router.replace('/auth/login');
      }
    }

    checkAuth();
  }, [segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}