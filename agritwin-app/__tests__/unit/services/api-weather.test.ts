process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000';

import { getAuth } from '../../../src/services/auth';
import {
  getFieldWeather,
  WeatherRequestError,
} from '../../../src/services/api';

jest.mock('../../../src/services/auth', () => ({
  getAuth: jest.fn(),
}));

const mockedGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;

describe('weather api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockResolvedValue({
      token: 'token',
      refreshToken: null,
      username: 'cinta',
    });
  });

  it('throws when there is no token', async () => {
    mockedGetAuth.mockResolvedValueOnce(null);
    global.fetch = jest.fn();

    await expect(getFieldWeather(1, 'ca')).rejects.toMatchObject({
      message: 'Not authenticated',
      status: 401,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('loads the weather of a field with the token', async () => {
    const weather = { lang: 'ca', daily: [] };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => weather,
    });

    await expect(getFieldWeather(4, 'es-ES')).resolves.toEqual(weather);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/weather/fields/4?days=3&lang=es-ES',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        },
      },
    );
  });

  it('asks for the number of days', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await getFieldWeather(2, 'ca', 5);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/weather/fields/2?days=5&lang=ca',
      expect.any(Object),
    );
  });

  it('throws the detail and the status of an error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Field has no location' }),
    });

    const error = await getFieldWeather(3, 'ca').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(WeatherRequestError);
    expect(error).toMatchObject({
      message: 'Field has no location',
      status: 404,
    });
  });

  it('throws an empty message when the error has no detail', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ detail: [{ msg: 'x' }] }),
    });

    await expect(getFieldWeather(3, 'ca')).rejects.toMatchObject({
      message: '',
      status: 503,
    });
  });
});
