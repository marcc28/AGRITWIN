import { getAuth } from '../../../src/services/auth';
import {
  createDevice,
  createField,
  deleteDevice,
  geocodeLocation,
  reverseGeocodeLocation,
  getField,
  getFields,
  getMe,
  isAuthError,
  updateDevice,
  updateField,
  updateMe,
  updateMyEmail,
  updateMyPassword,
  getDashboard,
  signup,
  login,
  getPrivacyPolicy,
  getSecurityPolicy,
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

  it('signs up with policy acceptance and returns the created account', async () => {
    const account = { id: 1, username: 'ainhoa' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => account,
    }) as jest.Mock;

    await expect(
      signup('ainhoa', 'a@test.com', 'password', 'password', true, true),
    ).resolves.toEqual(account);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/users',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          username: 'ainhoa',
          email: 'a@test.com',
          password: 'password',
          password_conf: 'password',
          privacy_terms_accepted: true,
          security_terms_accepted: true,
        }),
      }),
    );
  });

  it('reports signup and login API errors with sensible fallbacks', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Username already exists' }),
    }) as jest.Mock;
    await expect(
      signup('ainhoa', 'a@test.com', 'password', 'password', true, true),
    ).rejects.toThrow('Username already exists');

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    }) as jest.Mock;
    await expect(login('ainhoa', 'bad')).rejects.toThrow(
      'Error iniciant sessió',
    );
  });

  it('submits login credentials as form data', async () => {
    const token = { access_token: 'jwt', token_type: 'bearer' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => token,
    }) as jest.Mock;

    await expect(login('ainhoa', 'secret')).resolves.toEqual(token);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=ainhoa&password=secret',
      },
    );
  });

  it('loads legal policies and reports failures', async () => {
    const privacy = { document_type: 'privacy', version: '1', content: 'Text' };
    const security = {
      document_type: 'security',
      version: '1',
      content: 'Text',
    };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => privacy })
      .mockResolvedValueOnce({ ok: true, json: async () => security });

    await expect(getPrivacyPolicy()).resolves.toEqual(privacy);
    await expect(getSecurityPolicy()).resolves.toEqual(security);

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    }) as jest.Mock;
    await expect(getPrivacyPolicy()).rejects.toThrow(
      'No s’ha pogut carregar la Privacy Notice',
    );
    await expect(getSecurityPolicy()).rejects.toThrow(
      'No s’ha pogut carregar la Security Policy',
    );
  });

  it('detects auth errors', () => {
    expect(isAuthError(new Error('Not authenticated'))).toBe(true);
    expect(isAuthError(new Error('Could not validate credentials'))).toBe(true);
    expect(isAuthError(new Error('oops'))).toBe(false);
    expect(isAuthError('nope')).toBe(false);
  });

  it('loads dashboard data and supports legacy device_id responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        field_name: 'Hort',
        device_id: 'device-1',
      }),
    }) as jest.Mock;

    await expect(getDashboard(3)).resolves.toEqual({
      field_name: 'Hort',
      device_ids: ['device-1'],
      latest: null,
      history: [],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/dashboard?field_id=3',
      { headers: { Authorization: 'Bearer token' } },
    );
  });

  it('loads a dashboard without an optional field id', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ device_ids: ['d1', 'd2'], latest: {}, history: [] }),
    }) as jest.Mock;

    await expect(getDashboard()).resolves.toMatchObject({
      field_name: null,
      device_ids: ['d1', 'd2'],
      latest: {},
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/dashboard',
      expect.any(Object),
    );
  });

  it('rejects dashboard requests without a token and reports API errors', async () => {
    mockedGetAuth.mockResolvedValueOnce(null);
    await expect(getDashboard()).rejects.toThrow('Not authenticated');

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Dashboard unavailable' }),
    }) as jest.Mock;
    await expect(getDashboard()).rejects.toThrow('Dashboard unavailable');
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

  it('maps devices_online when the fields list includes it', async () => {
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
          device_count: '2',
          devices_online: '1',
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
        device_count: 2,
        devices_online: 1,
      },
    ]);
  });

  it('keeps devices_online omitted when the backend does not send it', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 3,
          name: 'Hort',
          location: null,
          field_type: null,
          soil_type: null,
          size_m2: null,
          device_count: 0,
        },
      ],
    }) as jest.Mock;

    const fields = await getFields();
    expect(fields[0]).toEqual({
      id: 3,
      name: 'Hort',
      location: null,
      field_type: null,
      soil_type: null,
      size_m2: null,
      device_count: 0,
    });
    expect(fields[0]).not.toHaveProperty('devices_online');
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

  it('throws without a token on field writes', async () => {
    mockedGetAuth.mockResolvedValue(null);
    await expect(
      createField({
        name: 'Hort',
        location: null,
        field_type: null,
        soil_type: null,
        size_m2: null,
      }),
    ).rejects.toThrow('Not authenticated');
    mockedGetAuth.mockResolvedValueOnce(null);
    await expect(geocodeLocation('Andorra')).rejects.toThrow(
      'Not authenticated',
    );
    mockedGetAuth.mockResolvedValueOnce(null);
    await expect(
      createDevice(3, { id: 'd1', brand: 'ESP32', serial_number: 'SN' }),
    ).rejects.toThrow('Not authenticated');
    mockedGetAuth.mockResolvedValueOnce(null);
    await expect(
      updateDevice(3, 'd1', { brand: 'ESP32', serial_number: 'SN' }),
    ).rejects.toThrow('Not authenticated');
    mockedGetAuth.mockResolvedValueOnce(null);
    await expect(deleteDevice(3, 'd1')).rejects.toThrow('Not authenticated');
  });

  it('throws the api detail when field writes fail', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'This device is already registered' }),
    }) as jest.Mock;

    await expect(
      createField({
        name: 'Hort',
        location: null,
        field_type: null,
        soil_type: null,
        size_m2: null,
      }),
    ).rejects.toThrow('This device is already registered');
    await expect(geocodeLocation('xxxx')).rejects.toThrow(
      'This device is already registered',
    );
    await expect(
      createDevice(3, { id: 'd1', brand: 'ESP32', serial_number: 'SN' }),
    ).rejects.toThrow('This device is already registered');
    await expect(
      updateDevice(3, 'd1', { brand: 'ESP32', serial_number: 'SN' }),
    ).rejects.toThrow('This device is already registered');
    await expect(deleteDevice(3, 'd1')).rejects.toThrow(
      'This device is already registered',
    );
  });
});

describe('boundary-capable field API', () => {
  beforeEach(() =>
    mockedGetAuth.mockResolvedValue({
      token: 'token',
      refreshToken: null,
      username: 'owner',
    }),
  );
  const payload = {
    name: 'Field',
    location: 'Field road',
    field_type: 'open_field',
    soil_type: 'loam',
    size_m2: 1,
    boundary: [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 0.001 },
      { lat: 0.001, lon: 0.001 },
    ],
  };
  it('does not create a field if the backend would discard its boundary', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        components: {
          schemas: { FieldCreate: { properties: { name: {} } } },
        },
      }),
    });
    await expect(createField(payload)).rejects.toThrow(
      'backend must be updated',
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  it('sends the boundary after verifying the backend schema', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          components: {
            schemas: { FieldCreate: { properties: { boundary: {} } } },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, ...payload }),
      });
    await createField(payload);
    expect(global.fetch).toHaveBeenLastCalledWith(
      'http://localhost:8000/api/v1/fields',
      expect.objectContaining({ body: JSON.stringify(payload) }),
    );
  });
  it('reverse geocodes the selected coordinates through the authenticated API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lat: 41, lon: 2, label: 'Field road' }),
    });
    await expect(reverseGeocodeLocation(41, 2)).resolves.toHaveProperty(
      'label',
      'Field road',
    );
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/reverse-geocode?lat=41&lon=2',
      expect.objectContaining({ headers: { Authorization: 'Bearer token' } }),
    );
  });
});
