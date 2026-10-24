import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import WeatherScreen from '../../../src/app/weather';
import { useFieldWeather } from '../../../src/hooks/use-field-weather';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'es' },
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../../../src/hooks/use-field-weather', () => ({
  useFieldWeather: jest.fn(),
}));

jest.mock('../../../src/components/WeatherDetails', () => ({
  WeatherDetails: ({ weather }: { weather: { lang: string } }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return <Text>{`weather-details-${weather.lang}`}</Text>;
  },
}));

const mockedUseFieldWeather = useFieldWeather as jest.MockedFunction<
  typeof useFieldWeather
>;
const mockedParams = useLocalSearchParams as jest.Mock;
const retry = jest.fn();

describe('WeatherScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedParams.mockReturnValue({ id: '3' });
    mockedUseFieldWeather.mockReturnValue({
      state: { status: 'loading' },
      retry,
    });
  });

  it('loads the weather of the field in the url', () => {
    render(<WeatherScreen />);

    expect(screen.getByTestId('weather-screen')).toBeTruthy();
    expect(mockedUseFieldWeather).toHaveBeenCalledWith(3, 'es');
    expect(screen.getByText('weather.loading')).toBeTruthy();
  });

  it('has no field when the id is not valid', () => {
    mockedParams.mockReturnValue({ id: 'abc' });

    render(<WeatherScreen />);

    expect(mockedUseFieldWeather).toHaveBeenCalledWith(null, 'es');
  });

  it('shows the weather when it is ready', () => {
    mockedUseFieldWeather.mockReturnValue({
      state: {
        status: 'ready',
        weather: { lang: 'es' } as never,
      },
      retry,
    });

    render(<WeatherScreen />);

    expect(screen.getByText('weather-details-es')).toBeTruthy();
    expect(screen.queryByText('weather.loading')).toBeNull();
  });

  it.each([
    ['no-field', 'weather.noField'],
    ['no-location', 'weather.noLocation'],
    ['no-data', 'weather.noData'],
  ] as const)('shows the %s message', (status, message) => {
    mockedUseFieldWeather.mockReturnValue({ state: { status }, retry });

    render(<WeatherScreen />);

    expect(screen.getByTestId(`weather-${status}`)).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByTestId('weather-retry')).toBeNull();
  });

  it('retries after an error', () => {
    mockedUseFieldWeather.mockReturnValue({
      state: { status: 'error' },
      retry,
    });

    render(<WeatherScreen />);

    expect(screen.getByText('weather.error')).toBeTruthy();
    fireEvent.press(screen.getByTestId('weather-retry'));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('goes back to the home screen', () => {
    render(<WeatherScreen />);

    expect(screen.getByText('weather.back')).toBeTruthy();
    fireEvent.press(screen.getByTestId('weather-back'));

    expect(router.replace).toHaveBeenCalledWith('/app/home');
  });
});
