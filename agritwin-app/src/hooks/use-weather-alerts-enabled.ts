import { useEffect, useState } from 'react';

import { getMe, subscribeMe, type Me } from '@/services/api';

export function useWeatherAlertsEnabled() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let active = true;

    const update = (me: Me) => {
      if (active) {
        setEnabled(me.weather_alerts_enabled);
      }
    };

    void getMe()
      .then(update)
      .catch(() => undefined);
    const unsubscribe = subscribeMe(update);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return enabled;
}
