import type { GardenTask } from '@/services/api';
import {
  addDays,
  changedFields,
  dayRelation,
  formatDay,
  groupTasks,
  isIsoDay,
  isoDate,
  monthCells,
  parseIsoDate,
  sortTasks,
  urgentPriorityByDay,
  weekdayLabels,
} from '@/utils/tasks';

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

describe('task day helpers', () => {
  it('writes a date as YYYY-MM-DD', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(isoDate(new Date(2026, 10, 30))).toBe('2026-11-30');
  });

  it('reads a day at noon so it never changes day', () => {
    const value = parseIsoDate('2026-03-29');
    expect([value.getFullYear(), value.getMonth(), value.getDate()]).toEqual([
      2026, 2, 29,
    ]);
    expect(value.getHours()).toBe(12);
  });

  it('moves a day forward and back across months and years', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-11-10', 0)).toBe('2026-11-10');
  });

  it('accepts only YYYY-MM-DD', () => {
    expect(isIsoDay('2026-11-10')).toBe(true);
    expect(isIsoDay('10/11/2026')).toBe(false);
    expect(isIsoDay('2026-11-1')).toBe(false);
    expect(isIsoDay(undefined)).toBe(false);
  });

  it('writes a day with its name in the language', () => {
    expect(formatDay('2026-11-10', 'en')).toBe('Tuesday, November 10');
  });
});

describe('month grid', () => {
  it('starts on Monday and leaves empty cells before day one', () => {
    // November 2026 starts on a Sunday: six empty cells come first.
    const cells = monthCells(new Date(2026, 10, 15));
    expect(cells.slice(0, 6).every((cell) => cell === null)).toBe(true);
    expect(cells[6]?.getDate()).toBe(1);
    expect(cells).toHaveLength(6 + 30);
    expect(cells[cells.length - 1]?.getDate()).toBe(30);
  });

  it('has no empty cells when the month starts on a Monday', () => {
    // June 2026 starts on a Monday.
    const cells = monthCells(new Date(2026, 5, 1));
    expect(cells[0]?.getDate()).toBe(1);
    expect(cells).toHaveLength(30);
  });

  it('knows how long February is', () => {
    expect(monthCells(new Date(2028, 1, 1)).filter(Boolean)).toHaveLength(29);
    expect(monthCells(new Date(2027, 1, 1)).filter(Boolean)).toHaveLength(28);
  });

  it('names the week days Monday first', () => {
    expect(weekdayLabels('en')).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
  });
});

describe('task order and urgency', () => {
  it('puts pending tasks first and orders them by priority', () => {
    const sorted = sortTasks([
      task({ id: 1, priority: 'low' }),
      task({ id: 2, priority: 'high', completed: true }),
      task({ id: 3, priority: 'high' }),
      task({ id: 4, priority: 'medium' }),
    ]);
    expect(sorted.map((row) => row.id)).toEqual([3, 4, 1, 2]);
  });

  it('does not change the list it receives', () => {
    const rows = [
      task({ id: 1, priority: 'low' }),
      task({ id: 2, priority: 'high' }),
    ];
    sortTasks(rows);
    expect(rows.map((row) => row.id)).toEqual([1, 2]);
  });

  it('gives each day the most urgent task left to do', () => {
    const days = urgentPriorityByDay([
      task({ due_on: '2026-11-10', priority: 'low' }),
      task({ due_on: '2026-11-10', priority: 'high' }),
      task({ due_on: '2026-11-10', priority: 'medium' }),
      task({ due_on: '2026-11-11', priority: 'low' }),
      task({ due_on: '2026-11-12', priority: 'high', completed: true }),
      task({ due_on: null, priority: 'high' }),
    ]);
    expect(days).toEqual({ '2026-11-10': 'high', '2026-11-11': 'low' });
  });
});

describe('groupTasks', () => {
  it('puts red, orange and green first and the done ones last', () => {
    const groups = groupTasks([
      task({ id: 1, priority: 'low' }),
      task({ id: 2, priority: 'high' }),
      task({ id: 3, priority: 'medium', completed: true }),
      task({ id: 4, priority: 'high' }),
    ]);

    expect(groups.map((group) => group.key)).toEqual(['high', 'low', 'done']);
    expect(groups[0].tasks.map((row) => row.id)).toEqual([2, 4]);
    expect(groups[2].tasks.map((row) => row.id)).toEqual([3]);
  });

  it('leaves out the groups with nothing in them', () => {
    expect(groupTasks([])).toEqual([]);
  });
});

describe('dayRelation', () => {
  it('knows yesterday, today and tomorrow', () => {
    expect(dayRelation('2026-11-09', '2026-11-10')).toBe('yesterday');
    expect(dayRelation('2026-11-10', '2026-11-10')).toBe('today');
    expect(dayRelation('2026-11-11', '2026-11-10')).toBe('tomorrow');
  });

  it('gives nothing for any other day', () => {
    expect(dayRelation('2026-11-20', '2026-11-10')).toBeNull();
  });
});

describe('changedFields', () => {
  const values = {
    title: 'Regar',
    details: '',
    priority: 'medium' as const,
    day: '2026-11-10',
  };

  it('is empty when nothing changed', () => {
    expect(changedFields(task({}), values)).toEqual({});
    expect(changedFields(task({}), { ...values, title: '  Regar ' })).toEqual(
      {},
    );
  });

  it('holds only what the user changed', () => {
    expect(
      changedFields(task({ details: 'Poc' }), {
        title: 'Podar',
        details: '  ',
        priority: 'high',
        day: '2026-11-12',
      }),
    ).toEqual({
      title: 'Podar',
      details: null,
      priority: 'high',
      due_on: '2026-11-12',
    });
  });

  it('sends new details', () => {
    expect(changedFields(task({}), { ...values, details: ' Molt ' })).toEqual({
      details: 'Molt',
    });
  });
});
