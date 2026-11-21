import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { GardenRecommendation } from '@/services/api';
import { styles } from '@/styles/tasks.styles';

type Props = {
  item: GardenRecommendation;
  onSeen: (item: GardenRecommendation) => void;
  onConvert: (item: GardenRecommendation) => void;
};

/** A short notice. The gardener can dismiss it or turn it into a task. */
export function RecommendationCard({ item, onSeen, onConvert }: Props) {
  const { t } = useTranslation();

  return (
    <View testID={`recommendation-${item.id}`} style={styles.noticeCard}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      {item.details ? (
        <Text style={styles.cardMeta}>{item.details}</Text>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          testID={`recommendation-seen-${item.id}`}
          accessibilityRole="button"
          style={styles.quietButton}
          onPress={() => onSeen(item)}
        >
          <Text style={styles.quietText}>{t('tasks.seen')}</Text>
        </Pressable>
        <Pressable
          testID={`recommendation-convert-${item.id}`}
          accessibilityRole="button"
          style={styles.quietButton}
          onPress={() => onConvert(item)}
        >
          <Text style={styles.quietText}>{t('tasks.convert')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
