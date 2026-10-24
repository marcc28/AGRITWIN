import React from 'react';

import { render, screen } from '@testing-library/react-native';

import HomeScreen from '../../../src/app/app/home';

describe('HomeScreen', () => {
  it('shows the home title', () => {
    render(<HomeScreen />);

    expect(screen.getByTestId('home-screen')).toBeTruthy();
    expect(screen.getByText(/El teu hort/)).toBeTruthy();
  });
});
