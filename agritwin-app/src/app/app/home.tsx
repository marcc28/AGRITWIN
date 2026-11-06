import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { WeatherCard } from '@/components/WeatherCard';
import { FieldCropsCard } from '@/components/FieldCropsCard';

import { useCurrentField } from '@/hooks/use-current-field';
import { useFieldWeather } from '@/hooks/use-field-weather';
import { useFieldCrops } from '@/hooks/use-field-crops';
import { createAddCropHandler } from '@/services/fieldCropNavigation';

import { styles } from '@/styles/home.styles';

export default function HomeScreen() {
  const { i18n, t } = useTranslation();

  const field = useCurrentField();

  const { state, retry } = useFieldWeather(field?.id ?? null, i18n.language);

  const crops = useFieldCrops(field ? Number(field.id) : null);
  const openAddCrop = createAddCropHandler(field, router.push);

  const weather =
    field === undefined ? ({ status: 'loading' } as const) : state;

  const today = new Date()
    .toLocaleDateString(i18n.resolvedLanguage, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    .toUpperCase();

  function openWeather() {
    if (field) {
      router.push({
        pathname: '/weather',
        params: { id: String(field.id) },
      });
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View testID="home-screen" style={styles.content}>
          <Text style={styles.date}>{today}</Text>

          <Text style={styles.title}>
            {t('home.titleFirst')}
            {'\n'}
            {t('home.titleSecond')}
          </Text>

          <Text style={styles.subtitle}>{t('home.subtitle')}</Text>

          <WeatherCard state={weather} onPress={openWeather} onRetry={retry} />
          <FieldCropsCard
            state={crops}
            onRetry={crops.retry}
            onAdd={openAddCrop}
            addDisabled={!field}
          />
        </View>
      </ScrollView>
    </View>
  );
}
