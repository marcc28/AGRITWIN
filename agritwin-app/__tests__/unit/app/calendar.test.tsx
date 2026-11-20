import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Dimensions } from 'react-native';

import CalendarScreen from '@/app/app/calendar';
import type { GardenRecommendation, GardenTask } from '@/services/api';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
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
  hasSensors: true,
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

// Lets the promises of the form finish. The clock is frozen in these tests,
// so the async helpers of the library are not used here.
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setImmediate(resolve));
  });
}

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

function recommendation(
  changes: Partial<GardenRecommendation>,
): GardenRecommendation {
  return {
    id: 1,
    title: 'Helada',
    details: null,
    due_on: '2026-11-10',
    signature: 'frost',
    ...changes,
  };
}

describe('calendar tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Only the date is frozen, so promises and timers keep working.
    jest.useFakeTimers({
      now: new Date(2026, 10, 10, 12),
      doNotFake: [
        'nextTick',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
        'queueMicrotask',
      ],
    });
    Object.assign(mockGarden, {
      field: { id: 7, name: 'Hort del Pere' },
      loading: false,
      tasks: [],
      recommendations: [],
      today: '2026-11-10',
      hasSensors: true,
      error: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the title, the garden and the three days', () => {
    render(<CalendarScreen />);

    expect(screen.getByText('tasks.title')).toBeTruthy();
    expect(screen.getByText('Hort del Pere')).toBeTruthy();
    expect(screen.getByText('tasks.yesterday')).toBeTruthy();
    expect(screen.getByText('Monday, November 9')).toBeTruthy();
    expect(screen.getByText('tasks.today')).toBeTruthy();
    expect(screen.getByText('Tuesday, November 10')).toBeTruthy();
    expect(screen.getByText('tasks.tomorrow')).toBeTruthy();
    expect(screen.getByText('Wednesday, November 11')).toBeTruthy();
    expect(screen.getAllByText('tasks.empty')).toHaveLength(3);
    expect(screen.getByTestId('calendar-month').props.children).toBe(
      'November 2026',
    );
  });

  it('asks the user to choose a garden when there is none', () => {
    mockGarden.field = null;
    render(<CalendarScreen />);

    expect(screen.getByText('tasks.noGarden')).toBeTruthy();
    expect(screen.queryByTestId('task-open-add')).toBeNull();
    expect(screen.queryByTestId('tasks-no-sensors')).toBeNull();
  });

  it('shows each task under its day, the pending ones first', () => {
    mockGarden.tasks = [
      task({ id: 1, title: 'Feta', completed: true, priority: 'high' }),
      task({ id: 2, title: 'Pendent', priority: 'low' }),
      task({ id: 3, title: 'De demà', due_on: '2026-11-11' }),
      task({ id: 4, title: 'Molt lluny', due_on: '2026-11-25' }),
    ];
    render(<CalendarScreen />);

    expect(screen.getByTestId('task-1')).toBeTruthy();
    expect(screen.getByTestId('task-3')).toBeTruthy();
    expect(screen.queryByText('Molt lluny')).toBeNull();
    const titles = screen
      .getAllByText(/^(Feta|Pendent)$/)
      .map((node) => node.props.children);
    expect(titles).toEqual(['Pendent', 'Feta']);
    expect(screen.getAllByText('tasks.empty')).toHaveLength(1);
  });

  it('puts a dot on the days that still have tasks', () => {
    mockGarden.tasks = [
      task({ id: 1, due_on: '2026-11-25', priority: 'high' }),
      task({ id: 2, due_on: '2026-11-26', completed: true }),
    ];
    render(<CalendarScreen />);

    expect(screen.getByTestId('calendar-dot-2026-11-25')).toBeTruthy();
    expect(screen.queryByTestId('calendar-dot-2026-11-26')).toBeNull();
  });

  it('opens the day that is pressed', () => {
    render(<CalendarScreen />);

    fireEvent.press(screen.getByTestId('calendar-day-2026-11-25'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/task-day',
      params: { date: '2026-11-25' },
    });
  });

  it('changes the month', () => {
    render(<CalendarScreen />);

    fireEvent.press(screen.getByTestId('calendar-next-month'));
    expect(screen.getByTestId('calendar-month').props.children).toBe(
      'December 2026',
    );
    fireEvent.press(screen.getByTestId('calendar-previous-month'));
    fireEvent.press(screen.getByTestId('calendar-previous-month'));
    expect(screen.getByTestId('calendar-month').props.children).toBe(
      'October 2026',
    );
  });

  it('marks a task as done', () => {
    mockGarden.tasks = [task({ id: 5 })];
    render(<CalendarScreen />);

    fireEvent.press(screen.getByTestId('task-toggle-5'));

    expect(mockGarden.toggle).toHaveBeenCalledWith(mockGarden.tasks[0]);
  });

  it('shows only the recommendations of yesterday, today and tomorrow', () => {
    mockGarden.recommendations = [
      recommendation({ id: 1, title: 'Ahir', due_on: '2026-11-09' }),
      recommendation({ id: 2, title: 'Avui', due_on: '2026-11-10' }),
      recommendation({ id: 3, title: 'Demà', due_on: '2026-11-11' }),
      recommendation({ id: 4, title: 'Passat demà', due_on: '2026-11-12' }),
      recommendation({ id: 5, title: 'Fa dies', due_on: '2026-11-07' }),
    ];
    render(<CalendarScreen />);

    expect(screen.getByText('Ahir')).toBeTruthy();
    expect(screen.getByText('Avui')).toBeTruthy();
    expect(screen.getByText('Demà')).toBeTruthy();
    expect(screen.queryByText('Passat demà')).toBeNull();
    expect(screen.queryByText('Fa dies')).toBeNull();
  });

  it('lets the user dismiss a recommendation or turn it into a task', () => {
    mockGarden.recommendations = [recommendation({ id: 8 })];
    render(<CalendarScreen />);

    fireEvent.press(screen.getByTestId('recommendation-seen-8'));
    expect(mockGarden.seeRecommendation).toHaveBeenCalledWith(
      mockGarden.recommendations[0],
    );

    fireEvent.press(screen.getByTestId('recommendation-convert-8'));
    expect(mockGarden.makeTask).toHaveBeenCalledWith(
      mockGarden.recommendations[0],
    );
  });

  it('adds a manual task for today with the form', async () => {
    mockGarden.addTask.mockResolvedValue(true);
    render(<CalendarScreen />);
    expect(screen.queryByTestId('task-input')).toBeNull();

    fireEvent.press(screen.getByTestId('task-open-add'));
    fireEvent.changeText(screen.getByTestId('task-input'), 'Podar');
    fireEvent.press(screen.getByTestId('task-priority-low'));
    fireEvent.press(screen.getByTestId('task-save'));

    await flush();

    expect(screen.queryByTestId('task-input')).toBeNull();
    expect(mockGarden.addTask).toHaveBeenCalledWith({
      title: 'Podar',
      details: '',
      priority: 'low',
      day: '2026-11-10',
    });
  });

  it('opens a task to edit it, keeping the form open if saving fails', async () => {
    mockGarden.tasks = [task({ id: 5, title: 'Regar' })];
    mockGarden.changeTask.mockResolvedValue(false);
    render(<CalendarScreen />);

    fireEvent.press(screen.getByTestId('task-5'));
    expect(screen.getByTestId('task-input').props.value).toBe('Regar');
    fireEvent.changeText(screen.getByTestId('task-input'), 'Regar tard');
    fireEvent.press(screen.getByTestId('task-save'));

    await flush();

    expect(mockGarden.changeTask).toHaveBeenCalledWith(mockGarden.tasks[0], {
      title: 'Regar tard',
    });
    expect(screen.getByTestId('task-input')).toBeTruthy();
  });

  it('deletes a task from the form', async () => {
    mockGarden.tasks = [task({ id: 5 })];
    mockGarden.removeTask.mockResolvedValue(true);
    render(<CalendarScreen />);

    fireEvent.press(screen.getByTestId('task-5'));
    fireEvent.press(screen.getByTestId('task-delete'));
    fireEvent.press(screen.getByTestId('task-delete'));

    await flush();

    expect(mockGarden.removeTask).toHaveBeenCalledWith(mockGarden.tasks[0]);
    expect(screen.queryByTestId('task-input')).toBeNull();
  });

  it('says the garden has no sensors', () => {
    mockGarden.hasSensors = false;
    render(<CalendarScreen />);

    expect(screen.getByTestId('tasks-no-sensors')).toBeTruthy();
    expect(screen.getByText('tasks.noSensors')).toBeTruthy();
  });

  it('does not say it before the tasks are loaded', () => {
    mockGarden.hasSensors = false;
    mockGarden.loading = true;
    render(<CalendarScreen />);

    expect(screen.getByTestId('tasks-loading')).toBeTruthy();
    expect(screen.queryByTestId('tasks-no-sensors')).toBeNull();
  });

  it('shows what went wrong', () => {
    mockGarden.error = 'load';
    render(<CalendarScreen />);

    expect(screen.getByText('tasks.errors.load')).toBeTruthy();
  });

  it('keeps the phone column and widens it on a tablet', () => {
    const previous = {
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen'),
    };
    function show(width: number, height: number) {
      Dimensions.set({
        window: { width, height, scale: 2, fontScale: 1 },
        screen: { width, height, scale: 2, fontScale: 1 },
      });
      render(<CalendarScreen />);
    }

    try {
      show(390, 844);
      expect(screen.getByTestId('calendar-content').props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ maxWidth: 440 })]),
      );
      screen.unmount();

      show(800, 400);
      expect(screen.getByTestId('calendar-content').props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ maxWidth: 720 })]),
      );
    } finally {
      Dimensions.set(previous);
    }
  });
});
