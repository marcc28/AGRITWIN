import { useRef } from 'react';
import {
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FieldCropsCard } from '@/components/FieldCropsCard';
import { useCurrentField } from '@/hooks/use-current-field';
import { useInfiniteFieldCrops } from '@/hooks/use-infinite-field-crops';
import { createAddCropHandler } from '@/services/fieldCropNavigation';
import { getCropsStyles } from '../../styles/crops.styles';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const styles = getCropsStyles(width, height);
  const field = useCurrentField();
  const openAddCrop = createAddCropHandler(field, router.push);
  const crops = useInfiniteFieldCrops(field ? Number(field.id) : null);
  const scrollMetrics = useRef({
    contentHeight: 0,
    viewportHeight: 0,
    offset: 0,
  });
  const openCropDetails = () => {
    if (!field) return;
    router.push({
      pathname: '/crop-detail',
      params: { id: String(field.id) },
    } as unknown as Href);
  };

  function maybeLoadMore() {
    const { contentHeight, viewportHeight, offset } = scrollMetrics.current;
    const remaining = contentHeight - viewportHeight - offset;
    if (
      crops.hasMore &&
      !crops.loadingMore &&
      (contentHeight <= viewportHeight ||
        remaining < Math.max(240, viewportHeight * 0.35))
    ) {
      void crops.loadMore();
    }
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollMetrics.current.offset = event.nativeEvent.contentOffset.y;
    maybeLoadMore();
  }

  function onScrollLayout(event: LayoutChangeEvent) {
    scrollMetrics.current.viewportHeight = event.nativeEvent.layout.height;
    maybeLoadMore();
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        onLayout={onScrollLayout}
        onContentSizeChange={(_contentWidth, contentHeight) => {
          scrollMetrics.current.contentHeight = contentHeight;
          maybeLoadMore();
        }}
        onScroll={onScroll}
        scrollEventThrottle={200}
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
            loadingMore={crops.loadingMore}
          />
        </View>
      </ScrollView>
    </View>
  );
}
