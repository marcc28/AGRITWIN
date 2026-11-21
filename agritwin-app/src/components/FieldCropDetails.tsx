import type { ReactNode } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { FieldCrop } from '@/services/api_fieldCrops';
import { getFieldCropsStyles } from '@/styles/fieldcrops.styles';

type Props = {
  crop: FieldCrop;
  action?: ReactNode;
  availableWidth?: number;
};

export function FieldCropDetails({ crop, action, availableWidth }: Props) {
  const { t, i18n } = useTranslation();
  const dimensions = useWindowDimensions();
  const styles = getFieldCropsStyles(
    availableWidth ?? Math.max(320, dimensions.width - 32),
    dimensions.height,
  );

  return (
    <View style={styles.crop}>
      <Text style={styles.cropTitle}>
        {crop.crop_name ?? t('fieldCrops.crop', { id: crop.crop_id })}
      </Text>
      <View style={styles.cropInfo}>
        <Text style={styles.cropDetail}>
          {t('fieldCrops.planted')}:{' '}
          {crop.planted_at
            ? new Date(`${crop.planted_at}T00:00:00`).toLocaleDateString(
                i18n.resolvedLanguage,
              )
            : t('fieldCrops.noDate')}
        </Text>
        {crop.expected_harvest_at ? (
          <Text style={styles.cropDetail}>
            {t('fieldCrops.expectedHarvest')}:{' '}
            {new Date(
              `${crop.expected_harvest_at}T00:00:00`,
            ).toLocaleDateString(i18n.resolvedLanguage)}
          </Text>
        ) : null}
        <Text style={styles.cropStatus}>
          {t('fieldCrops.status')}:{' '}
          {t(`fieldCrops.statuses.${crop.status}`, {
            defaultValue: crop.status,
          })}
        </Text>
      </View>
      {action}
    </View>
  );
}
