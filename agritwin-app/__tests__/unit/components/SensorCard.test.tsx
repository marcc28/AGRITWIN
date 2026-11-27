import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { SensorCard } from '../../../src/components/SensorCard';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const dashboard = {
  field_name: 'Hort',
  device_ids: ['dev-1'],
  latest: {
    timestamp: '2026-01-01T00:00:00Z',
    temperature: 20,
    air_humidity: 40,
    soil_humidity: 30,
    light: 100,
  },
  history: [],
};

describe('SensorCard', () => {
  it('shows a loading state', () => {
    render(<SensorCard dashboard={null} errorMessage="" onPress={jest.fn()} />);
    expect(screen.toJSON()).toBeTruthy();
  });

  it('shows an error', () => {
    render(
      <SensorCard
        dashboard={null}
        errorMessage="boom"
        onPress={jest.fn()}
        title="Dades"
      />,
    );
    expect(screen.getByText('boom')).toBeTruthy();
  });

  it('shows an empty field', () => {
    render(
      <SensorCard
        dashboard={{
          field_name: null,
          device_ids: [],
          latest: null,
          history: [],
        }}
        errorMessage=""
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('Encara no tens cap camp.')).toBeTruthy();
  });

  it('shows no devices', () => {
    render(
      <SensorCard
        dashboard={{
          field_name: 'Hort',
          device_ids: [],
          latest: null,
          history: [],
        }}
        errorMessage=""
        onPress={jest.fn()}
        title="Dades"
      />,
    );
    expect(
      screen.getByText('Aquest camp encara no té cap dispositiu.'),
    ).toBeTruthy();
  });

  it('shows no reading', () => {
    render(
      <SensorCard
        dashboard={{
          field_name: 'Hort',
          device_ids: ['dev-1'],
          latest: null,
          history: [],
        }}
        errorMessage=""
        onPress={jest.fn()}
        title="Dades"
      />,
    );
    expect(screen.getByText('Encara no hi ha cap lectura.')).toBeTruthy();
  });

  it('opens the data screen when there is a reading', () => {
    const onPress = jest.fn();
    render(
      <SensorCard
        dashboard={dashboard}
        errorMessage=""
        onPress={onPress}
        title="Dades"
        subtitle="Sub"
        hint="Hint"
      />,
    );
    fireEvent.press(screen.getByText('Dades'));
    expect(onPress).toHaveBeenCalled();
  });

  it('shows the simulated data notice', () => {
    render(
      <SensorCard
        dashboard={{
          ...dashboard,
          device_ids: ['sim-field-3'],
          simulated: true,
        }}
        errorMessage=""
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByTestId('sensor-simulated')).toBeTruthy();
    expect(screen.getByText('simulatedData.badge')).toBeTruthy();
    expect(screen.getByText('simulatedData.sensorHint')).toBeTruthy();
  });

  it('hides the notice with real data', () => {
    render(
      <SensorCard
        dashboard={{ ...dashboard, simulated: false }}
        errorMessage=""
        onPress={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('sensor-simulated')).toBeNull();
  });
});
