// app/recommendations/[fieldId].tsx

import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useFieldRecommendations } from '@/hooks/use-field-recommendations';

import { useColorScheme } from 'react-native';
import { createRecommendationsStyles } from '@/styles/recommendations.styles';

import type { Recommendation } from '@/services/api_recommendations';

function RecommendationCard({
  recommendation,
}: {
  recommendation: Recommendation;
}) {
  const { t, i18n } = useTranslation();

  const severityColors: Record<string, string> = {
    info: '#4682B4',
    low: '#69A96B',
    medium: '#E5A63B',
    high: '#D9534F',
  };

  const colorScheme = useColorScheme();
  const styles = createRecommendationsStyles(colorScheme === 'dark');

  const severityColor = severityColors[recommendation.severity] ?? '#777777';

  const dateFormat = (date: string) =>
    new Date(date).toLocaleDateString(i18n.resolvedLanguage || 'ca', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
   
  return (
    <View style={styles.recommendationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryContainer}>
          <Text style={styles.category}>
            {t(`recommendations.categories.${recommendation.category}`, {
              defaultValue: recommendation.category,
            })}
          </Text>
        </View>

        <View
          style={[styles.severityBadge, { backgroundColor: severityColor }]}
        >
          <Text style={styles.severityText}>
            {t(`recommendations.severities.${recommendation.severity}`, {
              defaultValue: recommendation.severity,
            })}
          </Text>
        </View>
      </View>

      <Text style={styles.recommendationTitle}>{recommendation.title}</Text>

      <Text style={styles.description}>{recommendation.description}</Text>

      {/* Motiu de la recomanació */}
      <View style={styles.reasonContainer}>
        <Text style={styles.reasonTitle}>{t('recommendations.basedOn')}</Text>

        <Text style={styles.reason}>
          {recommendation.based_on?.reason ?? ''}
        </Text>

        {(recommendation.based_on?.data ?? []).map((item, index) => (
          <Text key={`${recommendation.id}-${index}`} style={styles.dataItem}>
            • {item}
          </Text>
        ))}
      </View>

      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>
          {t('recommendations.generatedAt')}:{' '}
          {dateFormat(recommendation.generated_at)}
        </Text>

        <Text style={styles.dateText}>
          {t('recommendations.expiresAt')}:{' '}
          {dateFormat(recommendation.expires_at)}
        </Text>
      </View>
    </View>
  );
}

export default function RecommendationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const colorScheme = useColorScheme();
  const styles = createRecommendationsStyles(colorScheme === 'dark');

  const { fieldId } = useLocalSearchParams<{
    fieldId: string;
  }>();

  const { status, data, retry } = useFieldRecommendations(fieldId ?? null);

  console.log('📌 Recommendations status:', status);
  console.log('📌 Recommendations count:', data?.length);
  console.log('📌 Recommendations data:', JSON.stringify(data, null, 2));
  data?.forEach((recommendation, index) => {
    console.log(`Recomanació ${index + 1}:`, {
      id: recommendation.id,
      title: recommendation.title,
      severity: recommendation.severity,
      category: recommendation.category,
    });
  });
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: t('recommendations.screenTitle'),
          headerBackTitle: t('common.back', {
            defaultValue: t('recommendations.back'),
          }),
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', {
            defaultValue: t('recommendations.back'),
          })}
          hitSlop={8}
          style={styles.backButton}
        >
          <Image
            source={require('@assets/images/left_arrow.png')}
            style={styles.backButtonIcon}
            resizeMode="contain"
          />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>{t('recommendations.title')}</Text>

          <Text style={styles.subtitle}>{t('recommendations.subtitle')}</Text>

          <Text style={styles.fieldLabel}>
            {t('recommendations.field')} #{fieldId}
          </Text>
        </View>

        {status === 'loading' && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3D8B55" />

            <Text style={styles.loadingText}>
              {t('recommendations.loading')}
            </Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>
              {t('recommendations.loadError')}
            </Text>

            <Pressable onPress={retry} style={styles.retryButton}>
              <Text style={styles.retryText}>{t('recommendations.retry')}</Text>
            </Pressable>
          </View>
        )}

        {status === 'success' && (
          <>
            {data.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                  {t('recommendations.emptyTitle')}
                </Text>

                <Text style={styles.emptyText}>
                  {t('recommendations.emptyDescription')}
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.resultsCount}>
                  {t('recommendations.results', {
                    count: data.length,
                  })}
                </Text>

                {data.map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
