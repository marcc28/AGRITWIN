import { getAuth } from '../../../src/services/auth';
import {
  convertRecommendation,
  createGardenTask,
  deleteGardenTask,
  dismissRecommendation,
  getGardenTasks,
  updateGardenTask,
  type GardenTask,
} from '../../../src/services/api';

jest.mock('../../../src/services/auth', () => ({
  getAuth: jest.fn(),
}));

const mockedGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;

const task: GardenTask = {
  id: 5,
  title: 'Regar',
  details: null,
  due_on: '2026-11-10',
  source: 'user',
  priority: 'high',
  completion_reason: null,
  completed: false,
  can_delete: true,
  created_at: '2026-11-10T08:00:00',
};

function respond(body: unknown, ok = true, status = ok ? 200 : 400) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
}

describe('garden tasks api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockResolvedValue({
      token: 'token',
      refreshToken: null,
      username: 'cinta',
    });
  });

  it('loads the tasks of a garden in the language of the app', async () => {
    const list = {
      today: '2026-11-10',
      has_sensors: true,
      refresh: false,
      tasks: [task],
      recommendations: [],
    };
    respond(list);

    await expect(getGardenTasks(7, 'es-ES')).resolves.toEqual(list);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/tasks?field_id=7&lang=es-ES',
      { method: 'GET', headers: { Authorization: 'Bearer token' } },
    );
  });

  it('creates a task with its day and priority', async () => {
    respond(task);

    await expect(
      createGardenTask(7, 'Regar', '2026-11-10', 'high'),
    ).resolves.toEqual(task);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/tasks',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          field_id: 7,
          title: 'Regar',
          due_on: '2026-11-10',
          priority: 'high',
          details: null,
        }),
      },
    );
  });

  it('sends the details of a new task', async () => {
    respond(task);

    await createGardenTask(7, 'Regar', '2026-11-10', 'low', '  Al matí  ');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/tasks',
      expect.objectContaining({
        body: JSON.stringify({
          field_id: 7,
          title: 'Regar',
          due_on: '2026-11-10',
          priority: 'low',
          details: 'Al matí',
        }),
      }),
    );
  });

  it('changes a task: done, text, priority or day', async () => {
    respond({ ...task, completed: true });

    await expect(
      updateGardenTask(7, 5, { completed: true }),
    ).resolves.toMatchObject({ completed: true });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/tasks/5?field_id=7',
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: true }),
      },
    );
  });

  it('deletes a task and accepts an empty answer', async () => {
    respond(null, true, 204);

    await expect(deleteGardenTask(7, 5)).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/tasks/5?field_id=7',
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } },
    );
  });

  it('dismisses a recommendation', async () => {
    respond({ ok: true });

    await expect(dismissRecommendation(7, 3)).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/tasks/recommendations/3/seen?field_id=7',
      { method: 'POST', headers: { Authorization: 'Bearer token' } },
    );
  });

  it('turns a recommendation into a task', async () => {
    respond({ ok: true });

    await expect(convertRecommendation(7, 3)).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/tasks/recommendations/3/task?field_id=7',
      { method: 'POST', headers: { Authorization: 'Bearer token' } },
    );
  });

  it.each([
    ['load', () => getGardenTasks(7, 'ca')],
    ['create', () => createGardenTask(7, 'x', '2026-11-10', 'low')],
    ['update', () => updateGardenTask(7, 5, { completed: true })],
    ['delete', () => deleteGardenTask(7, 5)],
    ['dismiss', () => dismissRecommendation(7, 3)],
    ['convert', () => convertRecommendation(7, 3)],
  ])('does not call the server without a session (%s)', async (_name, call) => {
    mockedGetAuth.mockResolvedValueOnce(null);
    global.fetch = jest.fn();

    await expect(call()).rejects.toThrow('Not authenticated');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows the message the server sends', async () => {
    respond({ detail: 'Field not found' }, false);

    await expect(getGardenTasks(7, 'ca')).rejects.toThrow('Field not found');
  });

  it('uses its own message when the server answer is not a text', async () => {
    respond({ detail: [{ msg: 'field required' }] }, false);

    await expect(createGardenTask(7, 'x', '2026-11-10', 'low')).rejects.toThrow(
      'No s’ha pogut crear la tasca',
    );
  });

  it('uses its own message when the server sends no JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    });

    await expect(deleteGardenTask(7, 5)).rejects.toThrow(
      'No s’ha pogut esborrar la tasca',
    );
  });
});
