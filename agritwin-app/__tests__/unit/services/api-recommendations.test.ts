import {
  getFieldRecommendations,
  type Recommendation,
} from '@/services/api_recommendations';

const item = (fieldId: number): Recommendation =>
  ({
    id: `rec-${fieldId}`,
    field_id: fieldId,
    category: 'irrigation',
    title: 'Revisa el reg',
    description: 'Humitat baixa',
    severity: 'medium',
    model: 'test-model',
    generated_at: '2026-05-01T10:00:00Z',
    expires_at: '2026-05-08T10:00:00Z',
  }) as Recommendation;

describe('field recommendations api', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('requests recommendations with bearer auth and filters other fields', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [item(7), item(8)],
    }) as jest.Mock;

    await expect(
      getFieldRecommendations('7/unsafe', 'token-123'),
    ).resolves.toEqual([]);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/fields/7%2Funsafe/recommendations',
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer token-123',
        },
      },
    );
  });

  it('returns only items that belong to the requested field', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [item(7), item(8)],
    }) as jest.Mock;

    await expect(getFieldRecommendations(7, 'token')).resolves.toEqual([
      item(7),
    ]);
  });

  it('throws the API detail for an unsuccessful response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Field not found' }),
    }) as jest.Mock;

    await expect(getFieldRecommendations(7, 'token')).rejects.toThrow(
      'Field not found',
    );
  });

  it('uses a fallback error when the API error detail is not text', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: [{ msg: 'bad request' }] }),
    }) as jest.Mock;

    await expect(getFieldRecommendations(7, 'token')).rejects.toThrow(
      'Error obtenint les recomanacions del camp',
    );
  });

  it('rejects malformed successful responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: [] }),
    }) as jest.Mock;

    await expect(getFieldRecommendations(7, 'token')).rejects.toThrow(
      'La resposta de les recomanacions no és vàlida',
    );
  });
});
