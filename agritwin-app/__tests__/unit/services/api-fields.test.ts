process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000';

import { getAuth } from '../../../src/services/auth';
import {
  createDevice,
  createField,
  deleteDevice,
  geocodeLocation,
  getField,
  getFields,
  getMe,
  isAuthError,
  updateDevice,
  updateField,
  updateMe,
  updateMyEmail,
  updateMyPassword,
} from '../../../src/services/api';

jest.mock('../../../src/services/auth', () => ({
  getAuth: jest.fn(),
}));

const mockedGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;

describe('fields api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockResolvedValue({
      token: 'token',
      refreshToken: null,
      username: 'ainhoa',
    });
  });

  it('detects auth errors', () => {
    expect(isAuthError(new Error('Not authenticated'))).toBe(true);
    expect(isAuthError(new Error('Could not validate credentials'))).toBe(true);
    expect(isAuthError(new Error('oops'))).toBe(false);
    expect(isAuthError('nope')).toBe(false);
  });

  it('throws when there is no token', async () => {
    mockedGetAuth.mockResolvedValueOnce(null);
    await expect(getFields()).rejects.toThrow('Not authenticated');
  });

  it('loads fields and normalizes ids', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: '3',
          name: 'Hort',
          location: null,
          field_type: null,
          soil_type: null,
          size_m2: null,
          device_count: '1',
        },
      ],
    }) as jest.Mock;

    await expect(getFields()).resolves.toEqual([
      {
        id: 3,
        name: 'Hort',
        location: null,
        field_type: null,
        soil_type: null,
        size_m2: null,
        device_count: 1,
      },
    ]);
  });

  it('loads one field', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 3,
        name: 'Hort',
        location: null,
        field_type: null,
        soil_type: null,
        size_m2: null,
        device_count: 0,
        devices: [],
      }),
    }) as jest.Mock;

    await expect(getField(3)).resolves.toMatchObject({
      id: 3,
      name: 'Hort',
      devices: [],
    });
  });

  it('throws the api detail when listing fields fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Could not validate credentials' }),
    }) as jest.Mock;

    await expect(getFields()).rejects.toThrow('Could not validate credentials');
  });

  it('creates a field', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 8,
        name: 'Hort nou',
        location: 'Andorra',
        lat: 42.5,
        lon: 1.5,
        field_type: 'home_garden',
        soil_type: 'loam',
        size_m2: 20,
        device_count: 0,
      }),
    }) as jest.Mock;

    await expect(
      createField({
        name: 'Hort nou',
        location: 'Andorra',
        lat: 42.5,
        lon: 1.5,
        field_type: 'home_garden',
        soil_type: 'loam',
        size_m2: 20,
      }),
    ).resolves.toMatchObject({ id: 8, lat: 42.5 });
  });

  it('geocodes a location', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lat: 42.5, lon: 1.5, label: 'Andorra' }),
    }) as jest.Mock;

    await expect(geocodeLocation('Andorra')).resolves.toEqual({
      lat: 42.5,
      lon: 1.5,
      label: 'Andorra',
    });
  });

  it('links a device to a field', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'esp32_sim_01',
        battery_status: false,
        brand: 'ESP32',
        serial_number: 'SN-1',
      }),
    }) as jest.Mock;

    await expect(
      createDevice(3, {
        id: 'esp32_sim_01',
        brand: 'ESP32',
        serial_number: 'SN-1',
      }),
    ).resolves.toMatchObject({ id: 'esp32_sim_01' });
  });

  it('updates and deletes a device', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'esp32_sim_01',
        battery_status: true,
        brand: 'ESP32',
        serial_number: 'SN-9',
      }),
    }) as jest.Mock;

    await expect(
      updateDevice(3, 'esp32_sim_01', {
        brand: 'ESP32',
        serial_number: 'SN-9',
      }),
    ).resolves.toMatchObject({ serial_number: 'SN-9' });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    }) as jest.Mock;

    await expect(deleteDevice(3, 'esp32_sim_01')).resolves.toBeUndefined();
  });

  it('rejects a fields payload that is not a list', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ nope: true }),
    }) as jest.Mock;

    await expect(getFields()).rejects.toThrow(TypeError);
  });

  it('loads and updates the profile', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        username: 'ainhoa',
        email: 'a@test.com',
        name: 'Ainhoa',
        language: 'ca',
        notifications_enabled: true,
        weather_alerts_enabled: true,
      }),
    }) as jest.Mock;

    await expect(getMe()).resolves.toMatchObject({ name: 'Ainhoa' });
    await expect(
      updateMe({
        name: 'Ainhoa',
        language: 'ca',
        notifications_enabled: true,
        weather_alerts_enabled: true,
      }),
    ).resolves.toMatchObject({ email: 'a@test.com' });
  });

  it('updates email, password and a field', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 3,
        name: 'Hort',
        email: 'new@test.com',
      }),
    }) as jest.Mock;

    await expect(updateMyEmail('new@test.com')).resolves.toMatchObject({
      email: 'new@test.com',
    });
    await expect(
      updateMyPassword('old', 'newpass12', 'newpass12'),
    ).resolves.toBeUndefined();
    await expect(
      updateField(3, {
        name: 'Hort',
        location: null,
        field_type: null,
        soil_type: null,
        size_m2: null,
      }),
    ).resolves.toMatchObject({ id: 3 });
  });

  it('throws the profile detail when getMe fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'User profile not found' }),
    }) as jest.Mock;

    await expect(getMe()).rejects.toThrow('User profile not found');
  });

  it('throws without a token on profile calls', async () => {
    mockedGetAuth.mockResolvedValueOnce(null);
    await expect(getMe()).rejects.toThrow('Not authenticated');
    mockedGetAuth.mockResolvedValueOnce(null);
    await expect(updateMyEmail('a@test.com')).rejects.toThrow(
      'Not authenticated',
    );
    mockedGetAuth.mockResolvedValueOnce(null);
    await expect(updateMyPassword('a', 'b', 'b')).rejects.toThrow(
      'Not authenticated',
    );
  });
});
