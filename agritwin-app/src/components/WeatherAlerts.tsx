import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { activeAlerts, alertIcon } from '@/constants/weather';
import type { FieldWeather, WeatherAlert } from '@/services/api';
import { styles } from '@/styles/sensor.styles';
import { weatherStyles } from '@/styles/weather.styles';

const BANNER_HEIGHT = 160;

type RowProps = {
  alert: WeatherAlert;
  now: boolean;
};

function AlertRow({ alert, now }: Readonly<RowProps>) {
  return (
    <View
      testID={`weather-alert-${now ? 'now' : 'expected'}-${alert.type}`}
      style={[weatherStyles.alertRow, now && weatherStyles.alertRowNow]}
    >
      <Ionicons
        name={alertIcon(alert.type)}
        size={20}
        color={now ? Colors.light.dangerText : Colors.light.primaryDark}
      />
      <Text
        style={[weatherStyles.alertText, now && weatherStyles.alertTextNow]}
      >
        {alert.message}
      </Text>
    </View>
  );
}

export function WeatherAlertList({
  weather,
}: Readonly<{ weather: FieldWeather }>) {
  const { t } = useTranslation();
  const { currentAlerts, alerts } = activeAlerts(weather);

  return (
    <View testID="weather-alerts" style={weatherStyles.alertList}>
      {currentAlerts.map((alert) => (
        <AlertRow key={`now-${alert.type}`} alert={alert} now />
      ))}
      {alerts.map((alert) => (
        <AlertRow key={`expected-${alert.type}`} alert={alert} now={false} />
      ))}
      {currentAlerts.length > 0 || alerts.length > 0 ? null : (
        <View testID="weather-no-alerts" style={weatherStyles.alertRow}>
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color={Colors.light.primaryDark}
          />
          <Text style={weatherStyles.alertText}>{t('weather.noAlerts')}</Text>
        </View>
      )}
    </View>
  );
}

type BannerProps = {
  alert: WeatherAlert;
  now: boolean;
  position: number;
  total: number;
  onOpen: () => void;
  onClose: () => void;
};

export function WeatherAlertBanner({
  alert,
  now,
  position,
  total,
  onOpen,
  onClose,
}: Readonly<BannerProps>) {
  const { t } = useTranslation();
  const offset = useRef(new Animated.Value(-BANNER_HEIGHT)).current;

  useEffect(() => {
    Animated.timing(offset, {
      toValue: 0,
      duration: 250,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [offset]);

  return (
    <Animated.View
      style={[weatherStyles.banner, { transform: [{ translateY: offset }] }]}
    >
      <View
        style={[weatherStyles.bannerBody, now && weatherStyles.bannerBodyNow]}
      >
        <Pressable
          testID="weather-alert-banner"
          accessibilityRole="button"
          style={weatherStyles.bannerContent}
          onPress={onOpen}
        >
          <Ionicons
            name={alertIcon(alert.type)}
            size={24}
            color={now ? Colors.light.dangerText : Colors.light.primaryDark}
          />
          <View style={weatherStyles.bannerText}>
            <Text style={weatherStyles.bannerTitle}>
              {total > 1
                ? `${t('weather.alertsTitle')} · ${position}/${total}`
                : t('weather.alertsTitle')}
            </Text>
            <Text
              style={[
                weatherStyles.alertText,
                now && weatherStyles.alertTextNow,
              ]}
            >
              {alert.message}
            </Text>
          </View>
        </Pressable>
        <Pressable
          testID="weather-alert-close"
          accessibilityRole="button"
          accessibilityLabel={t('weather.close')}
          style={styles.closeButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={18} color={Colors.light.text} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
