import { router } from 'expo-router';

import { getFields } from './api';

export async function routeAfterAuth() {
  const fields = await getFields();
  if (fields.length === 0) {
    router.replace('/create-field');
    return;
  }
  router.replace('/app/home');
}
