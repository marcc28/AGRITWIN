import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Dimensions } from 'react-native';

import TaskDayScreen from '@/app/task-day';
import type { GardenRecommendation, GardenTask } from '@/services/api';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
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

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const mockGarden = {
  field: { id: 7, name: 'Hort del Pere' } as {
    id: number;
    name: string;
  } | null,
  loading: false,
  tasks: [] as GardenTask[],
  recommendations: [] as GardenRecommendation[],
  today: '2026-11-10',
  error: null as 'load' | 'create' | 'update' | 'delete' | null,
  toggle: jest.fn(),
  addTask: jest.fn(),
  changeTask: jest.fn(),
  removeTask: jest.fn(),
  seeRecommendation: jest.fn(),
  makeTask: jest.fn(),
};

jest.mock('@/hooks/use-garden-tasks', () => ({
  useGardenTasks: () => mockGarden,
}));

const mockedParams = useLocalSearchParams as jest.Mock;

function task(changes: Partial<GardenTask>): GardenTask {
  return {
    id: 1,
    title: 'Regar',
    details: null,
    due_on: '2026-11-20',
    source: 'user',
    priority: 'medium',
    completion_reason: null,
    completed: false,
    can_delete: true,
    created_at: '2026-11-10T08:00:00',
    ...changes,
  };
}

function recommendation(
  changes: Partial<GardenRecommendation>,
): GardenRecommendation {
  return {
    id: 1,
    title: 'Helada',
    details: null,
    due_on: '2026-11-20',
    signature: 'frost',
    ...changes,
  };
}

function title() {
  return screen.getByTestId('task-day-title').props.children;
}

describe('task day screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedParams.mockReturnValue({ date: '2026-11-20' });
    Object.assign(mockGarden, {
      field: { id: 7, name: 'Hort del Pere' },
      loading: false,
      tasks: [],
      recommendations: [],
      today: '2026-11-10',
      error: null,
    });
  });

  it('shows the date on top and the tasks of that day only', () => {
    mockGarden.tasks = [
      task({ id: 1, title: 'Feta', completed: true }),
      task({ id: 2, title: 'Pendent' }),
      task({ id: 3, title: 'Un altre dia', due_on: '2026-11-21' }),
    ];
    render(<TaskDayScreen />);

    expect(title()).toBe('Friday, November 20');
    expect(screen.getByText('Pendent')).toBeTruthy();
    expect(screen.getByText('Feta')).toBeTruthy();
    expect(screen.queryByText('Un altre dia')).toBeNull();
    expect(screen.queryByTestId('task-day-empty')).toBeNull();
    expect(screen.queryByTestId('task-day-relation')).toBeNull();
  });

  it('separates the red, orange and green tasks', () => {
    mockGarden.tasks = [
      task({ id: 1, priority: 'low' }),
      task({ id: 2, priority: 'high' }),
      task({ id: 3, priority: 'medium' }),
      task({ id: 4, priority: 'high', completed: true }),
    ];
    render(<TaskDayScreen />);

    for (const key of ['high', 'medium', 'low', 'done']) {
      expect(screen.getByTestId(`task-group-${key}`)).toBeTruthy();
    }
  });

  it('shows the notices of the day above the tasks', () => {
    mockGarden.recommendations = [
      recommendation({ id: 5, title: 'Gelada' }),
      recommendation({ id: 6, title: 'Un altre', due_on: '2026-11-21' }),
    ];
    render(<TaskDayScreen />);

    expect(screen.getByTestId('task-day-notices')).toBeTruthy();
    expect(screen.getByText('Gelada')).toBeTruthy();
    expect(screen.queryByText('Un altre')).toBeNull();

    fireEvent.press(screen.getByTestId('recommendation-seen-5'));
    expect(mockGarden.seeRecommendation).toHaveBeenCalledWith(
      mockGarden.recommendations[0],
    );
    fireEvent.press(screen.getByTestId('recommendation-convert-5'));
    expect(mockGarden.makeTask).toHaveBeenCalledWith(
      mockGarden.recommendations[0],
    );
  });

  it('has no notices block when there are none', () => {
    render(<TaskDayScreen />);

    expect(screen.queryByTestId('task-day-notices')).toBeNull();
  });

  it('accepts the day when the route gives it as a list', () => {
    mockedParams.mockReturnValue({ date: ['2026-11-20'] });
    render(<TaskDayScreen />);

    expect(title()).toBe('Friday, November 20');
  });

  it('moves to the next and the previous day with the arrows', () => {
    mockGarden.tasks = [
      task({ id: 1, title: 'De demà', due_on: '2026-11-21' }),
      task({ id: 2, title: 'De fa dos dies', due_on: '2026-11-18' }),
    ];
    render(<TaskDayScreen />);

    fireEvent.press(screen.getByTestId('task-day-next'));
    expect(title()).toBe('Saturday, November 21');
    expect(screen.getByText('De demà')).toBeTruthy();

    fireEvent.press(screen.getByTestId('task-day-previous'));
    fireEvent.press(screen.getByTestId('task-day-previous'));
    fireEvent.press(screen.getByTestId('task-day-previous'));
    expect(title()).toBe('Wednesday, November 18');
    expect(screen.getByText('De fa dos dies')).toBeTruthy();
    expect(screen.queryByText('De demà')).toBeNull();
  });

  it('says when the day is yesterday, today or tomorrow', () => {
    mockedParams.mockReturnValue({ date: '2026-11-10' });
    render(<TaskDayScreen />);
    expect(screen.getByTestId('task-day-relation').props.children).toBe(
      'tasks.today',
    );

    fireEvent.press(screen.getByTestId('task-day-next'));
    expect(screen.getByTestId('task-day-relation').props.children).toBe(
      'tasks.tomorrow',
    );

    fireEvent.press(screen.getByTestId('task-day-previous'));
    fireEvent.press(screen.getByTestId('task-day-previous'));
    expect(screen.getByTestId('task-day-relation').props.children).toBe(
      'tasks.yesterday',
    );
  });

  it('says there are no tasks on an empty day', () => {
    render(<TaskDayScreen />);

    expect(screen.getByTestId('task-day-empty')).toBeTruthy();
  });

  it('does not say it while the tasks are loading', () => {
    mockGarden.loading = true;
    render(<TaskDayScreen />);

    expect(screen.queryByTestId('task-day-empty')).toBeNull();
  });

  it('marks a task as done', () => {
    mockGarden.tasks = [task({ id: 4 })];
    render(<TaskDayScreen />);

    fireEvent.press(screen.getByTestId('task-toggle-4'));

    expect(mockGarden.toggle).toHaveBeenCalledWith(mockGarden.tasks[0]);
  });

  it('adds a task for the day that is open, even after moving days', async () => {
    mockGarden.addTask.mockResolvedValue(true);
    render(<TaskDayScreen />);

    fireEvent.press(screen.getByTestId('task-day-next'));
    fireEvent.press(screen.getByTestId('task-open-add'));
    expect(screen.getByTestId('task-day-input').props.value).toBe('2026-11-21');
    fireEvent.changeText(screen.getByTestId('task-input'), 'Collir');
    fireEvent.press(screen.getByTestId('task-priority-high'));
    fireEvent.press(screen.getByTestId('task-save'));

    await waitFor(() => {
      expect(mockGarden.addTask).toHaveBeenCalledWith({
        title: 'Collir',
        details: '',
        priority: 'high',
        day: '2026-11-21',
      });
    });
  });

  it('opens a task to change its priority', async () => {
    mockGarden.tasks = [task({ id: 4, source: 'ai', can_delete: false })];
    mockGarden.changeTask.mockResolvedValue(true);
    render(<TaskDayScreen />);

    fireEvent.press(screen.getByTestId('task-4'));
    expect(screen.getByTestId('task-ai-hint')).toBeTruthy();
    fireEvent.press(screen.getByTestId('task-priority-high'));
    fireEvent.press(screen.getByTestId('task-save'));

    await waitFor(() => {
      expect(mockGarden.changeTask).toHaveBeenCalledWith(mockGarden.tasks[0], {
        priority: 'high',
      });
    });
  });

  it('goes back to the calendar', () => {
    render(<TaskDayScreen />);

    fireEvent.press(screen.getByTestId('task-day-back'));

    expect(router.back).toHaveBeenCalled();
  });

  it('shows what went wrong', () => {
    mockGarden.error = 'update';
    render(<TaskDayScreen />);

    expect(screen.getByText('tasks.errors.update')).toBeTruthy();
  });

  it('opens today when the day in the link is not valid', () => {
    mockedParams.mockReturnValue({ date: 'ayer' });
    render(<TaskDayScreen />);

    expect(title()).toBe('Tuesday, November 10');
    expect(screen.getByTestId('task-day-relation').props.children).toBe(
      'tasks.today',
    );
  });

  it('does not offer to add a task without a garden', () => {
    mockGarden.field = null;
    render(<TaskDayScreen />);

    expect(screen.queryByTestId('task-open-add')).toBeNull();
  });

  it('shows the phase of the moon of the day and changes it with the day', () => {
    mockedParams.mockReturnValue({ date: '2026-11-24' });
    render(<TaskDayScreen />);

    expect(screen.getByTestId('task-day-moon')).toBeTruthy();
    expect(screen.getByTestId('task-day-moon-name').props.children).toBe(
      'tasks.moon.full',
    );

    fireEvent.press(screen.getByTestId('task-day-next'));
    fireEvent.press(screen.getByTestId('task-day-next'));
    fireEvent.press(screen.getByTestId('task-day-next'));
    expect(screen.getByTestId('task-day-moon-name').props.children).toBe(
      'tasks.moon.waningGibbous',
    );
  });

  it('uses the same column width as the calendar', () => {
    const previous = {
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen'),
    };
    Dimensions.set({
      window: { width: 1280, height: 800, scale: 2, fontScale: 1 },
      screen: { width: 1280, height: 800, scale: 2, fontScale: 1 },
    });
    try {
      render(<TaskDayScreen />);
      expect(screen.getByTestId('task-day-content').props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ maxWidth: 880 })]),
      );
    } finally {
      Dimensions.set(previous);
    }
  });
});
