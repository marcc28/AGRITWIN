import type { GardenTask, TaskChanges, TaskPriority } from '@/services/api';

export const PRIORITY_ORDER: TaskPriority[] = ['high', 'medium', 'low'];

// What the form holds, for a new task or an edited one.
export type TaskValues = {
  title: string;
  details: string;
  priority: TaskPriority;
  day: string;
};

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDay(value: string | undefined): value is string {
  return typeof value === 'string' && DAY_PATTERN.test(value);
}

/** YYYY-MM-DD of a date, in the phone's calendar. */
export function isoDate(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}

/** A date at noon, so daylight saving changes never move it to another day. */
export function parseIsoDate(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}

export function addDays(day: string, days: number): string {
  const value = parseIsoDate(day);
  value.setDate(value.getDate() + days);
  return isoDate(value);
}

export function formatDay(day: string, language: string): string {
  return parseIsoDate(day).toLocaleDateString(language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** The cells of a month grid, Monday first. Empty cells are null. */
export function monthCells(cursor: Date): (Date | null)[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(new Date(year, month, day));
  }
  return cells;
}

/** Short weekday names, Monday first, in the language of the app. */
export function weekdayLabels(language: string): string[] {
  const monday = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day.toLocaleDateString(language, { weekday: 'narrow' });
  });
}

/** Pending tasks first, then by priority. Done tasks go last. */
export function sortTasks(tasks: GardenTask[]): GardenTask[] {
  return [...tasks].sort((left, right) => {
    if (left.completed !== right.completed) {
      return left.completed ? 1 : -1;
    }
    return (
      PRIORITY_ORDER.indexOf(left.priority) -
      PRIORITY_ORDER.indexOf(right.priority)
    );
  });
}

/** For each day with something left to do, its most urgent priority. */
export function urgentPriorityByDay(
  tasks: GardenTask[],
): Record<string, TaskPriority> {
  const days: Record<string, TaskPriority> = {};
  for (const task of tasks) {
    if (task.completed || !task.due_on) {
      continue;
    }
    const current = days[task.due_on];
    if (
      !current ||
      PRIORITY_ORDER.indexOf(task.priority) < PRIORITY_ORDER.indexOf(current)
    ) {
      days[task.due_on] = task.priority;
    }
  }
  return days;
}

export type TaskGroupKey = TaskPriority | 'done';

/** The tasks of a day in groups: red, orange, green and then the done ones. */
export function groupTasks(
  tasks: GardenTask[],
): { key: TaskGroupKey; tasks: GardenTask[] }[] {
  const groups: { key: TaskGroupKey; tasks: GardenTask[] }[] = [
    ...PRIORITY_ORDER.map((key) => ({
      key,
      tasks: tasks.filter((task) => !task.completed && task.priority === key),
    })),
    { key: 'done' as const, tasks: tasks.filter((task) => task.completed) },
  ];
  return groups.filter((group) => group.tasks.length > 0);
}

/** Is a day yesterday, today or tomorrow? Otherwise null. */
export function dayRelation(
  day: string,
  today: string,
): 'yesterday' | 'today' | 'tomorrow' | null {
  if (day === today) {
    return 'today';
  }
  if (day === addDays(today, -1)) {
    return 'yesterday';
  }
  if (day === addDays(today, 1)) {
    return 'tomorrow';
  }
  return null;
}

/** Only what the user really changed in a task, to send to the server. */
export function changedFields(
  task: GardenTask,
  values: TaskValues,
): TaskChanges {
  const changes: TaskChanges = {};
  const title = values.title.trim();
  const details = values.details.trim();
  if (title !== task.title) {
    changes.title = title;
  }
  if (details !== (task.details ?? '')) {
    changes.details = details || null;
  }
  if (values.priority !== task.priority) {
    changes.priority = values.priority;
  }
  if (values.day !== task.due_on) {
    changes.due_on = values.day;
  }
  return changes;
}
