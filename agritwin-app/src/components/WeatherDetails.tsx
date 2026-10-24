import type { ComponentProps } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import {
  capitalize,
  compassIndex,
  dayLabel,
  formatTemperature,
  localTime,
  uvLevel,
  weatherIcon,
} from '@/constants/weather';
import type { FieldWeather } from '@/services/api';
import { styles } from '@/styles/sensor.styles';
import { weatherStyles } from '@/styles/weather.styles';

type Props = {
  weather: FieldWeather;
};

type IconName = ComponentProps<typeof Ionicons>['name'];

const HOURS_SHOWN = 5;
const HOUR_STEP = 2;

function Metric({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.gridItem}>
      <View style={styles.gridItemHeader}>
        <Ionicons name={icon} size={16} color={Colors.light.primaryDark} />
        <Text style={styles.gridLabel}>{label}</Text>
      </View>
      <Text style={styles.gridValue}>{value}</Text>
    </View>
  );
}

export function WeatherDetails({ weather }: Props) {
  const { t } = useTranslation();
  const { current, daily, hourly } = weather;
  const today = daily[0];
  const title = weather.location.name ?? t('weather.myField');
  const compass = t('weather.compass', { returnObjects: true }) as string[];
  const hours = hourly
    .filter((_, index) => index % HOUR_STEP === 0)
    .slice(0, HOURS_SHOWN);

  const rain =
    current.rain_probability === null
      ? '--'
      : `${Math.round(current.rain_probability)}%`;
  const wind =
    current.wind.direction_deg === null
      ? `${Math.round(current.wind.speed)} ${weather.wind_speed_unit}`
      : `${Math.round(current.wind.speed)} ${weather.wind_speed_unit} · ${compass[compassIndex(current.wind.direction_deg)]}`;
  const uv =
    current.uv_index === null
      ? '--'
      : `${Math.round(current.uv_index)} · ${t(`weather.uvLevels.${uvLevel(current.uv_index)}`)}`;

  return (
    <ScrollView
      style={styles.pageScroll}
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
    >
      <View testID="weather-details" style={styles.pageCard}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{t('weather.subtitle')}</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={[styles.heroLeft, weatherStyles.heroLeft]}>
            <Ionicons
              name={weatherIcon(current.condition, current.is_day)}
              size={36}
              color={Colors.light.primaryDark}
            />
            <View style={weatherStyles.heroText}>
              <Text style={styles.heroValue}>
                {formatTemperature(current.temperature)}
              </Text>
              <Text style={styles.heroLabel}>
                {t('weather.today')} ·{' '}
                {capitalize(current.condition.description)}
              </Text>
            </View>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.heroSmall}>
              {t('weather.feelsLike', {
                value: formatTemperature(current.feels_like),
              })}
            </Text>
            {today ? (
              <Text style={styles.heroStrong}>
                {t('weather.highLow', {
                  high: formatTemperature(today.temp_max),
                  low: formatTemperature(today.temp_min),
                })}
              </Text>
            ) : null}
            <Text style={styles.heroSmall}>
              {t('weather.temperaturesIn', {
                unit: weather.temperature_unit,
              })}
            </Text>
          </View>
        </View>

        {hours.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t('weather.todaysOutlook')}
              </Text>
              <Text style={styles.sectionHint}>{t('weather.nextHours')}</Text>
            </View>
            <View style={[styles.measureRow, weatherStyles.hoursRow]}>
              {hours.map((hour, index) => (
                <View key={hour.time} style={styles.measureColumn}>
                  <Text
                    style={[
                      styles.measureLabel,
                      index === 0 && weatherStyles.nowLabel,
                    ]}
                  >
                    {index === 0 ? t('weather.now') : localTime(hour.time)}
                  </Text>
                  <Ionicons
                    name={weatherIcon(
                      hour.condition,
                      hour.condition.icon.endsWith('d'),
                    )}
                    size={22}
                    color={Colors.light.primaryDark}
                  />
                  <Text style={styles.measureValue}>
                    {formatTemperature(hour.temperature)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.grid}>
          <Metric
            icon="umbrella-outline"
            label={t('weather.rainChance')}
            value={today ? `${rain} · ${today.rain_mm} mm` : rain}
          />
          <Metric icon="flag-outline" label={t('weather.wind')} value={wind} />
          <Metric
            icon="water-outline"
            label={t('weather.humidity')}
            value={`${current.humidity}%`}
          />
          <Metric
            icon="sunny-outline"
            label={t('weather.uvIndex')}
            value={uv}
          />
        </View>

        {today ? (
          <View style={styles.rangeRow}>
            <View style={styles.rangeItem}>
              <Ionicons
                name="sunny-outline"
                size={14}
                color={Colors.light.textSecondary}
              />
              <Text style={styles.rangeText}>
                {t('weather.sunrise')} {localTime(today.sunrise)}
              </Text>
            </View>
            <View style={styles.rangeItem}>
              <Ionicons
                name="moon-outline"
                size={14}
                color={Colors.light.textSecondary}
              />
              <Text style={styles.rangeText}>
                {t('weather.sunset')} {localTime(today.sunset)}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t('weather.threeDayForecast')}
          </Text>
        </View>
        <View style={weatherStyles.forecastRow}>
          {daily.slice(0, 3).map((day, index) => (
            <View
              key={day.date}
              style={[
                weatherStyles.forecastCard,
                index === 0 && weatherStyles.forecastCardToday,
              ]}
            >
              <View style={weatherStyles.forecastTop}>
                <Text style={weatherStyles.forecastDay}>
                  {dayLabel(t, day.date, index)}
                </Text>
                <Text style={weatherStyles.forecastTemp}>
                  {formatTemperature(day.temp_max)}
                </Text>
              </View>
              <Ionicons
                name={weatherIcon(day.condition)}
                size={18}
                color={Colors.light.primaryDark}
              />
              <Text style={weatherStyles.forecastDescription}>
                {capitalize(day.condition.description)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
