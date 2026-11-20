import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FieldCropsCard } from '@/components/FieldCropsCard';
import { useCurrentField } from '@/hooks/use-current-field';
import { useFieldCrops } from '@/hooks/use-field-crops';
import { createAddCropHandler } from '@/services/fieldCropNavigation';
import { getCropsStyles } from '../../styles/crops.styles';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const styles = getCropsStyles(width, height);
  const field = useCurrentField();
  const openAddCrop = createAddCropHandler(field, router.push);
  const crops = useFieldCrops(field ? Number(field.id) : null);
  const openCropDetails = () => {
    if (!field) return;
    router.push({
      pathname: '/crop-detail',
      params: { id: String(field.id) },
    } as unknown as Href);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <View style={styles.container}>
          <Text style={styles.date}>{t('settings.eyebrow')}</Text>
          <Text style={styles.title}>{t('settings.title')}</Text>

          <FieldCropsCard
            state={crops}
            onRetry={crops.retry}
            onAdd={openAddCrop}
            onEdit={openCropDetails}
            addDisabled={!field}
          />
        </View>
      </ScrollView>
    </View>
  );
}
