import { fireEvent, render, screen } from '@testing-library/react-native';

import { TaskMonthCalendar } from '@/components/tasks/TaskMonthCalendar';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

function renderMonth(
  changes: Partial<React.ComponentProps<typeof TaskMonthCalendar>> = {},
) {
  const props = {
    month: new Date(2026, 10, 15),
    today: '2026-11-10',
    urgentByDay: {},
    onMonthChange: jest.fn(),
    onSelectDay: jest.fn(),
    ...changes,
  };
  render(<TaskMonthCalendar {...props} />);
  return props;
}

describe('TaskMonthCalendar', () => {
  it('shows the month with all its days', () => {
    renderMonth();

    expect(screen.getByTestId('calendar-month').props.children).toBe(
      'November 2026',
    );
    expect(screen.getByTestId('calendar-day-2026-11-01')).toBeTruthy();
    expect(screen.getByTestId('calendar-day-2026-11-30')).toBeTruthy();
    expect(screen.queryByTestId('calendar-day-2026-12-01')).toBeNull();
  });

  it('puts a dot only on the days with tasks left to do', () => {
    renderMonth({
      urgentByDay: { '2026-11-10': 'high', '2026-11-12': 'low' },
    });

    expect(screen.getByTestId('calendar-dot-2026-11-10')).toBeTruthy();
    expect(screen.getByTestId('calendar-dot-2026-11-12')).toBeTruthy();
    expect(screen.queryByTestId('calendar-dot-2026-11-11')).toBeNull();
  });

  it('opens the day that is pressed', () => {
    const { onSelectDay } = renderMonth();

    fireEvent.press(screen.getByTestId('calendar-day-2026-11-20'));

    expect(onSelectDay).toHaveBeenCalledWith('2026-11-20');
  });

  it('moves to the next and the previous month', () => {
    const { onMonthChange } = renderMonth({ month: new Date(2026, 11, 1) });

    fireEvent.press(screen.getByTestId('calendar-next-month'));
    expect(onMonthChange).toHaveBeenLastCalledWith(new Date(2027, 0, 1));

    fireEvent.press(screen.getByTestId('calendar-previous-month'));
    expect(onMonthChange).toHaveBeenLastCalledWith(new Date(2026, 10, 1));
  });

  it('shows the phase of the moon on every day', () => {
    renderMonth();

    expect(screen.getByTestId('calendar-moon-2026-11-09')).toBeTruthy();
    expect(screen.getByTestId('calendar-moon-2026-11-24')).toBeTruthy();
    expect(
      screen.getByTestId('calendar-moon-2026-11-24').props.accessibilityLabel,
    ).toBe('tasks.moon.full');
    expect(
      screen.getByTestId('calendar-moon-2026-11-09').props.accessibilityLabel,
    ).toBe('tasks.moon.new');
    expect(screen.getAllByLabelText(/^tasks\.moon\./)).toHaveLength(30);
  });
});
