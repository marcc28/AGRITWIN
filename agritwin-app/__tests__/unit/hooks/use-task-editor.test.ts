import { act, renderHook } from '@testing-library/react-native';

import { useTaskEditor } from '@/hooks/use-task-editor';
import type { GardenTask } from '@/services/api';

const task: GardenTask = {
  id: 4,
  title: 'Regar',
  details: null,
  due_on: '2026-11-10',
  source: 'ai',
  priority: 'medium',
  completion_reason: null,
  completed: false,
  can_delete: false,
  created_at: '2026-11-10T08:00:00',
};

const values = {
  title: 'Regar',
  details: '',
  priority: 'medium' as const,
  day: '2026-11-10',
};

function setup() {
  const garden = {
    addTask: jest.fn().mockResolvedValue(true),
    changeTask: jest.fn().mockResolvedValue(true),
    removeTask: jest.fn().mockResolvedValue(true),
  };
  const hook = renderHook(() => useTaskEditor(garden));
  return { garden, ...hook };
}

describe('useTaskEditor', () => {
  it('starts closed', () => {
    const { result } = setup();

    expect(result.current.visible).toBe(false);
    expect(result.current.task).toBeNull();
  });

  it('opens to create a task and sends it', async () => {
    const { result, garden } = setup();
    act(() => result.current.openNew());

    expect(result.current.visible).toBe(true);
    expect(result.current.task).toBeNull();

    let saved = false;
    await act(async () => {
      saved = await result.current.save({ ...values, title: 'Podar' });
    });

    expect(saved).toBe(true);
    expect(garden.addTask).toHaveBeenCalledWith({ ...values, title: 'Podar' });
  });

  it('opens a task to edit and sends only what changed', async () => {
    const { result, garden } = setup();
    act(() => result.current.openTask(task));

    expect(result.current.task).toBe(task);

    await act(async () => {
      await result.current.save({ ...values, priority: 'high' });
    });

    expect(garden.changeTask).toHaveBeenCalledWith(task, { priority: 'high' });
    expect(garden.addTask).not.toHaveBeenCalled();
  });

  it('sends nothing when the task did not change', async () => {
    const { result, garden } = setup();
    act(() => result.current.openTask(task));

    let saved = false;
    await act(async () => {
      saved = await result.current.save(values);
    });

    expect(saved).toBe(true);
    expect(garden.changeTask).not.toHaveBeenCalled();
  });

  it('deletes the task it is editing', async () => {
    const { result, garden } = setup();
    act(() => result.current.openTask(task));

    let removed = false;
    await act(async () => {
      removed = await result.current.remove();
    });

    expect(removed).toBe(true);
    expect(garden.removeTask).toHaveBeenCalledWith(task);
  });

  it('does nothing when it is closed or creating', async () => {
    const { result, garden } = setup();

    await act(async () => {
      expect(await result.current.save(values)).toBe(false);
      expect(await result.current.remove()).toBe(false);
    });
    act(() => result.current.openNew());
    await act(async () => {
      expect(await result.current.remove()).toBe(false);
    });

    expect(garden.removeTask).not.toHaveBeenCalled();
    expect(garden.addTask).not.toHaveBeenCalled();
  });

  it('closes', () => {
    const { result } = setup();
    act(() => result.current.openNew());
    act(() => result.current.close());

    expect(result.current.visible).toBe(false);
  });
});
