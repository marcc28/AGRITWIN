import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { MoonIcon } from '@/components/tasks/MoonIcon';
import { RecommendationCard } from '@/components/tasks/RecommendationCard';
import { TaskEditor } from '@/components/tasks/TaskEditor';
import { TaskGroups } from '@/components/tasks/TaskGroups';
import { useGardenTasks } from '@/hooks/use-garden-tasks';
import { useTaskEditor } from '@/hooks/use-task-editor';
import { styles } from '@/styles/tasks.styles';
import { CALENDAR_PHONE, getPageFrame } from '@/styles/responsive';
import { moonPhase } from '@/utils/moon';
import { addDays, dayRelation, formatDay, isIsoDay } from '@/utils/tasks';

/**
 * One day of the garden: its notices and its tasks in red, orange and green.
 * The arrows move to the day before and the day after.
 */
export default function TaskDayScreen() {
  const { t, i18n } = useTranslation();
  const { width, height } = useWindowDimensions();
  const frame = getPageFrame(width, height, CALENDAR_PHONE);
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const garden = useGardenTasks();
  const editor = useTaskEditor(garden);

  const requested = Array.isArray(params.date) ? params.date[0] : params.date;
  // A link without a valid day opens today.
  const [day, setDay] = useState(() =>
    isIsoDay(requested) ? requested : garden.today,
  );

  const relation = dayRelation(day, garden.today);
  const moon = moonPhase(day);
  const rows = garden.tasks.filter((task) => task.due_on === day);
  const notices = garden.recommendations.filter((item) => item.due_on === day);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: frame.horizontalInset },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View
          testID="task-day-content"
          style={[styles.content, { maxWidth: frame.maxWidth }]}
        >
          <Pressable
            testID="task-day-back"
            accessibilityRole="button"
            onPress={() => router.back()}
          >
            <Text style={styles.back}>‹ {t('tasks.back')}</Text>
          </Pressable>

          <View style={styles.dayNav}>
            <Pressable
              testID="task-day-previous"
              accessibilityRole="button"
              accessibilityLabel={t('tasks.previousDay')}
              style={styles.monthButton}
              onPress={() => setDay(addDays(day, -1))}
            >
              <Text style={styles.monthArrow}>{'‹'}</Text>
            </Pressable>
            <View style={styles.dayNavText}>
              <Text testID="task-day-title" style={styles.dayTitle}>
                {formatDay(day, i18n.language)}
              </Text>
              <View style={styles.dayMeta}>
                {relation ? (
                  <Text testID="task-day-relation" style={styles.dayRelative}>
                    {t(`tasks.${relation}`)}
                  </Text>
                ) : null}
                <MoonIcon testID="task-day-moon" phase={moon} size={12} />
                <Text testID="task-day-moon-name" style={styles.dayRelative}>
                  {t(`tasks.moon.${moon}`)}
                </Text>
              </View>
            </View>
            <Pressable
              testID="task-day-next"
              accessibilityRole="button"
              accessibilityLabel={t('tasks.nextDay')}
              style={styles.monthButton}
              onPress={() => setDay(addDays(day, 1))}
            >
              <Text style={styles.monthArrow}>{'›'}</Text>
            </Pressable>
          </View>

          {garden.error ? (
            <Text
              testID="tasks-error"
              style={[styles.error, { marginTop: 12 }]}
            >
              {t(`tasks.errors.${garden.error}`)}
            </Text>
          ) : null}

          {notices.length > 0 ? (
            <View testID="task-day-notices">
              <View style={styles.groupHeader}>
                <Text style={styles.groupLabel}>
                  {t('tasks.recommendations')}
                </Text>
                <Text style={styles.groupCount}>{notices.length}</Text>
              </View>
              {notices.map((item) => (
                <RecommendationCard
                  key={item.id}
                  item={item}
                  onSeen={(row) => void garden.seeRecommendation(row)}
                  onConvert={(row) => void garden.makeTask(row)}
                />
              ))}
            </View>
          ) : null}

          <TaskGroups
            tasks={rows}
            onToggle={(row) => void garden.toggle(row)}
            onPress={editor.openTask}
          />

          {!garden.loading && rows.length === 0 && notices.length === 0 ? (
            <Text
              testID="task-day-empty"
              style={[styles.empty, { marginTop: 18 }]}
            >
              {t('tasks.empty')}
            </Text>
          ) : null}

          {garden.field ? (
            <Pressable
              testID="task-open-add"
              accessibilityRole="button"
              style={styles.addWide}
              onPress={editor.openNew}
            >
              <Text style={styles.addWideText}>+ {t('tasks.addTask')}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <TaskEditor
        visible={editor.visible}
        task={editor.task}
        defaultDay={day}
        onClose={editor.close}
        onSave={editor.save}
        onDelete={editor.remove}
      />
    </View>
  );
}
