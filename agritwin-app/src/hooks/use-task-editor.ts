import { useCallback, useState } from 'react';

import type { useGardenTasks } from '@/hooks/use-garden-tasks';
import type { GardenTask } from '@/services/api';
import { changedFields, type TaskValues } from '@/utils/tasks';

type Garden = Pick<
  ReturnType<typeof useGardenTasks>,
  'addTask' | 'changeTask' | 'removeTask'
>;

/**
 * The state of the task form: closed, creating a task or editing one.
 * Both screens that show tasks use it.
 */
export function useTaskEditor(garden: Garden) {
  // null = closed. { task: null } = creating. { task } = editing that task.
  const [target, setTarget] = useState<{ task: GardenTask | null } | null>(
    null,
  );
  const { addTask, changeTask, removeTask } = garden;

  const openNew = useCallback(() => setTarget({ task: null }), []);
  const openTask = useCallback((task: GardenTask) => setTarget({ task }), []);
  const close = useCallback(() => setTarget(null), []);

  const save = useCallback(
    async (values: TaskValues): Promise<boolean> => {
      if (!target) {
        return false;
      }
      if (!target.task) {
        return addTask(values);
      }
      const changes = changedFields(target.task, values);
      if (Object.keys(changes).length === 0) {
        return true;
      }
      return changeTask(target.task, changes);
    },
    [addTask, changeTask, target],
  );

  const remove = useCallback(async (): Promise<boolean> => {
    if (!target?.task) {
      return false;
    }
    return removeTask(target.task);
  }, [removeTask, target]);

  return {
    visible: target !== null,
    task: target?.task ?? null,
    openNew,
    openTask,
    close,
    save,
    remove,
  };
}
