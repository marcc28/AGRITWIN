import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useCurrentField } from '@/hooks/use-current-field';
import {
  convertRecommendation,
  createGardenTask,
  deleteGardenTask,
  dismissRecommendation,
  getGardenTasks,
  updateGardenTask,
  type GardenRecommendation,
  type GardenTask,
  type GardenTaskList,
  type TaskChanges,
} from '@/services/api';
import { isoDate, type TaskValues } from '@/utils/tasks';

// The server may be reviewing the garden when the screen opens. Ask again a
// little later, a couple of times at most.
export const REFRESH_DELAY_MS = 8000;
export const REFRESH_RETRIES = 2;

export type TaskErrorKey = 'load' | 'create' | 'update' | 'delete';

// What the form sends to create a task.
export type NewTask = TaskValues;

/**
 * The tasks of the active garden. They load again every time the screen comes
 * back into focus, so what changed on the day screen shows up in the calendar.
 */
export function useGardenTasks() {
  const field = useCurrentField();
  const { i18n } = useTranslation();
  const fieldId = field ? field.id : null;
  const language = i18n.language;

  const [tasks, setTasks] = useState<GardenTask[]>([]);
  const [recommendations, setRecommendations] = useState<
    GardenRecommendation[]
  >([]);
  // The server's day, because it is the one that decides what is "today".
  const [today, setToday] = useState(() => isoDate(new Date()));
  const [hasSensors, setHasSensors] = useState(true);
  const [loadedFor, setLoadedFor] = useState<number | null>(null);
  const [error, setError] = useState<TaskErrorKey | null>(null);

  const apply = useCallback((data: GardenTaskList) => {
    setTasks(data.tasks);
    setRecommendations(data.recommendations);
    setToday(data.today);
    setHasSensors(data.has_sensors);
    setError(null);
  }, []);

  // Never show the tasks of the previous garden.
  useEffect(() => {
    setTasks([]);
    setRecommendations([]);
    setLoadedFor(null);
    setError(null);
  }, [fieldId]);

  useFocusEffect(
    useCallback(() => {
      if (fieldId === null) {
        return undefined;
      }
      let active = true;
      let timer: ReturnType<typeof setTimeout> | undefined;

      async function fetchTasks(attempt: number) {
        try {
          const data = await getGardenTasks(fieldId as number, language);
          if (!active) {
            return;
          }
          apply(data);
          setLoadedFor(fieldId);
          if (data.refresh && attempt < REFRESH_RETRIES) {
            timer = setTimeout(() => {
              void fetchTasks(attempt + 1);
            }, REFRESH_DELAY_MS);
          }
        } catch {
          if (active) {
            setError('load');
            setLoadedFor(fieldId);
          }
        }
      }

      void fetchTasks(0);
      return () => {
        active = false;
        if (timer) {
          clearTimeout(timer);
        }
      };
    }, [apply, fieldId, language]),
  );

  const toggle = useCallback(
    async (task: GardenTask) => {
      if (fieldId === null) {
        return;
      }
      try {
        const updated = await updateGardenTask(fieldId, task.id, {
          completed: !task.completed,
        });
        setTasks((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setError(null);
      } catch {
        setError('update');
      }
    },
    [fieldId],
  );

  const changeTask = useCallback(
    async (task: GardenTask, changes: TaskChanges): Promise<boolean> => {
      if (fieldId === null) {
        return false;
      }
      try {
        const updated = await updateGardenTask(fieldId, task.id, changes);
        setTasks((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setError(null);
        return true;
      } catch {
        setError('update');
        return false;
      }
    },
    [fieldId],
  );

  const removeTask = useCallback(
    async (task: GardenTask): Promise<boolean> => {
      if (fieldId === null) {
        return false;
      }
      try {
        await deleteGardenTask(fieldId, task.id);
        setTasks((current) => current.filter((item) => item.id !== task.id));
        setError(null);
        return true;
      } catch {
        setError('delete');
        return false;
      }
    },
    [fieldId],
  );

  const addTask = useCallback(
    async ({ title, details, priority, day }: NewTask): Promise<boolean> => {
      if (fieldId === null || !title.trim()) {
        return false;
      }
      try {
        const created = await createGardenTask(
          fieldId,
          title.trim(),
          day,
          priority,
          details,
        );
        setTasks((current) => [...current, created]);
        setError(null);
        return true;
      } catch {
        setError('create');
        return false;
      }
    },
    [fieldId],
  );

  const seeRecommendation = useCallback(
    async (item: GardenRecommendation) => {
      if (fieldId === null) {
        return;
      }
      try {
        await dismissRecommendation(fieldId, item.id);
        setRecommendations((current) =>
          current.filter((row) => row.id !== item.id),
        );
        setError(null);
      } catch {
        setError('update');
      }
    },
    [fieldId],
  );

  const makeTask = useCallback(
    async (item: GardenRecommendation) => {
      if (fieldId === null) {
        return;
      }
      try {
        await convertRecommendation(fieldId, item.id);
        apply(await getGardenTasks(fieldId, language));
      } catch {
        setError('update');
      }
    },
    [apply, fieldId, language],
  );

  return {
    field,
    loading: field === undefined || (fieldId !== null && loadedFor !== fieldId),
    tasks,
    recommendations,
    today,
    hasSensors,
    error,
    toggle,
    changeTask,
    removeTask,
    addTask,
    seeRecommendation,
    makeTask,
  };
}
