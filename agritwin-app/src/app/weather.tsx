import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { WeatherDetails } from '../components/WeatherDetails';
import { Colors } from '../constants/theme';
import { useFieldWeather } from '../hooks/use-field-weather';
import { styles } from '../styles/field-detail.styles';
import { weatherStyles } from '../styles/weather.styles';
import { parseId } from '../utils/parseId';

const MESSAGES = {
  loading: 'weather.loading',
  error: 'weather.error',
  'no-field': 'weather.noField',
  'no-location': 'weather.noLocation',
  'no-data': 'weather.noData',
} as const;

function goHome() {
  router.replace('/app/home');
}

export default function WeatherScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const fieldId = parseId(params.id);
  const { state, retry } = useFieldWeather(
    Number.isFinite(fieldId) ? fieldId : null,
    i18n.language,
  );

  return (
    <View testID="weather-screen" style={styles.screen}>
      <View style={styles.dataHeader}>
        <Pressable
          testID="weather-back"
          accessibilityRole="button"
          style={styles.backRow}
          onPress={goHome}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={Colors.light.textSecondary}
          />
          <Text style={styles.backText}>{t('weather.back')}</Text>
        </Pressable>

        {state.status === 'ready' ? null : (
          <Text
            testID={`weather-${state.status}`}
            style={
              state.status === 'error' ? styles.errorText : styles.emptyText
            }
          >
            {t(MESSAGES[state.status])}
          </Text>
        )}

        {state.status === 'error' ? (
          <Pressable
            testID="weather-retry"
            accessibilityRole="button"
            onPress={retry}
            style={({ pressed }) => [
              weatherStyles.retryButton,
              pressed && weatherStyles.pressed,
            ]}
          >
            <Text style={weatherStyles.retryText}>{t('weather.retry')}</Text>
          </Pressable>
        ) : null}
      </View>

      {state.status === 'ready' ? (
        <WeatherDetails weather={state.weather} />
      ) : null}
    </View>
  );
}
