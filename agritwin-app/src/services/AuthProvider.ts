import { useEffect } from 'react';
import { router } from 'expo-router';
import { getAuth } from '../services/auth';

export default function AppLayout() {
  useEffect(() => {
    async function checkAuth() {
      const auth = await getAuth();

      if (auth?.token) {
        router.replace('/app/home');
      } else {
        router.replace('/auth/login');
      }
    }

    checkAuth();
  }, []);

  return null;
}