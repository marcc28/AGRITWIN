import React from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import { renderAsync, cleanupAsync } from '@testing-library/react-native';

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
  let timingSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    animationMocks = [];
    timingSpy = jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    }));

    loopSpy = jest.spyOn(Animated, 'loop').mockImplementation(() => {
      const animation = {
        start: jest.fn(),
        stop: jest.fn(),
      };

      animationMocks.push(animation);

      return animation as any;
    });
  });

  afterEach(async () => {
    await cleanupAsync();
    loopSpy.mockRestore();
    timingSpy.mockRestore();
  });

  it('renders the AgriTwin title', async () => {
    const screen = await renderAsync(
      <AgritwinLoadingScreen label="Carregant..." />,
    );

    expect(screen.getByText('AGRITWIN')).toBeTruthy();
  });

  it('renders the loading label', async () => {
    const screen = await renderAsync(
      <AgritwinLoadingScreen label="Preparant aplicació..." />,
    );

    expect(screen.getByText('Preparant aplicació...')).toBeTruthy();
  });

  it('updates the displayed label when the prop changes', async () => {
    const screen = await renderAsync(
      <AgritwinLoadingScreen label="Carregant..." />,
    );

    expect(screen.getByText('Carregant...')).toBeTruthy();

    await screen.rerenderAsync(<AgritwinLoadingScreen label="Connectant..." />);

    expect(screen.getByText('Connectant...')).toBeTruthy();
    expect(screen.queryByText('Carregant...')).toBeNull();
  });

  it('renders the background gradient', async () => {
    const screen = await renderAsync(
      <AgritwinLoadingScreen label="Carregant..." />,
    );

    expect(screen.getByTestId('loading-gradient')).toBeTruthy();
  });

  it('provides the correct accessibility label on the screen', async () => {
    const screen = await renderAsync(
      <AgritwinLoadingScreen label="Carregant dades..." />,
    );

    expect(screen.getByLabelText('AGRITWIN. Carregant dades...')).toBeTruthy();
  });

  it('renders an accessible progress bar', async () => {
    const screen = await renderAsync(
      <AgritwinLoadingScreen label="Carregant..." />,
    );

    const progressBar = screen.getByRole('progressbar');

    expect(progressBar).toBeTruthy();
    expect(progressBar.props.accessibilityLabel).toBe('AGRITWIN. Carregant...');
  });

  it('starts the wordmark and activity animations', async () => {
    await renderAsync(<AgritwinLoadingScreen label="Carregant..." />);

    // A calm wordmark pulse and an indeterminate activity bar.
    expect(loopSpy).toHaveBeenCalledTimes(2);

    expect(animationMocks).toHaveLength(2);

    animationMocks.forEach((animation) => {
      expect(animation.start).toHaveBeenCalledTimes(1);
    });
  });

  it('stops all animations when the component unmounts', async () => {
    const screen = await renderAsync(
      <AgritwinLoadingScreen label="Carregant..." />,
    );

    expect(animationMocks).toHaveLength(2);

    await screen.unmountAsync();

    animationMocks.forEach((animation) => {
      expect(animation.stop).toHaveBeenCalledTimes(1);
    });
  });

  it('does not restart animations when the label changes', async () => {
    const screen = await renderAsync(
      <AgritwinLoadingScreen label="Carregant..." />,
    );

    expect(loopSpy).toHaveBeenCalledTimes(2);

    await screen.rerenderAsync(<AgritwinLoadingScreen label="Connectant..." />);

    expect(loopSpy).toHaveBeenCalledTimes(2);
  });

  it('restarts animations after being mounted again', async () => {
    const firstScreen = await renderAsync(
      <AgritwinLoadingScreen label="Carregant..." />,
    );

    expect(loopSpy).toHaveBeenCalledTimes(2);

    await firstScreen.unmountAsync();

    animationMocks.forEach((animation) => {
      expect(animation.stop).toHaveBeenCalledTimes(1);
    });

    const secondScreen = await renderAsync(
      <AgritwinLoadingScreen label="Carregant..." />,
    );

    expect(loopSpy).toHaveBeenCalledTimes(4);

    await secondScreen.unmountAsync();
  });
  it('reports real completed stages when progress is available', async () => {
    const screen = await renderAsync(
      <AgritwinLoadingScreen label="Loading" progress={0.55} />,
    );
    expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 55,
    });
    await screen.rerenderAsync(
      <AgritwinLoadingScreen label="Loading" progress={1.2} />,
    );
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(
      100,
    );
  });

  it('does not invent a completion percentage for unknown work', async () => {
    const screen = await renderAsync(<AgritwinLoadingScreen label="Loading" />);
    expect(
      screen.getByRole('progressbar').props.accessibilityValue,
    ).toBeUndefined();
  });
  it('stops the pulse and activity motion when reduced motion is enabled', async () => {
    const preference = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValueOnce(true);
    const screen = await renderAsync(<AgritwinLoadingScreen label="Loading" />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(animationMocks.length).toBeGreaterThan(0);
    animationMocks.forEach((animation) =>
      expect(animation.stop).toHaveBeenCalled(),
    );
    preference.mockRestore();
  });
});
