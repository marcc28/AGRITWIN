import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  WeatherAlertBanner,
  WeatherAlertList,
} from '../../../src/components/WeatherAlerts';
import type { FieldWeather, WeatherAlert } from '../../../src/services/api';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function alert(type: string, message: string, day: string): WeatherAlert {
  return {
    type,
    message,
    starts_at: null,
    day,
    rain_probability: null,
    rain_mm: null,
    temperature: null,
    wind_speed: null,
  };
}

const wind = alert('wind', 'Ara hi ha vent fort (55 km/h)', '2099-10-29');
const hail = alert('hail', 'Es preveu calamarsa el 30/10 (95%)', '2099-10-30');

describe('WeatherAlertList', () => {
  it('shows what is happening now and then the forecast', () => {
    render(
      <WeatherAlertList
        weather={
          { current_alerts: [wind], alerts: [hail] } as unknown as FieldWeather
        }
      />,
    );

    expect(screen.getByTestId('weather-alert-now-wind')).toBeTruthy();
    expect(screen.getByTestId('weather-alert-expected-hail')).toBeTruthy();
    expect(screen.getByText(hail.message)).toBeTruthy();
    expect(screen.queryByTestId('weather-no-alerts')).toBeNull();
  });

  it('shows a message when there are no alerts', () => {
    render(<WeatherAlertList weather={{} as FieldWeather} />);

    expect(screen.getByTestId('weather-no-alerts')).toBeTruthy();
    expect(screen.getByText('weather.noAlerts')).toBeTruthy();
  });
});

describe('WeatherAlertBanner', () => {
  it('opens or closes the notification', () => {
    const onOpen = jest.fn();
    const onClose = jest.fn();

    render(
      <WeatherAlertBanner
        alert={hail}
        now={false}
        position={2}
        total={3}
        onOpen={onOpen}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('weather.alertsTitle · 2/3')).toBeTruthy();
    fireEvent.press(screen.getByTestId('weather-alert-banner'));
    fireEvent.press(screen.getByTestId('weather-alert-close'));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
