import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router, type Href } from 'expo-router';

import type { FieldCrop } from '../services/api_fieldCrops';
import { getFieldCropsStyles } from '@/styles/fieldcrops.styles';
import { FieldCropDetails } from './FieldCropDetails';

type Props = {
  state: {
    status: 'loading' | 'success' | 'error';
    data: FieldCrop[];
    error?: string;
  };
  onRetry: () => void;
  onAdd: () => void;
  onEdit?: () => void;
  addDisabled?: boolean;
  loadingMore?: boolean;
};

export function FieldCropsCard({
  state,
  onRetry,
  onAdd,
  onEdit,
  addDisabled = false,
  loadingMore = false,
}: Props) {
  const { t } = useTranslation();
  const dimensions = useWindowDimensions();
  const [cardWidth, setCardWidth] = useState(0);
  const availableWidth = cardWidth || Math.max(320, dimensions.width - 32);
  const styles = getFieldCropsStyles(availableWidth, dimensions.height);

  function onCardLayout(event: LayoutChangeEvent) {
    setCardWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={styles.card} onLayout={onCardLayout}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('fieldCrops.title')}</Text>
        <View style={styles.headerActions}>
          {onEdit ? (
            <Pressable
              onPress={onEdit}
              disabled={addDisabled}
              style={styles.headerActionButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('settings.manageCrops.editCrops')}
            >
              <Ionicons name="create-outline" size={25} color="#3D8B55" />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onAdd}
            disabled={addDisabled}
            style={styles.addButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('settings.manageCrops.addCrop')}
          >
            <Image
              source={require('@assets/images/add_circle.png')}
              style={styles.addIcon}
            />
          </Pressable>
        </View>
      </View>

      {state.status === 'loading' && (
        <ActivityIndicator size="small" color="#3D8B55" />
      )}

      {state.status === 'error' && (
        <View>
          <Text style={styles.errorText}>{t('fieldCrops.loadError')}</Text>

          <Pressable onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>{t('fieldCrops.retry')}</Text>
          </Pressable>
        </View>
      )}

      {state.status === 'success' && (
        <View style={styles.cropsGrid}>
          {state.data.length === 0 ? (
            <Text style={styles.emptyText}>{t('fieldCrops.empty')}</Text>
          ) : (
            state.data.map((crop) => (
              <FieldCropDetails
                key={crop.id}
                crop={crop}
                availableWidth={availableWidth}
                action={
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/recommendations/[fieldId]',
                        params: {
                          fieldId: String(crop.field_id),
                          fieldName: crop.field_name,
                        },
                      } as unknown as Href)
                    }
                    style={styles.targetButton}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={t('recommendations.open')}
                  >
                    <Text style={styles.targetButtonText}>
                      {t('recommendations.view')}
                    </Text>
                  </Pressable>
                }
              />
            ))
          )}
        </View>
      )}

      {state.status === 'success' && loadingMore ? (
        <ActivityIndicator
          style={styles.loadMoreIndicator}
          size="small"
          color="#3D8B55"
        />
      ) : null}
    </View>
  );
}
