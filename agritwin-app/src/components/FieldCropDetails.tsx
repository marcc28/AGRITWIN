import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { FieldCrop } from '@/services/api_fieldCrops';
import { styles } from '@/styles/fieldcrops.styles';

type Props = {
  crop: FieldCrop;
  action?: ReactNode;
};

export function FieldCropDetails({ crop, action }: Props) {
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.crop}>
      <View style={styles.cropHeader}>
        <Text style={styles.cropTitle}>
          {crop.crop_name ?? t('fieldCrops.crop', { id: crop.crop_id })}
        </Text>
        {action}
      </View>
      <Text style={styles.cropDetail}>
        {t('fieldCrops.planted')}:{' '}
        {crop.planted_at
          ? new Date(crop.planted_at).toLocaleDateString(i18n.resolvedLanguage)
          : t('fieldCrops.noDate')}
      </Text>
      {crop.expected_harvest_at && (
        <Text style={styles.cropDetail}>
          {t('fieldCrops.expectedHarvest')}:{' '}
          {new Date(crop.expected_harvest_at).toLocaleDateString(
            i18n.resolvedLanguage,
          )}
        </Text>
      )}
      <Text style={styles.cropStatus}>
        {t('fieldCrops.status')}:{' '}
        {t(`fieldCrops.statuses.${crop.status}`, { defaultValue: crop.status })}
      </Text>
    </View>
  );
}
