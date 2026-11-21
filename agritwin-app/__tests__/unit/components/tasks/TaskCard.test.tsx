import { fireEvent, render, screen } from '@testing-library/react-native';

import { TaskCard } from '@/components/tasks/TaskCard';
import type { GardenTask } from '@/services/api';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const task: GardenTask = {
  id: 4,
  title: 'Regar els tomàquets',
  details: null,
  due_on: '2026-11-10',
  source: 'ai',
  priority: 'high',
  completion_reason: null,
  completed: false,
  can_delete: false,
  created_at: '2026-11-10T08:00:00',
};

describe('TaskCard', () => {
  it('shows the title and lets the user mark it as done', () => {
    const onToggle = jest.fn();
    render(<TaskCard task={task} onToggle={onToggle} onPress={jest.fn()} />);

    expect(screen.getByText('Regar els tomàquets')).toBeTruthy();
    expect(screen.queryByText('✓')).toBeNull();
    const box = screen.getByTestId('task-toggle-4');
    expect(box.props.accessibilityLabel).toBe(
      'tasks.complete: Regar els tomàquets',
    );

    fireEvent.press(box);
    expect(onToggle).toHaveBeenCalledWith(task);
  });

  it('shows a done task ticked and lets the user reopen it', () => {
    const onToggle = jest.fn();
    const done = { ...task, completed: true };
    render(<TaskCard task={done} onToggle={onToggle} onPress={jest.fn()} />);

    expect(screen.getByText('✓')).toBeTruthy();
    const box = screen.getByTestId('task-toggle-4');
    expect(box.props.accessibilityState).toEqual({ checked: true });
    expect(box.props.accessibilityLabel).toBe(
      'tasks.reopen: Regar els tomàquets',
    );

    fireEvent.press(box);
    expect(onToggle).toHaveBeenCalledWith(done);
  });

  it('shows the details and the reason it was closed', () => {
    render(
      <TaskCard
        task={{
          ...task,
          details: 'Abans de les 10',
          completion_reason: 'Ha plogut avui',
          completed: true,
        }}
        onToggle={jest.fn()}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Abans de les 10')).toBeTruthy();
    expect(screen.getByText('Ha plogut avui')).toBeTruthy();
  });

  it('opens the task to edit when the card is pressed', () => {
    const onToggle = jest.fn();
    const onPress = jest.fn();
    render(<TaskCard task={task} onToggle={onToggle} onPress={onPress} />);

    fireEvent.press(screen.getByTestId('task-4'));

    expect(onPress).toHaveBeenCalledWith(task);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('marks the tasks that the AI created', () => {
    const { rerender } = render(
      <TaskCard task={task} onToggle={jest.fn()} onPress={jest.fn()} />,
    );
    expect(screen.getByTestId('task-ai-4')).toBeTruthy();

    rerender(
      <TaskCard
        task={{ ...task, source: 'user' }}
        onToggle={jest.fn()}
        onPress={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('task-ai-4')).toBeNull();
  });
});
