import { act, renderHook } from '@testing-library/react-native';

import {
  REFRESH_DELAY_MS,
  REFRESH_RETRIES,
  useGardenTasks,
} from '@/hooks/use-garden-tasks';
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
} from '@/services/api';

let mockField: { id: number; name: string } | null | undefined;

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(callback, [callback]);
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'es' } }),
}));

jest.mock('@/hooks/use-current-field', () => ({
  useCurrentField: () => mockField,
}));

jest.mock('@/services/api', () => ({
  convertRecommendation: jest.fn(),
  createGardenTask: jest.fn(),
  deleteGardenTask: jest.fn(),
  dismissRecommendation: jest.fn(),
  getGardenTasks: jest.fn(),
  updateGardenTask: jest.fn(),
}));

const mockedList = getGardenTasks as jest.MockedFunction<typeof getGardenTasks>;
const mockedCreate = createGardenTask as jest.MockedFunction<
  typeof createGardenTask
>;
const mockedComplete = updateGardenTask as jest.MockedFunction<
  typeof updateGardenTask
>;
const mockedDelete = deleteGardenTask as jest.MockedFunction<
  typeof deleteGardenTask
>;
const mockedSeen = dismissRecommendation as jest.MockedFunction<
  typeof dismissRecommendation
>;
const mockedConvert = convertRecommendation as jest.MockedFunction<
  typeof convertRecommendation
>;

const task: GardenTask = {
  id: 1,
  title: 'Regar',
  details: null,
  due_on: '2026-11-10',
  source: 'ai',
  priority: 'high',
  completion_reason: null,
  completed: false,
  can_delete: false,
  created_at: '2026-11-10T08:00:00',
};

const recommendation: GardenRecommendation = {
  id: 9,
  title: 'Helada',
  details: 'Cubre las plantas',
  due_on: '2026-11-10',
  signature: 'frost',
};

const values = {
  title: 'Podar',
  details: '',
  priority: 'low' as const,
  day: '2026-11-11',
};

function list(changes: Partial<GardenTaskList> = {}): GardenTaskList {
  return {
    today: '2026-11-10',
    has_sensors: true,
    refresh: false,
    tasks: [task],
    recommendations: [recommendation],
    ...changes,
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useGardenTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockField = { id: 7, name: 'Hort' };
    mockedList.mockResolvedValue(list());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads the tasks of the active garden in the app language', async () => {
    const { result } = renderHook(() => useGardenTasks());
    expect(result.current.loading).toBe(true);

    await flush();

    expect(mockedList).toHaveBeenCalledWith(7, 'es');
    expect(result.current.loading).toBe(false);
    expect(result.current.tasks).toEqual([task]);
    expect(result.current.recommendations).toEqual([recommendation]);
    expect(result.current.today).toBe('2026-11-10');
    expect(result.current.hasSensors).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('knows when the garden has no sensors', async () => {
    mockedList.mockResolvedValue(list({ has_sensors: false }));
    const { result } = renderHook(() => useGardenTasks());
    await flush();

    expect(result.current.hasSensors).toBe(false);
  });

  it('waits while the active garden is not known yet', () => {
    mockField = undefined;
    const { result } = renderHook(() => useGardenTasks());

    expect(result.current.loading).toBe(true);
    expect(mockedList).not.toHaveBeenCalled();
  });

  it('does nothing when there is no garden', async () => {
    mockField = null;
    const { result } = renderHook(() => useGardenTasks());
    await flush();

    expect(result.current.loading).toBe(false);
    expect(mockedList).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.toggle(task);
      await result.current.seeRecommendation(recommendation);
      await result.current.makeTask(recommendation);
    });
    await expect(result.current.addTask(values)).resolves.toBe(false);
    await expect(result.current.changeTask(task, { title: 'x' })).resolves.toBe(
      false,
    );
    await expect(result.current.removeTask(task)).resolves.toBe(false);
    expect(mockedComplete).not.toHaveBeenCalled();
    expect(mockedDelete).not.toHaveBeenCalled();
    expect(mockedSeen).not.toHaveBeenCalled();
    expect(mockedConvert).not.toHaveBeenCalled();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('shows an error when the tasks do not load', async () => {
    mockedList.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useGardenTasks());
    await flush();

    expect(result.current.error).toBe('load');
    expect(result.current.loading).toBe(false);
    expect(result.current.tasks).toEqual([]);
  });

  it('asks again while the server is still reviewing the garden', async () => {
    jest.useFakeTimers();
    mockedList.mockResolvedValue(list({ refresh: true }));
    renderHook(() => useGardenTasks());
    await flush();
    expect(mockedList).toHaveBeenCalledTimes(1);

    for (let attempt = 1; attempt <= REFRESH_RETRIES; attempt += 1) {
      await act(async () => {
        jest.advanceTimersByTime(REFRESH_DELAY_MS);
      });
      expect(mockedList).toHaveBeenCalledTimes(1 + attempt);
    }

    // It gives up after the last retry.
    await act(async () => {
      jest.advanceTimersByTime(REFRESH_DELAY_MS * 3);
    });
    expect(mockedList).toHaveBeenCalledTimes(1 + REFRESH_RETRIES);
  });

  it('stops asking when the screen is left', async () => {
    jest.useFakeTimers();
    mockedList.mockResolvedValue(list({ refresh: true }));
    const { unmount } = renderHook(() => useGardenTasks());
    await flush();

    unmount();
    await act(async () => {
      jest.advanceTimersByTime(REFRESH_DELAY_MS * 3);
    });
    expect(mockedList).toHaveBeenCalledTimes(1);
  });

  it('ignores an answer that arrives after the screen was left', async () => {
    let resolve: (value: GardenTaskList) => void = () => undefined;
    mockedList.mockReturnValue(
      new Promise<GardenTaskList>((done) => {
        resolve = done;
      }),
    );
    const { result, unmount } = renderHook(() => useGardenTasks());
    unmount();

    await act(async () => {
      resolve(list());
    });
    expect(result.current.tasks).toEqual([]);
  });

  it('ignores a failure that arrives after the screen was left', async () => {
    let reject: (reason: Error) => void = () => undefined;
    mockedList.mockReturnValue(
      new Promise<GardenTaskList>((_done, fail) => {
        reject = fail;
      }),
    );
    const { result, unmount } = renderHook(() => useGardenTasks());
    unmount();

    await act(async () => {
      reject(new Error('late'));
    });
    expect(result.current.error).toBeNull();
  });

  it('marks a task as done', async () => {
    const { result } = renderHook(() => useGardenTasks());
    await flush();
    mockedComplete.mockResolvedValue({ ...task, completed: true });

    await act(async () => {
      await result.current.toggle(task);
    });

    expect(mockedComplete).toHaveBeenCalledWith(7, 1, { completed: true });
    expect(result.current.tasks[0].completed).toBe(true);
  });

  it('keeps the task and shows an error when it cannot be updated', async () => {
    const { result } = renderHook(() => useGardenTasks());
    await flush();
    mockedComplete.mockRejectedValue(new Error('boom'));

    await act(async () => {
      await result.current.toggle(task);
    });

    expect(result.current.error).toBe('update');
    expect(result.current.tasks[0].completed).toBe(false);
  });

  it('adds a task and trims the title', async () => {
    const { result } = renderHook(() => useGardenTasks());
    await flush();
    const created = { ...task, id: 2, title: 'Podar', source: 'user' as const };
    mockedCreate.mockResolvedValue(created);

    let added = false;
    await act(async () => {
      added = await result.current.addTask({
        ...values,
        title: '  Podar ',
        details: 'Poc',
      });
    });

    expect(added).toBe(true);
    expect(mockedCreate).toHaveBeenCalledWith(
      7,
      'Podar',
      '2026-11-11',
      'low',
      'Poc',
    );
    expect(result.current.tasks).toEqual([task, created]);
  });

  it('does not send a blank title', async () => {
    const { result } = renderHook(() => useGardenTasks());
    await flush();

    let added = true;
    await act(async () => {
      added = await result.current.addTask({ ...values, title: '   ' });
    });

    expect(added).toBe(false);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('says so when the task cannot be created', async () => {
    const { result } = renderHook(() => useGardenTasks());
    await flush();
    mockedCreate.mockRejectedValue(new Error('boom'));

    let added = true;
    await act(async () => {
      added = await result.current.addTask(values);
    });

    expect(added).toBe(false);
    expect(result.current.error).toBe('create');
    expect(result.current.tasks).toEqual([task]);
  });

  it('changes a task and keeps the answer of the server', async () => {
    const { result } = renderHook(() => useGardenTasks());
    await flush();
    const changed = { ...task, title: 'Regar tard', source: 'user' as const };
    mockedComplete.mockResolvedValue(changed);

    let saved = false;
    await act(async () => {
      saved = await result.current.changeTask(task, { title: 'Regar tard' });
    });

    expect(saved).toBe(true);
    expect(mockedComplete).toHaveBeenCalledWith(7, 1, { title: 'Regar tard' });
    expect(result.current.tasks).toEqual([changed]);
  });

  it('keeps the task when a change cannot be saved', async () => {
    const { result } = renderHook(() => useGardenTasks());
    await flush();
    mockedComplete.mockRejectedValue(new Error('boom'));

    let saved = true;
    await act(async () => {
      saved = await result.current.changeTask(task, { title: 'x' });
    });

    expect(saved).toBe(false);
    expect(result.current.error).toBe('update');
    expect(result.current.tasks).toEqual([task]);
  });

  it('deletes a task', async () => {
    const { result } = renderHook(() => useGardenTasks());
    await flush();
    mockedDelete.mockResolvedValue(undefined);

    let removed = false;
    await act(async () => {
      removed = await result.current.removeTask(task);
    });

    expect(removed).toBe(true);
    expect(mockedDelete).toHaveBeenCalledWith(7, 1);
    expect(result.current.tasks).toEqual([]);
  });

  it('keeps the task when it cannot be deleted', async () => {
    const { result } = renderHook(() => useGardenTasks());
    await flush();
    mockedDelete.mockRejectedValue(new Error('boom'));

    let removed = true;
    await act(async () => {
      removed = await result.current.removeTask(task);
    });

    expect(removed).toBe(false);
    expect(result.current.error).toBe('delete');
    expect(result.current.tasks).toEqual([task]);
  });

  it('removes a recommendation once it is seen', async () => {
    const { result } = renderHook(() => useGardenTasks());
    await flush();
    mockedSeen.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.seeRecommendation(recommendation);
    });

    expect(mockedSeen).toHaveBeenCalledWith(7, 9);
    expect(result.current.recommendations).toEqual([]);
  });

  it('keeps the recommendation when it cannot be marked as seen', async () => {
    const { result } = renderHook(() => useGardenTasks());
    await flush();
    mockedSeen.mockRejectedValue(new Error('boom'));

    await act(async () => {
      await result.current.seeRecommendation(recommendation);
    });

    expect(result.current.error).toBe('update');
    expect(result.current.recommendations).toEqual([recommendation]);
  });

  it('turns a recommendation into a task and loads the list again', async () => {
    const { result } = renderHook(() => useGardenTasks());
    await flush();
    const converted = { ...task, id: 3, title: 'Helada' };
    mockedConvert.mockResolvedValue(undefined);
    mockedList.mockResolvedValue(
      list({ tasks: [task, converted], recommendations: [] }),
    );

    await act(async () => {
      await result.current.makeTask(recommendation);
    });

    expect(mockedConvert).toHaveBeenCalledWith(7, 9);
    expect(result.current.tasks).toEqual([task, converted]);
    expect(result.current.recommendations).toEqual([]);
  });

  it('shows an error when the recommendation cannot become a task', async () => {
    const { result } = renderHook(() => useGardenTasks());
    await flush();
    mockedConvert.mockRejectedValue(new Error('boom'));

    await act(async () => {
      await result.current.makeTask(recommendation);
    });

    expect(result.current.error).toBe('update');
  });

  it('never shows the tasks of the previous garden', async () => {
    const { result, rerender } = renderHook(() => useGardenTasks());
    await flush();
    expect(result.current.tasks).toEqual([task]);

    mockedList.mockReturnValue(new Promise(() => undefined));
    mockField = { id: 8, name: 'Hort nou' };
    rerender({});

    expect(result.current.tasks).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(mockedList).toHaveBeenLastCalledWith(8, 'es');
  });
});
