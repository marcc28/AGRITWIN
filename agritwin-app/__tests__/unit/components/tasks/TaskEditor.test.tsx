import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { TaskEditor } from '@/components/tasks/TaskEditor';
import type { GardenTask } from '@/services/api';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/DateField', () => ({
  DateField: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  }) => {
    const React = jest.requireActual<typeof import('react')>('react');
    const { TextInput } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return React.createElement(TextInput, {
      testID: 'task-day-input',
      value,
      onChangeText: onChange,
      placeholder,
    });
  },
}));

const task: GardenTask = {
  id: 4,
  title: 'Regar',
  details: 'Al matí',
  due_on: '2026-11-12',
  source: 'user',
  priority: 'low',
  completion_reason: null,
  completed: false,
  can_delete: true,
  created_at: '2026-11-10T08:00:00',
};

function setup(changes: Partial<React.ComponentProps<typeof TaskEditor>> = {}) {
  const props = {
    visible: true,
    task: null as GardenTask | null,
    defaultDay: '2026-11-10',
    onClose: jest.fn(),
    onSave: jest.fn().mockResolvedValue(true),
    onDelete: jest.fn().mockResolvedValue(true),
    ...changes,
  };
  render(<TaskEditor {...props} />);
  return props;
}

describe('TaskEditor', () => {
  it('starts empty to create a task, on the day it was given', () => {
    setup();

    expect(screen.getByText('tasks.newTask')).toBeTruthy();
    expect(screen.getByTestId('task-input').props.value).toBe('');
    expect(screen.getByTestId('task-day-input').props.value).toBe('2026-11-10');
    expect(
      screen.getByTestId('task-priority-medium').props.accessibilityState,
    ).toEqual({ selected: true });
    expect(screen.queryByTestId('task-delete')).toBeNull();
  });

  it('cannot save without a title', () => {
    const { onSave } = setup();

    fireEvent.press(screen.getByTestId('task-save'));
    fireEvent.changeText(screen.getByTestId('task-input'), '   ');
    fireEvent.press(screen.getByTestId('task-save'));

    expect(screen.getByTestId('task-save').props.accessibilityState).toEqual({
      disabled: true,
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('cannot save without a valid day', () => {
    const { onSave } = setup();

    fireEvent.changeText(screen.getByTestId('task-input'), 'Podar');
    fireEvent.changeText(screen.getByTestId('task-day-input'), '');
    fireEvent.press(screen.getByTestId('task-save'));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('creates a task with everything the user filled in and closes', async () => {
    const { onSave, onClose } = setup();

    fireEvent.changeText(screen.getByTestId('task-input'), 'Podar');
    fireEvent.changeText(screen.getByTestId('task-details-input'), 'Poc');
    fireEvent.press(screen.getByTestId('task-priority-high'));
    fireEvent.changeText(screen.getByTestId('task-day-input'), '2026-11-15');
    fireEvent.press(screen.getByTestId('task-save'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith({
      title: 'Podar',
      details: 'Poc',
      priority: 'high',
      day: '2026-11-15',
    });
  });

  it('saves with the keyboard button too', async () => {
    const { onSave } = setup();

    fireEvent.changeText(screen.getByTestId('task-input'), 'Podar');
    fireEvent(screen.getByTestId('task-input'), 'submitEditing');

    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });

  it('stays open when the task could not be saved', async () => {
    const { onSave, onClose } = setup({
      onSave: jest.fn().mockResolvedValue(false),
    });

    fireEvent.changeText(screen.getByTestId('task-input'), 'Podar');
    fireEvent.press(screen.getByTestId('task-save'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId('task-save').props.accessibilityState).toEqual({
        disabled: false,
      }),
    );
  });

  it('shows the task to edit and sends the new values', async () => {
    const { onSave, onClose } = setup({ task });

    expect(screen.getByText('tasks.editTask')).toBeTruthy();
    expect(screen.getByTestId('task-input').props.value).toBe('Regar');
    expect(screen.getByTestId('task-details-input').props.value).toBe(
      'Al matí',
    );
    expect(screen.getByTestId('task-day-input').props.value).toBe('2026-11-12');
    expect(
      screen.getByTestId('task-priority-low').props.accessibilityState,
    ).toEqual({ selected: true });
    expect(screen.queryByTestId('task-ai-hint')).toBeNull();

    fireEvent.changeText(screen.getByTestId('task-input'), 'Regar tard');
    fireEvent.press(screen.getByTestId('task-save'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith({
      title: 'Regar tard',
      details: 'Al matí',
      priority: 'low',
      day: '2026-11-12',
    });
  });

  it('explains that an AI task becomes the user’s when changed', () => {
    setup({
      task: { ...task, source: 'ai', can_delete: false, details: null },
    });

    expect(screen.getByTestId('task-ai-hint')).toBeTruthy();
    expect(screen.getByTestId('task-details-input').props.value).toBe('');
    expect(screen.queryByTestId('task-delete')).toBeNull();
  });

  it('asks twice before deleting a task', async () => {
    const { onDelete, onClose } = setup({ task });

    fireEvent.press(screen.getByTestId('task-delete'));
    expect(screen.getByText('tasks.deleteConfirm')).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('task-delete'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('stays open when the task could not be deleted', async () => {
    const { onDelete, onClose } = setup({
      task,
      onDelete: jest.fn().mockResolvedValue(false),
    });

    fireEvent.press(screen.getByTestId('task-delete'));
    fireEvent.press(screen.getByTestId('task-delete'));

    await waitFor(() => expect(onDelete).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes with the cancel button and with the background', () => {
    const { onClose } = setup();

    fireEvent.press(screen.getByTestId('task-cancel'));
    fireEvent.press(screen.getByTestId('task-editor-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('shows nothing while it is closed', () => {
    setup({ visible: false });

    expect(screen.queryByTestId('task-input')).toBeNull();
  });
});
