import React from 'react';
import { Linking, Platform } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import DiagnosisScreen from '../../../src/app/app/diagnosis';
import {
  diagnosePlant,
  DiagnosisError,
  type PlantDiagnosis,
} from '../../../src/services/api_diagnosis';
import { clearAuth } from '../../../src/services/auth';
import { choosePhoto } from '../../../src/services/photoPicker';

const mockRouter = { replace: jest.fn() };

jest.mock('react-i18next', () => {
  const translation = {
    t: (key: string, options?: { value?: number }) =>
      options?.value != null ? `${key}:${options.value}` : key,
    i18n: { language: 'es-ES' },
  };
  return { useTranslation: () => translation };
});

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    get router() {
      return mockRouter;
    },
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});

jest.mock('../../../src/services/photoPicker', () => ({
  choosePhoto: jest.fn(),
}));

jest.mock('../../../src/services/api_diagnosis', () => ({
  ...jest.requireActual('../../../src/services/api_diagnosis'),
  diagnosePlant: jest.fn(),
}));

jest.mock('../../../src/services/auth', () => ({
  clearAuth: jest.fn(),
}));

const mockedChoose = choosePhoto as jest.MockedFunction<typeof choosePhoto>;
const mockedDiagnose = diagnosePlant as jest.MockedFunction<
  typeof diagnosePlant
>;

const photo = { uri: 'file:///plant.jpg', mimeType: 'image/jpeg' };

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

async function renderWithPhoto() {
  mockedChoose.mockResolvedValueOnce(photo);
  render(<DiagnosisScreen />);
  await screen.findByTestId('diagnosis-preview');
}

describe('DiagnosisScreen', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedChoose.mockResolvedValue(null);
    jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
  });

  it('opens the gallery when the screen opens on mobile', async () => {
    render(<DiagnosisScreen />);

    await waitFor(() => expect(mockedChoose).toHaveBeenCalledWith(false));
    expect(screen.getByText('diagnosis.title')).toBeTruthy();
  });

  it('does not open the gallery by itself on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });

    render(<DiagnosisScreen />);

    expect(await screen.findByText('diagnosis.placeholder')).toBeTruthy();
    expect(mockedChoose).not.toHaveBeenCalled();
  });

  it('asks to try again when the camera permission is denied', async () => {
    render(<DiagnosisScreen />);
    await screen.findByText('diagnosis.placeholder');

    mockedChoose.mockResolvedValueOnce('denied');
    fireEvent.press(screen.getByText('diagnosis.takePhoto'));

    expect(
      await screen.findByText('diagnosis.errors.cameraDenied'),
    ).toBeTruthy();
    expect(mockedChoose).toHaveBeenLastCalledWith(true);
    expect(screen.queryByTestId('diagnosis-open-settings')).toBeNull();
  });

  it('opens the phone settings when the camera permission is blocked', async () => {
    render(<DiagnosisScreen />);
    await screen.findByText('diagnosis.placeholder');

    mockedChoose.mockResolvedValueOnce('blocked');
    fireEvent.press(screen.getByText('diagnosis.takePhoto'));

    expect(
      await screen.findByText('diagnosis.errors.cameraBlocked'),
    ).toBeTruthy();
    fireEvent.press(screen.getByTestId('diagnosis-open-settings'));
    expect(Linking.openSettings).toHaveBeenCalled();
  });

  it('does not show the settings button on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    render(<DiagnosisScreen />);

    mockedChoose.mockResolvedValueOnce('blocked');
    fireEvent.press(screen.getByText('diagnosis.takePhoto'));

    expect(
      await screen.findByText('diagnosis.errors.cameraBlocked'),
    ).toBeTruthy();
    expect(screen.queryByTestId('diagnosis-open-settings')).toBeNull();
  });

  it('hides the permission message after a photo is chosen', async () => {
    mockedChoose.mockResolvedValueOnce('blocked');
    render(<DiagnosisScreen />);
    await screen.findByText('diagnosis.errors.photosBlocked');

    mockedChoose.mockResolvedValueOnce(photo);
    fireEvent.press(screen.getByText('diagnosis.choosePhoto'));

    expect(await screen.findByTestId('diagnosis-preview')).toBeTruthy();
    expect(screen.queryByText('diagnosis.errors.photosBlocked')).toBeNull();
    expect(screen.queryByTestId('diagnosis-open-settings')).toBeNull();
  });

  it('analyses the photo and shows the result', async () => {
    mockedDiagnose.mockResolvedValue(diagnosis);
    await renderWithPhoto();

    fireEvent.press(screen.getByText('diagnosis.analyse'));

    expect(await screen.findByText('Míldiu')).toBeTruthy();
    expect(mockedDiagnose).toHaveBeenCalledWith(photo, 'es');
    expect(screen.getByText('diagnosis.problem')).toBeTruthy();
    expect(screen.getByText('diagnosis.confidence:82')).toBeTruthy();
    expect(screen.getByText('Retira les fulles afectades.')).toBeTruthy();
    expect(screen.getByText('diagnosis.water.excess')).toBeTruthy();
    expect(screen.getByText('diagnosis.light.ok')).toBeTruthy();
    expect(screen.getByText('diagnosis.harvest.no_fruit')).toBeTruthy();
  });

  it.each([
    [422, 'diagnosis.errors.noPlant'],
    [503, 'diagnosis.errors.unavailable'],
  ])('shows the message for an api error %i', async (status, key) => {
    mockedDiagnose.mockRejectedValue(new DiagnosisError('error', status));
    await renderWithPhoto();

    fireEvent.press(screen.getByText('diagnosis.analyse'));

    expect(await screen.findByText(key)).toBeTruthy();
    expect(screen.getByText('diagnosis.retry')).toBeTruthy();
  });

  it('logs out and goes to login when the session has expired', async () => {
    mockedDiagnose.mockRejectedValue(new Error('Not authenticated'));
    await renderWithPhoto();

    fireEvent.press(screen.getByText('diagnosis.analyse'));

    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith('/auth/login'),
    );
    expect(clearAuth).toHaveBeenCalled();
  });

  it('opens the photo in full screen and closes it', async () => {
    await renderWithPhoto();

    fireEvent.press(screen.getByTestId('diagnosis-open-photo'));
    expect(screen.getByTestId('diagnosis-viewer')).toBeTruthy();

    fireEvent.press(screen.getByTestId('diagnosis-viewer-close'));
    await waitFor(() =>
      expect(screen.queryByTestId('diagnosis-viewer')).toBeNull(),
    );
  });
});
