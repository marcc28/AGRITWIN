import {
  createCrop,
  deleteCrop,
  getCropById,
  getCrops,
  getCropsCount,
  searchCrops,
  updateCrop,
  type Crop,
} from '@/services/api_crops';

const crop: Crop = {
  id: 3,
  name: 'Ordi',
  scientific_name: 'Hordeum vulgare',
  category: 'cereal',
};

describe('crops api', () => {
  const originalFetch = global.fetch;

  beforeEach(() => jest.clearAllMocks());
  afterAll(() => {
    global.fetch = originalFetch;
  });

  function respond(body: unknown, ok = true) {
    global.fetch = jest.fn().mockResolvedValue({
      ok,
      json: async () => body,
    }) as jest.Mock;
  }

  it('gets a paginated crop list', async () => {
    respond([crop]);
    await expect(getCrops(5, 10, 'tok')).resolves.toEqual([crop]);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/crops?offset=5&limit=10',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      }),
    );
  });

  it('gets a crop by an encoded id', async () => {
    respond(crop);
    await expect(getCropById('3/x', 'tok')).resolves.toEqual(crop);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/crops/3%2Fx',
      expect.anything(),
    );
  });

  it('searches with an encoded name', async () => {
    respond([crop]);
    await expect(searchCrops('ordi blat', 'tok')).resolves.toEqual([crop]);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/crops/search?name=ordi%20blat',
      expect.anything(),
    );
  });

  it('returns the total crop count', async () => {
    respond({ total: 6 });
    await expect(getCropsCount('tok')).resolves.toBe(6);
  });

  it('creates a crop with JSON headers', async () => {
    respond(crop);
    const payload = {
      name: crop.name,
      scientific_name: crop.scientific_name,
      category: crop.category,
    };
    await expect(createCrop(payload, 'tok')).resolves.toEqual(crop);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/crops',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('updates a crop with an encoded id', async () => {
    respond(crop);
    const payload = { category: 'grain' };
    await expect(updateCrop('3/x', payload, 'tok')).resolves.toEqual(crop);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/crops/3%2Fx',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    );
  });

  it('deletes a crop', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
    await expect(deleteCrop(3, 'tok')).resolves.toBeUndefined();
  });

  it.each([
    [getCrops, [0, 10, 'tok'], 'Error obtenint els cultius'],
    [getCropById, [3, 'tok'], 'No s’ha pogut carregar el cultiu'],
    [searchCrops, ['ordi', 'tok'], 'Error cercant cultius'],
    [getCropsCount, ['tok'], 'Error obtenint el nombre total de cultius'],
    [
      createCrop,
      [{ name: 'Ordi', scientific_name: 'Hordeum', category: 'cereal' }, 'tok'],
      'Error creant el cultiu',
    ],
    [
      updateCrop,
      [3, { category: 'grain' }, 'tok'],
      'Error actualitzant el cultiu',
    ],
  ])(
    'uses the fallback error for malformed response details',
    async (api, args, message) => {
      respond({ detail: { message: 'bad request' } }, false);
      await expect(
        (api as (...parameters: never[]) => Promise<unknown>)(
          ...(args as never[]),
        ),
      ).rejects.toThrow(message);
    },
  );

  it('uses an API error detail when it is a string', async () => {
    respond({ detail: 'Not allowed' }, false);
    await expect(getCrops(0, 10, 'tok')).rejects.toThrow('Not allowed');
  });

  it.each([
    [getCropById, [3, 'tok'], 'Missing crop'],
    [searchCrops, ['ordi', 'tok'], 'Search unavailable'],
    [getCropsCount, ['tok'], 'Count unavailable'],
    [
      createCrop,
      [{ name: 'Ordi', scientific_name: 'Hordeum', category: 'cereal' }, 'tok'],
      'Create unavailable',
    ],
    [updateCrop, [3, { category: 'grain' }, 'tok'], 'Update unavailable'],
  ])(
    'uses a string error detail from each endpoint',
    async (api, args, message) => {
      respond({ detail: message }, false);
      await expect(
        (api as (...parameters: never[]) => Promise<unknown>)(
          ...(args as never[]),
        ),
      ).rejects.toThrow(message);
    },
  );

  it('uses a fallback delete error for invalid JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error('bad json');
      },
    }) as jest.Mock;
    await expect(deleteCrop(3, 'tok')).rejects.toThrow(
      'Error eliminant el cultiu',
    );
  });

  it('uses a delete error detail when available', async () => {
    respond({ detail: 'Crop is in use' }, false);
    await expect(deleteCrop(3, 'tok')).rejects.toThrow('Crop is in use');
  });

  it('requires the public API URL at module initialization', () => {
    const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    try {
      expect(() =>
        jest.isolateModules(() => require('@/services/api_crops')),
      ).toThrow('EXPO_PUBLIC_API_URL is not defined');
    } finally {
      process.env.EXPO_PUBLIC_API_URL = configuredUrl;
    }
  });
});
