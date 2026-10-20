import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import HomeScreen from '../../../src/app/app/home';
import { getDashboard } from '../../../src/services/api';

jest.mock('../../../src/services/api', () => ({
  getDashboard: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native-gifted-charts', () => ({
  LineChart: () => null,
}));

const mockedGetDashboard = getDashboard as jest.MockedFunction<
  typeof getDashboard
>;

const sampleDashboard = {
  field_name: "Hort de l'Ainhoa",
  device_ids: ['esp32_sim_03'],
  latest: {
    timestamp: '2026-10-16T16:19:00',
    temperature: 25.9,
    air_humidity: 50,
    soil_humidity: 30,
    light: 83435,
  },
  history: [
    {
      timestamp: '2026-10-16T16:19:00',
      temperature: 25.9,
      air_humidity: 50,
      soil_humidity: 30,
      light: 83435,
    },
  ],
};

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the home title', async () => {
    mockedGetDashboard.mockResolvedValue(sampleDashboard);

    render(<HomeScreen />);

    expect(screen.getByTestId('home-screen')).toBeTruthy();
    expect(screen.getByText(/El teu hort/)).toBeTruthy();
    await waitFor(() => {
      expect(mockedGetDashboard).toHaveBeenCalled();
    });
  });

  it('shows the field card when the dashboard loads', async () => {
    mockedGetDashboard.mockResolvedValue(sampleDashboard);

    render(<HomeScreen />);

    expect(await screen.findByText("Hort de l'Ainhoa")).toBeTruthy();
    expect(screen.getByText('25,9')).toBeTruthy();
  });

  it('shows an empty message when the user has no field', async () => {
    mockedGetDashboard.mockResolvedValue({
      field_name: null,
      device_ids: [],
      latest: null,
      history: [],
    });

    render(<HomeScreen />);

    expect(await screen.findByText('Encara no tens cap camp.')).toBeTruthy();
  });

  it('shows the API error on the card', async () => {
    mockedGetDashboard.mockRejectedValue(new Error('Load failed'));

    render(<HomeScreen />);

    expect(await screen.findByText('Load failed')).toBeTruthy();
  });

  it('opens the popup when the card is pressed', async () => {
    mockedGetDashboard.mockResolvedValue(sampleDashboard);

    render(<HomeScreen />);

    fireEvent.press(await screen.findByText("Hort de l'Ainhoa"));

    expect(await screen.findByText('Evolució')).toBeTruthy();
  });
});
