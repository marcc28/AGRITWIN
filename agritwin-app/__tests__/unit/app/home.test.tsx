import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import HomeScreen from '../../../src/app/app/home';
import { useCurrentField } from '../../../src/hooks/use-current-field';
import { useFieldWeather } from '../../../src/hooks/use-field-weather';
import { useWeatherAlertsEnabled } from '../../../src/hooks/use-weather-alerts-enabled';
import type { FieldWeather } from '../../../src/services/api';
import { markAlertSeen } from '../../../src/services/seenWeatherAlerts';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ca' },
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('../../../src/hooks/use-current-field', () => ({
  useCurrentField: jest.fn(),
}));

jest.mock('../../../src/hooks/use-field-weather', () => ({
  useFieldWeather: jest.fn(),
}));

jest.mock('../../../src/hooks/use-weather-alerts-enabled', () => ({
  useWeatherAlertsEnabled: jest.fn(),
}));

jest.mock('../../../src/services/seenWeatherAlerts', () => ({
  getSeenAlerts: jest.fn(async () => []),
  markAlertSeen: jest.fn(async () => undefined),
}));

jest.mock('../../../src/components/WeatherCard', () => ({
  WeatherCard: ({
    state,
    onPress,
    onRetry,
  }: {
    state: { status: string };
    onPress: () => void;
    onRetry: () => void;
  }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return (
      <>
        <Pressable testID="card" onPress={onPress}>
          <Text>{`card-${state.status}`}</Text>
        </Pressable>
        <Pressable testID="card-retry" onPress={onRetry} />
      </>
    );
  },
}));

const mockedUseCurrentField = useCurrentField as jest.MockedFunction<
  typeof useCurrentField
>;
const mockedUseFieldWeather = useFieldWeather as jest.MockedFunction<
  typeof useFieldWeather
>;
const mockedUseWeatherAlertsEnabled =
  useWeatherAlertsEnabled as jest.MockedFunction<
    typeof useWeatherAlertsEnabled
  >;
const retry = jest.fn();

function alert(type: string, message: string) {
  return {
    type,
    message,
    starts_at: null,
    day: '2099-10-29',
    rain_probability: null,
    rain_mm: null,
    temperature: null,
    wind_speed: null,
  };
}

const withAlerts = {
  current_alerts: [alert('wind', 'Ara hi ha vent fort (55 km/h)')],
  alerts: [alert('rain', 'Es preveu pluja el 30/10 (80%)')],
} as unknown as FieldWeather;

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseWeatherAlertsEnabled.mockReturnValue(true);
    mockedUseCurrentField.mockReturnValue({ id: 2, name: 'Tremp' });
    mockedUseFieldWeather.mockReturnValue({
      state: { status: 'ready', weather: {} as never },
      retry,
    });
  });

  it('shows the home title', () => {
    render(<HomeScreen />);

    expect(screen.getByTestId('home-screen')).toBeTruthy();
    expect(screen.getByText('home.title')).toBeTruthy();
  });

  it('shows the weather of the chosen field', () => {
    render(<HomeScreen />);

    expect(mockedUseFieldWeather).toHaveBeenCalledWith(2, 'ca');
    expect(screen.getByText('card-ready')).toBeTruthy();
  });

  it('waits while the chosen field is read', () => {
    mockedUseCurrentField.mockReturnValue(undefined);
    mockedUseFieldWeather.mockReturnValue({
      state: { status: 'no-field' },
      retry,
    });

    render(<HomeScreen />);

    expect(mockedUseFieldWeather).toHaveBeenCalledWith(null, 'ca');
    expect(screen.getByText('card-loading')).toBeTruthy();
  });

  it('has no field when the user has none', () => {
    mockedUseCurrentField.mockReturnValue(null);
    mockedUseFieldWeather.mockReturnValue({
      state: { status: 'no-field' },
      retry,
    });

    render(<HomeScreen />);

    expect(screen.getByText('card-no-field')).toBeTruthy();
    fireEvent.press(screen.getByTestId('card'));

    expect(router.push).not.toHaveBeenCalled();
  });

  it('opens the weather screen of the field', () => {
    render(<HomeScreen />);

    fireEvent.press(screen.getByTestId('card'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/weather',
      params: { id: '2' },
    });
  });

  it('retries the weather', () => {
    render(<HomeScreen />);

    fireEvent.press(screen.getByTestId('card-retry'));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows the weather alerts one by one', async () => {
    mockedUseFieldWeather.mockReturnValue({
      state: { status: 'ready', weather: withAlerts },
      retry,
    });

    render(<HomeScreen />);

    expect(
      await screen.findByText('Ara hi ha vent fort (55 km/h)'),
    ).toBeTruthy();
    fireEvent.press(screen.getByTestId('weather-alert-close'));
    expect(screen.getByText('Es preveu pluja el 30/10 (80%)')).toBeTruthy();
    expect(markAlertSeen).toHaveBeenCalledWith('2:now:wind:2099-10-29');

    fireEvent.press(screen.getByTestId('weather-alert-banner'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/weather',
      params: { id: '2' },
    });
    expect(screen.queryByTestId('weather-alert-banner')).toBeNull();
  });

  it('does not show the weather alerts when they are turned off', async () => {
    mockedUseWeatherAlertsEnabled.mockReturnValue(false);
    mockedUseFieldWeather.mockReturnValue({
      state: { status: 'ready', weather: withAlerts },
      retry,
    });

    render(<HomeScreen />);

    expect(await screen.findByText('card-ready')).toBeTruthy();
    expect(screen.queryByTestId('weather-alert-banner')).toBeNull();
  });
});
