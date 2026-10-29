import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useWeatherAlertsEnabled } from '../../../src/hooks/use-weather-alerts-enabled';
import { getMe, subscribeMe, type Me } from '../../../src/services/api';

jest.mock('../../../src/services/api', () => ({
  getMe: jest.fn(),
  subscribeMe: jest.fn(() => () => undefined),
}));

const mockedGetMe = getMe as jest.MockedFunction<typeof getMe>;
const mockedSubscribeMe = subscribeMe as jest.MockedFunction<
  typeof subscribeMe
>;

function profile(enabled: boolean) {
  return { weather_alerts_enabled: enabled } as Me;
}

describe('useWeatherAlertsEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the option of the profile', async () => {
    mockedGetMe.mockResolvedValue(profile(false));

    const { result } = renderHook(() => useWeatherAlertsEnabled());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('changes when the profile is saved', async () => {
    mockedGetMe.mockRejectedValue(new Error('Not authenticated'));

    const { result } = renderHook(() => useWeatherAlertsEnabled());
    const listener = mockedSubscribeMe.mock.calls[0][0];

    expect(result.current).toBe(true);
    act(() => {
      listener(profile(false));
    });
    expect(result.current).toBe(false);
  });
});
