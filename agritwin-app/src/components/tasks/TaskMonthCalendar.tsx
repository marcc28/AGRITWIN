import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { TaskPriority } from '@/services/api';
import { MoonIcon } from '@/components/tasks/MoonIcon';
import { priorityColor, styles } from '@/styles/tasks.styles';
import { moonPhase } from '@/utils/moon';
import { isoDate, monthCells, weekdayLabels } from '@/utils/tasks';

type Props = {
  month: Date;
  today: string;
  /** For each day with tasks left to do, its most urgent priority. */
  urgentByDay: Record<string, TaskPriority>;
  onMonthChange: (month: Date) => void;
  onSelectDay: (day: string) => void;
};

/**
 * A month. Under each day there is the phase of the moon and a coloured dot
 * if the day still has tasks to do.
 */
export function TaskMonthCalendar({
  month,
  today,
  urgentByDay,
  onMonthChange,
  onSelectDay,
}: Props) {
  const { t, i18n } = useTranslation();

  function moveMonth(step: number) {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + step, 1));
  }

  return (
    <View>
      <View style={styles.monthRow}>
        <Pressable
          testID="calendar-previous-month"
          accessibilityRole="button"
          accessibilityLabel={t('tasks.previousMonth')}
          style={styles.monthButton}
          onPress={() => moveMonth(-1)}
        >
          <Text style={styles.monthArrow}>{'‹'}</Text>
        </Pressable>
        <Text testID="calendar-month" style={styles.monthLabel}>
          {month.toLocaleDateString(i18n.language, {
            month: 'long',
            year: 'numeric',
          })}
        </Text>
        <Pressable
          testID="calendar-next-month"
          accessibilityRole="button"
          accessibilityLabel={t('tasks.nextMonth')}
          style={styles.monthButton}
          onPress={() => moveMonth(1)}
        >
          <Text style={styles.monthArrow}>{'›'}</Text>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {weekdayLabels(i18n.language).map((name, index) => (
          <View key={`${name}-${index}`} style={styles.dayCell}>
            <Text style={styles.dayName}>{name}</Text>
          </View>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {monthCells(month).map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }
          const day = isoDate(date);
          const urgent = urgentByDay[day];
          return (
            <Pressable
              key={day}
              testID={`calendar-day-${day}`}
              accessibilityRole="button"
              accessibilityLabel={date.toLocaleDateString(i18n.language, {
                day: 'numeric',
                month: 'long',
              })}
              style={styles.dayCell}
              onPress={() => onSelectDay(day)}
            >
              <View
                style={[
                  styles.dayCircle,
                  day === today ? styles.dayCircleToday : null,
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    day === today ? styles.dayToday : null,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
              <View style={styles.dayFooter}>
                <MoonIcon
                  testID={`calendar-moon-${day}`}
                  phase={moonPhase(day)}
                  size={8}
                  label={t(`tasks.moon.${moonPhase(day)}`)}
                />
                <View
                  testID={urgent ? `calendar-dot-${day}` : undefined}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: urgent
                        ? priorityColor[urgent]
                        : 'transparent',
                    },
                  ]}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
