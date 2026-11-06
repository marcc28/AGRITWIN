import {
  createFieldCrop,
  deleteFieldCrop,
  getFieldCropById,
  getFieldCrops,
  getFieldCropsCount,
  updateFieldCrop,
  type FieldCrop,
} from '@/services/api_fieldCrops';

const crop: FieldCrop = {
  id: 15,
  field_id: 7,
  crop_id: 3,
  crop_name: 'Tomàquet',
  planted_at: '2026-04-01',
  expected_harvest_at: '2026-08-01',
  status: 'planted',
  notes: 'Reg regular',
};

describe('field crops api', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('lists field crops with pagination and filters', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [crop],
    }) as jest.Mock;

    await expect(
      getFieldCrops(5, 10, 'token', {
        field_id: 7,
        crop_id: 3,
        status: 'planted',
      }),
    ).resolves.toEqual([crop]);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/crops/field-crops?offset=5&limit=10&field_id=7&crop_id=3&status=planted',
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer token',
        },
      },
    );
  });

  it('omits absent filters and keeps zero-valued filters', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [crop],
    }) as jest.Mock;
    await getFieldCrops(0, 10, 'token', {
      field_id: 0,
      crop_id: 0,
      status: '',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/crops/field-crops?offset=0&limit=10&field_id=0&crop_id=0',
      expect.anything(),
    );
    await getFieldCrops(0, 10, 'token');
    expect(global.fetch).toHaveBeenLastCalledWith(
      'http://localhost:8000/api/v1/crops/field-crops?offset=0&limit=10',
      expect.anything(),
    );
  });

  it('returns the field-crop count', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ total: 12 }),
    }) as jest.Mock;

    await expect(getFieldCropsCount('token')).resolves.toBe(12);
  });

  it('gets a field crop by id with an encoded path segment', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => crop,
    }) as jest.Mock;

    await expect(getFieldCropById('15/unsafe', 'token')).resolves.toEqual(crop);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/crops/field-crops/15%2Funsafe',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('creates a field crop with JSON headers and body', async () => {
    const data = {
      field_id: 7,
      crop_id: 3,
      planted_at: '2026-04-01',
      status: 'planted',
      notes: 'Reg regular',
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => crop,
    }) as jest.Mock;

    await expect(createFieldCrop(data, 'token')).resolves.toEqual(crop);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/crops/field-crops',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      },
    );
  });

  it('updates a field crop', async () => {
    const data = { status: 'harvested', notes: 'Fet' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...crop, ...data }),
    }) as jest.Mock;

    await expect(updateFieldCrop(15, data, 'token')).resolves.toMatchObject(
      data,
    );
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/crops/field-crops/15',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    );
  });

  it('deletes a field crop', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;

    await expect(deleteFieldCrop(15, 'token')).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/crops/field-crops/15',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it.each([
    [getFieldCrops, [0, 10, 'token'], 'Error obtenint els cultius del camp'],
    [
      getFieldCropsCount,
      ['token'],
      'Error obtenint el nombre de cultius dels camps',
    ],
    [
      getFieldCropById,
      [15, 'token'],
      'No s’ha pogut carregar el cultiu del camp',
    ],
    [
      updateFieldCrop,
      [15, { status: 'planted' }, 'token'],
      'Error actualitzant el cultiu del camp',
    ],
  ])(
    'uses a fallback API error when detail is not a string',
    async (api, args, message) => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: [{ msg: 'invalid' }] }),
      }) as jest.Mock;

      await expect(
        (api as (...parameters: never[]) => Promise<unknown>)(
          ...(args as never[]),
        ),
      ).rejects.toThrow(message);
    },
  );

  it('uses the response status when create returns a non-JSON error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => {
        throw new Error('not json');
      },
    }) as jest.Mock;

    await expect(
      createFieldCrop({ field_id: 7, crop_id: 3, status: 'planted' }, 'token'),
    ).rejects.toThrow('Error afegint el cultiu (409)');
  });

  it('uses a fallback message when delete error body is not JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error('not json');
      },
    }) as jest.Mock;

    await expect(deleteFieldCrop(15, 'token')).rejects.toThrow(
      'Error eliminant el cultiu del camp',
    );
  });

  it.each([
    [getFieldCrops, [0, 10, 'token'], 'Field crop list unavailable'],
    [getFieldCropsCount, ['token'], 'Field crop count unavailable'],
    [getFieldCropById, [15, 'token'], 'Field crop unavailable'],
    [
      createFieldCrop,
      [{ field_id: 7, crop_id: 3, status: 'planted' }, 'token'],
      'Field crop create unavailable',
    ],
    [
      updateFieldCrop,
      [15, { status: 'planted' }, 'token'],
      'Field crop update unavailable',
    ],
    [deleteFieldCrop, [15, 'token'], 'Field crop delete unavailable'],
  ])(
    'uses a server error detail for each operation',
    async (api, args, detail) => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail }),
      }) as jest.Mock;
      await expect(
        (api as (...parameters: never[]) => Promise<unknown>)(
          ...(args as never[]),
        ),
      ).rejects.toThrow(detail);
    },
  );

  it('requires the public API URL at module initialization', () => {
    const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    try {
      expect(() =>
        jest.isolateModules(() => require('@/services/api_fieldCrops')),
      ).toThrow('EXPO_PUBLIC_API_URL is not defined');
    } finally {
      if (configuredUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
      else process.env.EXPO_PUBLIC_API_URL = configuredUrl;
    }
  });
});
