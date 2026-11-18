import { useEffect } from 'react';

import { subscribeMe, type Me } from '@/services/api';
import { meQuery, queryKeys } from '@/services/queries';
import { queryClient } from '@/services/queryClient';
import { useCachedQuery } from './use-cached-query';

/** Whether the user wants weather alerts (profile option, cached). */
export function useWeatherAlertsEnabled() {
  const { data } = useCachedQuery(meQuery());

  useEffect(
    () =>
      // A profile saved on the settings screen updates the cache at once.
      subscribeMe((me: Me) => {
        queryClient.setQueryData(queryKeys.me, me);
      }),
    [],
  );

  return data?.weather_alerts_enabled ?? true;
}
