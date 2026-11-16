import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { GardenTask } from '@/services/api';
import { priorityColor, styles } from '@/styles/tasks.styles';

type Props = {
  task: GardenTask;
  onToggle: (task: GardenTask) => void;
  onPress: (task: GardenTask) => void;
};

/**
 * One task: a round box to mark it as done, its title and a coloured edge for
 * the priority. Tapping the card opens it to edit.
 */
export function TaskCard({ task, onToggle, onPress }: Props) {
  const { t } = useTranslation();
  const color = priorityColor[task.priority];

  return (
    <Pressable
      testID={`task-${task.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${t('tasks.edit')}: ${task.title}`}
      onPress={() => onPress(task)}
      style={[
        styles.card,
        { borderLeftColor: color },
        task.completed && styles.cardDone,
      ]}
    >
      <Pressable
        testID={`task-toggle-${task.id}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={
          task.completed
            ? `${t('tasks.reopen')}: ${task.title}`
            : `${t('tasks.complete')}: ${task.title}`
        }
        hitSlop={10}
        onPress={() => onToggle(task)}
        style={[
          styles.check,
          { borderColor: color },
          task.completed && { backgroundColor: color },
        ]}
      >
        {task.completed ? <Text style={styles.checkMark}>✓</Text> : null}
      </Pressable>
      <View style={styles.cardBody}>
        <Text
          numberOfLines={2}
          style={[styles.cardTitle, task.completed && styles.cardTitleDone]}
        >
          {task.title}
        </Text>
        {task.details ? (
          <Text numberOfLines={2} style={styles.cardMeta}>
            {task.details}
          </Text>
        ) : null}
        {task.completion_reason ? (
          <Text numberOfLines={2} style={styles.cardMeta}>
            {task.completion_reason}
          </Text>
        ) : null}
      </View>
      {task.source === 'ai' ? (
        <View testID={`task-ai-${task.id}`} style={styles.aiChip}>
          <Text style={styles.aiChipText}>{t('tasks.aiBadge')}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
