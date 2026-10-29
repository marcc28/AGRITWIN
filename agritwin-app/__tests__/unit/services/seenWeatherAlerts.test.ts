import type * as SeenWeatherAlerts from '../../../src/services/seenWeatherAlerts';

const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
}));

const KEY = 'agritwin_seen_weather_alerts';

function loadService() {
  let service = {} as typeof SeenWeatherAlerts;
  jest.isolateModules(() => {
    service = jest.requireActual<typeof SeenWeatherAlerts>(
      '../../../src/services/seenWeatherAlerts',
    );
  });
  return service;
}

describe('seenWeatherAlerts', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('saves the seen alerts on the device', async () => {
    const service = loadService();

    await service.markAlertSeen('1:rain:2026-10-30');

    expect(JSON.parse(mockStore.get(KEY) ?? '[]')).toEqual([
      '1:rain:2026-10-30',
    ]);
    await expect(loadService().getSeenAlerts()).resolves.toEqual([
      '1:rain:2026-10-30',
    ]);
  });

  it('keeps only the last 20 alerts', async () => {
    const keys = Array.from({ length: 20 }, (_, index) => `alert-${index}`);
    mockStore.set(KEY, JSON.stringify(keys));

    const service = loadService();
    await service.markAlertSeen('new');

    const seen = await service.getSeenAlerts();
    expect(seen).toHaveLength(20);
    expect(seen[0]).toBe('alert-1');
    expect(seen[19]).toBe('new');
  });

  it('ignores data that cannot be read', async () => {
    mockStore.set(KEY, 'not json');

    await expect(loadService().getSeenAlerts()).resolves.toEqual([]);
  });
});
