import { render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import RootLayout from '../../../src/app/_layout';
import { isAuthError } from '../../../src/services/api';
import { clearAuth, getAuth } from '../../../src/services/auth';
import { getCurrentField } from '../../../src/services/currentField';
import {
  getCachedGardenPickerFields,
  loadGardenPickerFields,
} from '../../../src/services/gardenPicker';
import { preloadAppData } from '../../../src/services/queries';

const mockSegments = jest.fn(() => ['auth', 'login']);

jest.mock('expo-router', () => ({
  Stack: () => null,
  router: { replace: jest.fn() },
  useSegments: () => mockSegments(),
}));

jest.mock('../../../i18n', () => ({}));

jest.mock('../../../src/services/api', () => ({
  isAuthError: jest.fn(() => false),
}));

jest.mock('../../../src/services/auth', () => ({
  clearAuth: jest.fn(),
  getAuth: jest.fn(),
}));

jest.mock('../../../src/components/AgritwinLoadingScreen', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ label }: { label: string }) => <Text>{label}</Text>,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('i18next', () => ({ language: 'it' }));

jest.mock('../../../src/services/currentField', () => ({
  getCurrentField: jest.fn(),
}));

jest.mock('../../../src/services/queries', () => ({
  preloadAppData: jest.fn(),
}));

jest.mock('../../../src/services/gardenPicker', () => ({
  getCachedGardenPickerFields: jest.fn(),
  loadGardenPickerFields: jest.fn(),
}));

const mockedGetAuth = getAuth as jest.Mock;
const mockedCached = getCachedGardenPickerFields as jest.Mock;
const mockedLoad = loadGardenPickerFields as jest.Mock;

describe('RootLayout start-up', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSegments.mockReturnValue(['auth', 'login']);
    mockedGetAuth.mockResolvedValue({ token: 't', username: 'anna' });
    (getCurrentField as jest.Mock).mockResolvedValue(null);
    (preloadAppData as jest.Mock).mockResolvedValue(undefined);
    (isAuthError as jest.Mock).mockReturnValue(false);
  });

  it('opens the gardens at once with the list saved last time', async () => {
    mockedCached.mockResolvedValue([{ id: 1 }]);
    mockedLoad.mockReturnValue(new Promise(() => undefined));

    render(<RootLayout />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/field-selection');
    });
    // The fresh list is still asked, in the background.
    expect(mockedLoad).toHaveBeenCalled();
  });

  it('opens the garden form when the saved list is empty', async () => {
    mockedCached.mockResolvedValue([]);
    mockedLoad.mockResolvedValue([]);

    render(<RootLayout />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/create-field');
    });
  });

  it('logs out when the background refresh says the session expired', async () => {
    mockedCached.mockResolvedValue([{ id: 1 }]);
    mockedLoad.mockRejectedValue(new Error('Not authenticated'));
    (isAuthError as jest.Mock).mockReturnValue(true);

    render(<RootLayout />);

    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenLastCalledWith('/auth/login');
    });
  });

  it('loads everything behind one loading screen the first time', async () => {
    mockedCached.mockResolvedValue(null);
    mockedLoad.mockResolvedValue([{ id: 1 }]);
    (getCurrentField as jest.Mock).mockResolvedValue({ id: 4, name: 'Hort' });
    let finish: () => void = () => undefined;
    (preloadAppData as jest.Mock).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );

    render(<RootLayout />);

    await waitFor(() => {
      expect(preloadAppData).toHaveBeenCalledWith(4, 'it');
    });
    expect(screen.getByText('startup.loading')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();

    finish();

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/field-selection');
      expect(screen.queryByText('startup.loading')).toBeNull();
    });
    expect(mockedLoad).toHaveBeenCalledTimes(1);
  });

  it('opens the gardens even if the first load fails', async () => {
    mockedCached.mockResolvedValue(null);
    mockedLoad.mockRejectedValue(new Error('offline'));

    render(<RootLayout />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/field-selection');
      expect(screen.queryByText('startup.loading')).toBeNull();
    });
  });

  it('logs out when the first load says the session expired', async () => {
    mockedCached.mockResolvedValue(null);
    mockedLoad.mockRejectedValue(new Error('Not authenticated'));
    (isAuthError as jest.Mock).mockReturnValue(true);

    render(<RootLayout />);

    await waitFor(() => {
      expect(clearAuth).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('asks the gardens again in other pages of the app', async () => {
    mockSegments.mockReturnValue(['app', 'home']);
    mockedLoad.mockResolvedValue([]);

    render(<RootLayout />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/create-field');
    });
  });

  it('sends a visitor without a session to the login', async () => {
    mockSegments.mockReturnValue(['app', 'home']);
    mockedGetAuth.mockResolvedValue(null);

    render(<RootLayout />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/auth/login');
      expect(screen.queryByText('startup.loading')).toBeNull();
    });
  });
});
