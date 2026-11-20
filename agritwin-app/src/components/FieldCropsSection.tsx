import { Text, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useCachedQuery } from '../hooks/use-cached-query';
import { cropCatalogQuery, fieldCropsQuery } from '../services/queries';
import { styles as fieldStyles } from '../styles/field-detail.styles';

interface FieldCropsSectionProps {
  fieldId: number;
  responsive?: boolean;
}

const VALID_STATUSES = ['planned', 'planted', 'harvested'] as const;

export function FieldCropsSection({
  fieldId,
  responsive = false,
}: FieldCropsSectionProps) {
  const { t } = useTranslation();
  const dimensions = useWindowDimensions();
  const styles = {
    ...fieldStyles,
    cropsList: { gap: 10, alignSelf: 'stretch' as const },
    cropRow: { ...fieldStyles.cropRow, minWidth: 0, flexWrap: 'wrap' as const },
    cropName: { ...fieldStyles.cropName, minWidth: 0 },
    status: { ...fieldStyles.status, flexShrink: 1, maxWidth: '100%' as const },
    sectionTitle: {
      ...fieldStyles.sectionTitle,
      fontSize: responsive && dimensions.width < 360 ? 12 : 13,
    },
  };

  const cropsResult = useCachedQuery({
    ...fieldCropsQuery(fieldId),
    enabled: Number.isFinite(fieldId),
  });

  const catalogResult = useCachedQuery({
    ...cropCatalogQuery(),
    enabled: Number.isFinite(fieldId),
  });

  const fieldCrops = cropsResult.data ?? [];
  const cropCatalog = catalogResult.data ?? [];

  const cropsFailure =
    (!cropsResult.data && cropsResult.error) ||
    (!catalogResult.data && catalogResult.error);

  const cropsError = cropsFailure
    ? cropsFailure instanceof Error
      ? cropsFailure.message
      : t('settings.errors.loadCrops')
    : '';

  return (
    <View style={styles.card} testID="field-crops-card">
      <Text style={styles.sectionTitle}>{t('settings.fieldDetail.crops')}</Text>

      {cropsError ? (
        <Text style={styles.emptyText}>{cropsError}</Text>
      ) : fieldCrops.length === 0 ? (
        <Text style={styles.emptyText}>
          {t('settings.fieldDetail.noCrops')}
        </Text>
      ) : (
        <View style={styles.cropsList}>
          {fieldCrops.map((fieldCrop) => {
            const crop = cropCatalog.find(
              (item) => String(item.id) === String(fieldCrop.crop_id),
            );

            const statusKey = VALID_STATUSES.includes(
              fieldCrop.status as (typeof VALID_STATUSES)[number],
            )
              ? fieldCrop.status
              : null;

            return (
              <View
                key={String(fieldCrop.id)}
                style={styles.cropRow}
                testID="field-crop-row"
              >
                <Text style={styles.cropName} numberOfLines={2}>
                  {crop?.name ??
                    fieldCrop.crop_name ??
                    `Cultiu #${fieldCrop.crop_id}`}
                </Text>

                <Text
                  style={[
                    styles.status,
                    fieldCrop.status === 'planted'
                      ? styles.statusOn
                      : fieldCrop.status === 'harvested'
                        ? styles.statusHarvested
                        : styles.statusPlanned,
                  ]}
                >
                  {statusKey
                    ? t(`settings.fieldDetail.cropStatuses.${statusKey}`)
                    : fieldCrop.status}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
