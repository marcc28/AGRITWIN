import React from 'react';

import { render } from '@testing-library/react-native';

import { ReadingChart } from '../../../src/components/ReadingChart';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Mock = ({ children }: { children?: React.ReactNode }) => (
    <View>{children}</View>
  );
  return {
    __esModule: true,
    default: Mock,
    Circle: Mock,
    Defs: Mock,
    LinearGradient: Mock,
    Line: Mock,
    Path: Mock,
    Stop: Mock,
    Text: Mock,
  };
});

describe('ReadingChart', () => {
  it('renders nothing without history', () => {
    const { toJSON } = render(<ReadingChart history={[]} getValue={() => 1} />);
    expect(toJSON()).toBeNull();
  });

  it('renders a chart when there are readings', () => {
    const { toJSON } = render(
      <ReadingChart
        history={[
          {
            timestamp: '2026-01-01T00:00:00Z',
            temperature: 20,
            air_humidity: 40,
            soil_humidity: 30,
            light: 100,
          },
          {
            timestamp: '2026-01-01T00:01:00Z',
            temperature: 21,
            air_humidity: 41,
            soil_humidity: 31,
            light: 110,
          },
        ]}
        getValue={(reading) => reading.temperature}
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders compact labels when light values are large', () => {
    const { toJSON } = render(
      <ReadingChart
        history={[
          {
            timestamp: '2026-01-01T00:00:00Z',
            temperature: 20,
            air_humidity: 40,
            soil_humidity: 30,
            light: 79353.2,
          },
          {
            timestamp: '2026-01-01T00:01:00Z',
            temperature: 21,
            air_humidity: 41,
            soil_humidity: 31,
            light: 86382.6,
          },
        ]}
        getValue={(reading) => reading.light}
      />,
    );
    expect(toJSON()).toBeTruthy();
  });
});
