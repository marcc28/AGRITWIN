import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { WeatherCard } from '@/components/WeatherCard';
import { useCurrentField } from '@/hooks/use-current-field';
import { useFieldWeather } from '@/hooks/use-field-weather';
import { styles } from '@/styles/home.styles';

export default function HomeScreen() {
  const { i18n } = useTranslation();
  const field = useCurrentField();
  const { state, retry } = useFieldWeather(field?.id ?? null, i18n.language);

  const weather =
    field === undefined ? ({ status: 'loading' } as const) : state;

  const today = new Date()
    .toLocaleDateString('ca', {
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View testID="home-screen" style={styles.content}>
          <Text style={styles.date}>{today}</Text>
          <Text style={styles.title}>El teu hort,{'\n'}cada dia millor.</Text>
          <Text style={styles.subtitle}>
            Tasques, temps i cultius adaptats al teu hort.
          </Text>

          <WeatherCard state={weather} onPress={openWeather} onRetry={retry} />
        </View>
      </ScrollView>
    </View>
  );
}
