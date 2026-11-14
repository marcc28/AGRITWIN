import React from 'react';
import { Animated } from 'react-native';
import { render, cleanup } from '@testing-library/react-native';

import AgritwinLoadingScreen from '@/components/AgritwinLoadingScreen';

// Mock del gradient
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');

  return {
    LinearGradient: (props: any) => (
      <View {...props} testID="loading-gradient" />
    ),
  };
});

describe('AgritwinLoadingScreen', () => {
  let animationMocks: Array<{
    start: jest.Mock;
    stop: jest.Mock;
  }>;

  let loopSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    animationMocks = [];

    loopSpy = jest.spyOn(Animated, 'loop').mockImplementation(() => {
      const animation = {
        start: jest.fn(),
        stop: jest.fn(),
      };

      animationMocks.push(animation);

      return animation as any;
    });
  });

  afterEach(() => {
    cleanup();
    loopSpy.mockRestore();
  });

  it('renders the AgriTwin title', () => {
    const screen = render(<AgritwinLoadingScreen label="Carregant..." />);

    expect(screen.getByText('AgriTwin')).toBeTruthy();
  });

  it('renders the loading label', () => {
    const screen = render(
      <AgritwinLoadingScreen label="Preparant aplicació..." />,
    );

    expect(screen.getByText('Preparant aplicació...')).toBeTruthy();
  });

  it('updates the displayed label when the prop changes', () => {
    const screen = render(<AgritwinLoadingScreen label="Carregant..." />);

    expect(screen.getByText('Carregant...')).toBeTruthy();

    screen.rerender(<AgritwinLoadingScreen label="Connectant..." />);

    expect(screen.getByText('Connectant...')).toBeTruthy();
    expect(screen.queryByText('Carregant...')).toBeNull();
  });

  it('renders the background gradient', () => {
    const screen = render(<AgritwinLoadingScreen label="Carregant..." />);

    expect(screen.getByTestId('loading-gradient')).toBeTruthy();
  });

  it('provides the correct accessibility label on the screen', () => {
    const screen = render(<AgritwinLoadingScreen label="Carregant dades..." />);

    expect(screen.getByLabelText('AgriTwin. Carregant dades...')).toBeTruthy();
  });

  it('renders an accessible progress bar', () => {
    const screen = render(<AgritwinLoadingScreen label="Carregant..." />);

    const progressBar = screen.getByRole('progressbar');

    expect(progressBar).toBeTruthy();
    expect(progressBar.props.accessibilityLabel).toBe('AgriTwin. Carregant...');
  });

  it('starts five looping animations', () => {
    render(<AgritwinLoadingScreen label="Carregant..." />);

    // Una animació de progrés + quatre estrelles.
    expect(loopSpy).toHaveBeenCalledTimes(5);

    expect(animationMocks).toHaveLength(5);

    animationMocks.forEach((animation) => {
      expect(animation.start).toHaveBeenCalledTimes(1);
    });
  });

  it('stops all animations when the component unmounts', () => {
    const screen = render(<AgritwinLoadingScreen label="Carregant..." />);

    expect(animationMocks).toHaveLength(5);

    screen.unmount();

    animationMocks.forEach((animation) => {
      expect(animation.stop).toHaveBeenCalledTimes(1);
    });
  });

  it('does not restart animations when the label changes', () => {
    const screen = render(<AgritwinLoadingScreen label="Carregant..." />);

    expect(loopSpy).toHaveBeenCalledTimes(5);

    screen.rerender(<AgritwinLoadingScreen label="Connectant..." />);

    expect(loopSpy).toHaveBeenCalledTimes(5);
  });

  it('restarts animations after being mounted again', () => {
    const firstScreen = render(<AgritwinLoadingScreen label="Carregant..." />);

    expect(loopSpy).toHaveBeenCalledTimes(5);

    firstScreen.unmount();

    animationMocks.forEach((animation) => {
      expect(animation.stop).toHaveBeenCalledTimes(1);
    });

    const secondScreen = render(<AgritwinLoadingScreen label="Carregant..." />);

    expect(loopSpy).toHaveBeenCalledTimes(10);

    secondScreen.unmount();
  });
});
