import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { SensorModal } from '../../../src/components/SensorModal';

const dashboard = {
  field_name: 'Hort',
  device_ids: ['dev-1'],
  latest: {
    timestamp: '2026-01-01T00:00:00Z',
    temperature: 20,
    air_humidity: 40,
    soil_humidity: 20,
    light: 100,
  },
  history: [
    {
      timestamp: '2026-01-01T00:00:00Z',
      temperature: 20,
      air_humidity: 40,
      soil_humidity: 20,
      light: 100,
    },
  ],
};

describe('SensorModal', () => {
  it('shows dry soil as a screen', () => {
    render(
      <SensorModal
        visible
        asScreen
        dashboard={dashboard}
        latest={dashboard.latest}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Hort')).toBeTruthy();
    expect(screen.getByText('El sòl està sec')).toBeTruthy();
  });

  it('closes the overlay modal', () => {
    const onClose = jest.fn();
    render(
      <SensorModal
        visible
        dashboard={{
          ...dashboard,
          device_ids: ['dev-1', 'dev-2'],
          latest: { ...dashboard.latest, soil_humidity: 50 },
        }}
        latest={{ ...dashboard.latest, soil_humidity: 50 }}
        onClose={onClose}
      />,
    );
    fireEvent.press(screen.getByText('close'));
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByText('Humitat del sòl correcta')).toBeTruthy();
  });
});
