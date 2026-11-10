import { getAuth } from '../../../src/services/auth';
import {
  diagnosePlant,
  DiagnosisError,
  type PlantDiagnosis,
} from '../../../src/services/api_diagnosis';

jest.mock('../../../src/services/auth', () => ({
  getAuth: jest.fn(),
}));

const mockedGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;

const diagnosis: PlantDiagnosis = {
  healthy: false,
  name: 'Míldiu',
  confidence: 0.82,
  advice: 'Retira les fulles afectades.',
  water: 'excess',
  light: 'ok',
  harvest: 'no_fruit',
  provider: 'plantnet',
};

const photo = { uri: 'file:///plant.jpg', mimeType: 'image/jpeg' };

function mockResponse(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  }) as jest.Mock;
}

describe('diagnosis api', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockResolvedValue({ token: 'token-123' } as never);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('sends the photo with bearer auth and the language', async () => {
    mockResponse(200, diagnosis);

    await expect(diagnosePlant(photo, 'ca')).resolves.toEqual(diagnosis);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/diagnosis?lang=ca');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer token-123');
    expect(options.body).toBeInstanceOf(FormData);
  });

  it('throws Not authenticated without a token', async () => {
    mockedGetAuth.mockResolvedValue(null as never);
    global.fetch = jest.fn() as jest.Mock;

    await expect(diagnosePlant(photo, 'ca')).rejects.toThrow(
      'Not authenticated',
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws Not authenticated when the api answers 401', async () => {
    mockResponse(401, { detail: 'Could not validate credentials' });

    await expect(diagnosePlant(photo, 'ca')).rejects.toThrow(
      'Not authenticated',
    );
  });

  it('throws a DiagnosisError with the status and detail of the api', async () => {
    mockResponse(422, { detail: 'No plant was found in the photo' });

    const error = await diagnosePlant(photo, 'ca').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DiagnosisError);
    expect(error).toMatchObject({
      status: 422,
      message: 'No plant was found in the photo',
    });
  });
});
