import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import HomeScreen from '../../../src/app/app/home';
import { useCurrentField } from '../../../src/hooks/use-current-field';
import { useFieldWeather } from '../../../src/hooks/use-field-weather';

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
const retry = jest.fn();

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseCurrentField.mockReturnValue({ id: 2, name: 'Tremp' });
    mockedUseFieldWeather.mockReturnValue({
      state: { status: 'ready', weather: {} as never },
      retry,
    });
  });

  it('shows the home title', () => {
    render(<HomeScreen />);

    expect(screen.getByTestId('home-screen')).toBeTruthy();
    expect(screen.getByText(/El teu hort/)).toBeTruthy();
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
});
