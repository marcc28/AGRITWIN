import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, type Href } from 'expo-router';

import type { FieldCrop } from '../services/api_fieldCrops';
import { styles } from '@/styles/fieldcrops.styles';
import { FieldCropDetails } from './FieldCropDetails';

type Props = {
  state: {
    status: 'loading' | 'success' | 'error';
    data: FieldCrop[];
    error?: string;
  };
  onRetry: () => void;
  onAdd: () => void;
  addDisabled?: boolean;
};

export function FieldCropsCard({
  state,
  onRetry,
  onAdd,
  addDisabled = false,
}: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('fieldCrops.title')}</Text>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cropsRow}
        >
          {state.data.length === 0 ? (
            <Text style={styles.emptyText}>{t('fieldCrops.empty')}</Text>
          ) : (
            state.data.map((crop) => (
              <FieldCropDetails
                key={crop.id}
                crop={crop}
                action={
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/recommendations/[fieldId]',
                        params: {
                          fieldId: String(crop.field_id),
                        },
                      } as unknown as Href)
                    }
                    style={styles.targetButton}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={t('recommendations.open')}
                  >
                    <Image
                      source={require('@assets/images/target.png')}
                      style={styles.target}
                    />
                  </Pressable>
                }
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
