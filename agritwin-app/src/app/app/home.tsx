import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { WeatherAlertBanner } from '@/components/WeatherAlerts';
import { WeatherCard } from '@/components/WeatherCard';
import { activeAlerts } from '@/constants/weather';
import { useCurrentField } from '@/hooks/use-current-field';
import { useFieldWeather } from '@/hooks/use-field-weather';
import { useWeatherAlertsEnabled } from '@/hooks/use-weather-alerts-enabled';
import type { WeatherAlert } from '@/services/api';
import { getSeenAlerts, markAlertSeen } from '@/services/seenWeatherAlerts';
import { styles } from '@/styles/home.styles';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const field = useCurrentField();
  const { state, retry } = useFieldWeather(field?.id ?? null, i18n.language);
  const alertsEnabled = useWeatherAlertsEnabled();
  const [seenAlerts, setSeenAlerts] = useState<string[] | null>(null);

  useEffect(() => {
    let active = true;
    void getSeenAlerts().then((seen) => {
      if (active) {
        setSeenAlerts(seen);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const weather =
    field === undefined ? ({ status: 'loading' } as const) : state;

  const today = new Date()
    .toLocaleDateString(i18n.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    .toUpperCase();

  function openWeather() {
    if (field) {
      router.push({ pathname: '/weather', params: { id: String(field.id) } });
    }
  }

  const queue: { key: string; alert: WeatherAlert; now: boolean }[] = [];
  if (alertsEnabled && weather.status === 'ready') {
    const { currentAlerts, alerts } = activeAlerts(weather.weather);
    currentAlerts.forEach((alert) =>
      queue.push({
        key: `${field?.id}:now:${alert.type}:${alert.day}`,
        alert,
        now: true,
      }),
    );
    alerts.forEach((alert) =>
      queue.push({
        key: `${field?.id}:${alert.type}:${alert.starts_at ?? alert.day}`,
        alert,
        now: false,
      }),
    );
  }
  const pending =
    seenAlerts === null
      ? []
      : queue.filter((item) => !seenAlerts.includes(item.key));
  const next = pending[0];

  function closeAlert() {
    if (next) {
      const { key } = next;
      setSeenAlerts((seen) => [...(seen ?? []), key]);
      void markAlertSeen(key);
    }
  }

  function openAlert() {
    closeAlert();
    openWeather();
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View testID="home-screen" style={styles.content}>
          <Text style={styles.date}>{today}</Text>
          <Text style={styles.title}>{t('home.title')}</Text>
          <Text style={styles.subtitle}>{t('home.subtitle')}</Text>

          <WeatherCard state={weather} onPress={openWeather} onRetry={retry} />
        </View>
      </ScrollView>

      {next ? (
        <WeatherAlertBanner
          key={next.key}
          alert={next.alert}
          now={next.now}
          position={queue.length - pending.length + 1}
          total={queue.length}
          onOpen={openAlert}
          onClose={closeAlert}
        />
      ) : null}
    </View>
  );
}
