import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

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
};

export function FieldCropsCard({ state, onRetry }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('fieldCrops.title')}</Text>
        <Image
          source={require('@assets/images/add_circle.png')}
          style={styles.addIcon}
        />
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
                  <Image
                    source={require('@assets/images/target.png')}
                    style={styles.target}
                  />
                }
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
