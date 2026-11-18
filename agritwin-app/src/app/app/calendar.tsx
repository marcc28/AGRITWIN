import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { RecommendationCard } from '@/components/tasks/RecommendationCard';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskEditor } from '@/components/tasks/TaskEditor';
import { TaskMonthCalendar } from '@/components/tasks/TaskMonthCalendar';
import { useGardenTasks } from '@/hooks/use-garden-tasks';
import { useTaskEditor } from '@/hooks/use-task-editor';
import { styles } from '@/styles/tasks.styles';
import { CALENDAR_PHONE, getPageFrame } from '@/styles/responsive';
import {
  addDays,
  formatDay,
  sortTasks,
  urgentPriorityByDay,
} from '@/utils/tasks';

/** The calendar tab: a month on top, then yesterday, today and tomorrow. */
export default function CalendarScreen() {
  const { t, i18n } = useTranslation();
  const { width, height } = useWindowDimensions();
  const frame = getPageFrame(width, height, CALENDAR_PHONE);
  const garden = useGardenTasks();
  const editor = useTaskEditor(garden);
  const [month, setMonth] = useState(() => new Date());

  const { field, today } = garden;
  const nearby = [addDays(today, -1), today, addDays(today, 1)];
  const nearbyLabels = [
    t('tasks.yesterday'),
    t('tasks.today'),
    t('tasks.tomorrow'),
  ];
  const urgentByDay = useMemo(
    () => urgentPriorityByDay(garden.tasks),
    [garden.tasks],
  );
  const recommendations = garden.recommendations.filter((item) =>
    nearby.includes(item.due_on),
  );

  function openDay(day: string) {
    router.push({ pathname: '/task-day', params: { date: day } });
  }

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
          testID="calendar-content"
          style={[styles.content, { maxWidth: frame.maxWidth }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t('tasks.title')}</Text>
              <Text style={styles.subtitle}>
                {field ? field.name : t('tasks.noGarden')}
              </Text>
            </View>
            {field ? (
              <Pressable
                testID="task-open-add"
                accessibilityRole="button"
                accessibilityLabel={t('tasks.addTask')}
                style={styles.addButton}
                onPress={editor.openNew}
              >
                <Text style={styles.addButtonText}>+</Text>
              </Pressable>
            ) : null}
          </View>

          {garden.error ? (
            <Text testID="tasks-error" style={styles.error}>
              {t(`tasks.errors.${garden.error}`)}
            </Text>
          ) : null}
          {garden.loading ? (
            <Text testID="tasks-loading" style={styles.loading}>
              {t('tasks.loading')}
            </Text>
          ) : null}
          {field && !garden.loading && !garden.hasSensors ? (
            <Text testID="tasks-no-sensors" style={styles.notice}>
              {t('tasks.noSensors')}
            </Text>
          ) : null}

          <View style={styles.calendarCard}>
            <TaskMonthCalendar
              month={month}
              today={today}
              urgentByDay={urgentByDay}
              onMonthChange={setMonth}
              onSelectDay={openDay}
            />
          </View>

          {recommendations.length > 0 ? (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {t('tasks.recommendations')}
                </Text>
              </View>
              {recommendations.map((item) => (
                <RecommendationCard
                  key={item.id}
                  item={item}
                  onSeen={(row) => void garden.seeRecommendation(row)}
                  onConvert={(row) => void garden.makeTask(row)}
                />
              ))}
            </View>
          ) : null}

          {nearby.map((day, index) => {
            const rows = sortTasks(
              garden.tasks.filter((task) => task.due_on === day),
            );
            return (
              <View key={day} testID={`calendar-section-${day}`}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{nearbyLabels[index]}</Text>
                  <Text style={styles.sectionDate}>
                    {formatDay(day, i18n.language)}
                  </Text>
                </View>
                {rows.length === 0 ? (
                  <Text style={styles.empty}>{t('tasks.empty')}</Text>
                ) : (
                  rows.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={(row) => void garden.toggle(row)}
                      onPress={editor.openTask}
                    />
                  ))
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <TaskEditor
        visible={editor.visible}
        task={editor.task}
        defaultDay={today}
        onClose={editor.close}
        onSave={editor.save}
        onDelete={editor.remove}
      />
    </View>
  );
}
