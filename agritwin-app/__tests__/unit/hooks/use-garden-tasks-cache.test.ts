import { act, renderHook } from '@testing-library/react-native';

import { useGardenTasks } from '@/hooks/use-garden-tasks';
import {
  deleteGardenTask,
  getGardenTasks,
  type GardenTask,
  type GardenTaskList,
} from '@/services/api';
import { queryClient } from '@/services/queryClient';
import { queryKeys } from '@/services/queryKeys';

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
const mockedDelete = deleteGardenTask as jest.MockedFunction<
  typeof deleteGardenTask
>;

function makeTask(id: number, title: string): GardenTask {
  return {
    id,
    title,
    details: null,
    due_on: '2026-11-10',
    source: 'user',
    priority: 'low',
    completion_reason: null,
    completed: false,
    can_delete: true,
    created_at: '2026-11-10T08:00:00',
  };
}

function list(tasks: GardenTask[]): GardenTaskList {
  return {
    today: '2026-11-10',
    has_sensors: true,
    refresh: false,
    tasks,
    recommendations: [],
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useGardenTasks with the cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockField = { id: 7, name: 'Hort' };
  });

  it('shows the cached list at once and then the fresh one', async () => {
    queryClient.setQueryData(
      queryKeys.tasks(7, 'es'),
      list([makeTask(1, 'Regar')]),
    );
    let answer: (value: GardenTaskList) => void = () => undefined;
    mockedList.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );

    const { result } = renderHook(() => useGardenTasks());

    expect(result.current.loading).toBe(false);
    expect(result.current.tasks.map((item) => item.title)).toEqual(['Regar']);

    await act(async () => answer(list([makeTask(2, 'Podar')])));

    expect(result.current.tasks.map((item) => item.title)).toEqual(['Podar']);
    expect(mockedList).toHaveBeenCalledWith(7, 'es');
  });

  it('keeps the cache equal to the screen after a change', async () => {
    mockedList.mockResolvedValue(
      list([makeTask(1, 'Regar'), makeTask(2, 'Podar')]),
    );
    mockedDelete.mockResolvedValue(undefined);
    const { result } = renderHook(() => useGardenTasks());
    await flush();

    await act(async () => {
      await result.current.removeTask(result.current.tasks[0]);
    });

    const cached = queryClient.getQueryData<GardenTaskList>(
      queryKeys.tasks(7, 'es'),
    );
    expect(cached?.tasks.map((item) => item.title)).toEqual(['Podar']);
  });

  it('shows the cached list of the garden chosen next', async () => {
    queryClient.setQueryData(
      queryKeys.tasks(8, 'es'),
      list([makeTask(5, 'Collir')]),
    );
    mockedList.mockReturnValue(new Promise(() => undefined));
    const { result, rerender } = renderHook(() => useGardenTasks());

    mockField = { id: 8, name: 'Vinya' };
    rerender({});
    await flush();

    expect(result.current.loading).toBe(false);
    expect(result.current.tasks.map((item) => item.title)).toEqual(['Collir']);
  });
});
