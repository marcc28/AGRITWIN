import { useEffect } from 'react';
import { router } from 'expo-router';
import { getAuth } from './auth';
import { routeAfterAuth } from './routeAfterAuth';

export default function AppLayout() {
  useEffect(() => {
    async function checkAuth() {
      const auth = await getAuth();

      if (auth?.token) {
        await routeAfterAuth();
      } else {
        router.replace('/auth/login');
      }
    }

    checkAuth();
  }, []);

  return null;
}
