import { fireEvent, render, screen } from '@testing-library/react-native';

import { TaskGroups } from '@/components/tasks/TaskGroups';
import type { GardenTask } from '@/services/api';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function task(changes: Partial<GardenTask>): GardenTask {
  return {
    id: 1,
    title: 'Regar',
    details: null,
    due_on: '2026-11-10',
    source: 'user',
    priority: 'medium',
    completion_reason: null,
    completed: false,
    can_delete: true,
    created_at: '2026-11-10T08:00:00',
    ...changes,
  };
}

describe('TaskGroups', () => {
  it('separates red, orange and green tasks and the done ones', () => {
    render(
      <TaskGroups
        tasks={[
          task({ id: 1, title: 'Verda', priority: 'low' }),
          task({ id: 2, title: 'Vermella', priority: 'high' }),
          task({ id: 3, title: 'Taronja', priority: 'medium' }),
          task({ id: 4, title: 'Feta', priority: 'high', completed: true }),
        ]}
        onToggle={jest.fn()}
        onPress={jest.fn()}
      />,
    );

    for (const key of ['high', 'medium', 'low', 'done']) {
      expect(screen.getByTestId(`task-group-${key}`)).toBeTruthy();
    }
    expect(screen.getByText('tasks.high')).toBeTruthy();
    expect(screen.getByText('tasks.done')).toBeTruthy();
    expect(screen.getByTestId('task-4')).toBeTruthy();
  });

  it('shows only the groups that have tasks', () => {
    render(
      <TaskGroups
        tasks={[task({ id: 1, priority: 'low' })]}
        onToggle={jest.fn()}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId('task-group-low')).toBeTruthy();
    expect(screen.queryByTestId('task-group-high')).toBeNull();
    expect(screen.queryByTestId('task-group-done')).toBeNull();
  });

  it('passes the taps of its cards on', () => {
    const onToggle = jest.fn();
    const onPress = jest.fn();
    const row = task({ id: 5 });
    render(<TaskGroups tasks={[row]} onToggle={onToggle} onPress={onPress} />);

    fireEvent.press(screen.getByTestId('task-toggle-5'));
    expect(onToggle).toHaveBeenCalledWith(row);

    fireEvent.press(screen.getByTestId('task-5'));
    expect(onPress).toHaveBeenCalledWith(row);
  });
});
