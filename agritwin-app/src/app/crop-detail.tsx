import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FieldCropsSection } from '../components/FieldCropsSection';
import { useCachedQuery } from '../hooks/use-cached-query';
import { fieldDetailQuery } from '../services/queries';
import { getCropDetailStyles } from '../styles/crop-detail.styles';
import { Colors } from '../constants/theme';
import { parseId } from '../utils/parseId';

export default function CropDetailScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const styles = getCropDetailStyles(width, height);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const fieldId = parseId(params.id);
  const validId = Number.isFinite(fieldId);

  const fieldResult = useCachedQuery({
    ...fieldDetailQuery(fieldId),
    enabled: validId,
  });

  const field = fieldResult.data;
  const errorMessage = !validId
    ? t('settings.errors.invalidId')
    : !field && fieldResult.isError
      ? fieldResult.error instanceof Error
        ? fieldResult.error.message
        : t('settings.errors.loadGarden')
      : '';

  function goBack() {
    router.replace('/app/crops');
  }

  function editCrops() {
    router.push({
      pathname: '/editar_crops',
      params: { id: String(fieldId) },
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          <Pressable style={styles.backRow} onPress={goBack}>
            <Ionicons
              name="chevron-back"
              size={18}
              color={Colors.light.textSecondary}
            />
            <Text style={styles.backText}>
              {t('settings.manageCrops.back')}
            </Text>
          </Pressable>

          <Text style={styles.eyebrow}>{t('settings.manageCrops.title')}</Text>
          <Text style={styles.title}>
            {field?.name ?? t('settings.fieldDetail.crops')}
          </Text>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          {validId && !field && !fieldResult.isError ? (
            <Text style={styles.emptyText}>{t('settings.loading')}</Text>
          ) : null}

          {field ? (
            <>
              <FieldCropsSection fieldId={fieldId} responsive />
              <Pressable
                style={styles.editButton}
                onPress={editCrops}
                accessibilityRole="button"
                accessibilityLabel={t('settings.manageCrops.editCrops')}
              >
                <Text style={styles.editText}>
                  {t('settings.manageCrops.editCrops')}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
