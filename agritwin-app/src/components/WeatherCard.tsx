import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { dayLabel, formatTemperature, weatherIcon } from '@/constants/weather';
import type { FieldWeatherState } from '@/hooks/use-field-weather';
import { styles } from '@/styles/sensor.styles';
import { weatherStyles } from '@/styles/weather.styles';

type Props = {
  state: FieldWeatherState;
  onPress: () => void;
  onRetry: () => void;
};

export function WeatherCard({ state, onPress, onRetry }: Readonly<Props>) {
  const { t } = useTranslation();

  if (state.status === 'loading') {
    return (
      <View
        testID="weather-loading"
        style={[styles.card, weatherStyles.card]}
        accessibilityLabel={t('weather.loading')}
      >
        <ActivityIndicator color={Colors.light.primary} />
      </View>
    );
  }

  if (state.status !== 'ready') {
    const messages = {
      error: 'weather.error',
      'no-location': 'weather.noLocation',
      'no-field': 'weather.noField',
      'no-data': 'weather.noData',
    } as const;

    return (
      <View
        testID={`weather-${state.status}`}
        style={[styles.card, weatherStyles.card]}
      >
        <Text style={styles.cardTitle}>{t('weather.subtitle')}</Text>
        <Text style={styles.emptyText}>{t(messages[state.status])}</Text>

        {state.status === 'error' ? (
          <Pressable
            testID="weather-retry"
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [
              weatherStyles.retryButton,
              pressed && weatherStyles.pressed,
            ]}
          >
            <Text style={weatherStyles.retryText}>{t('weather.retry')}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const { weather } = state;
  const title = weather.location.name ?? t('weather.myField');

  return (
    <Pressable
      testID="weather-card"
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, weatherStyles.card]}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{t('weather.subtitle')}</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={Colors.light.textMuted}
        />
      </View>

      <View style={styles.measureRow}>
        {weather.daily.slice(0, 3).map((day, index) => (
          <View key={day.date} style={styles.measureColumn}>
            <Text style={styles.measureLabel}>
              {dayLabel(t, day.date, index)}
            </Text>
            <Ionicons
              name={weatherIcon(day.condition)}
              size={22}
              color={Colors.light.primaryDark}
            />
            <Text style={styles.measureValue}>
              {formatTemperature(day.temp_max)}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}
