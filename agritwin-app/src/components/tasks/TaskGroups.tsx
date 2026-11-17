import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { TaskCard } from '@/components/tasks/TaskCard';
import { Colors } from '@/constants/theme';
import type { GardenTask } from '@/services/api';
import { priorityColor, styles } from '@/styles/tasks.styles';
import { groupTasks } from '@/utils/tasks';

type Props = {
  tasks: GardenTask[];
  onToggle: (task: GardenTask) => void;
  onPress: (task: GardenTask) => void;
};

/** The tasks of one day in groups: red, orange, green and then the done ones. */
export function TaskGroups({ tasks, onToggle, onPress }: Props) {
  const { t } = useTranslation();

  return (
    <View>
      {groupTasks(tasks).map((group) => (
        <View key={group.key} testID={`task-group-${group.key}`}>
          <View style={styles.groupHeader}>
            <View
              style={[
                styles.groupDot,
                {
                  backgroundColor:
                    group.key === 'done'
                      ? Colors.light.textMuted
                      : priorityColor[group.key],
                },
              ]}
            />
            <Text style={styles.groupLabel}>{t(`tasks.${group.key}`)}</Text>
            <Text style={styles.groupCount}>{group.tasks.length}</Text>
          </View>
          {group.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={onToggle}
              onPress={onPress}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
