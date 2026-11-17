import React from 'react';
import { Animated } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';

import MarketSkeleton from '@/components/market/MarketSkeleton';
import { Colors } from '@/constants/theme';

describe('MarketSkeleton', () => {
  let animationSpy: jest.SpyInstance;
  let animations: Array<{ start: jest.Mock; stop: jest.Mock }>;

  beforeEach(() => {
    animations = [];
    animationSpy = jest.spyOn(Animated, 'loop').mockImplementation(() => {
      const animation = { start: jest.fn(), stop: jest.fn() };
      animations.push(animation);
      return animation as any;
    });
  });

  afterEach(() => {
    cleanup();
    animationSpy.mockRestore();
  });

  it('renders five placeholder cards by default', () => {
    const screen = render(<MarketSkeleton />);

    expect(screen.getByTestId('market-skeleton')).toBeTruthy();
    expect(screen.getAllByTestId(/market-skeleton-card-/)).toHaveLength(5);
  });

  it('uses the requested count, width, gap, and compact layout', () => {
    const screen = render(
      <MarketSkeleton count={3} cardWidth={320} gap={8} compact />,
    );

    expect(screen.getAllByTestId(/market-skeleton-card-/)).toHaveLength(3);
    expect(screen.getByTestId('market-skeleton').props.style.gap).toBe(8);

    const firstCard = screen.getByTestId('market-skeleton-card-0');
    expect(firstCard.props.style.width).toBe(320);
    expect(firstCard.props.style.padding).toBe(10);
    expect(firstCard.props.style.backgroundColor).toBe(Colors.light.surface);
  });

  it('starts one shimmer animation per placeholder and stops them on unmount', () => {
    const screen = render(<MarketSkeleton count={2} />);

    expect(animationSpy).toHaveBeenCalledTimes(2);
    animations.forEach((animation) => {
      expect(animation.start).toHaveBeenCalledTimes(1);
    });

    screen.unmount();

    animations.forEach((animation) => {
      expect(animation.stop).toHaveBeenCalledTimes(1);
    });
  });
});
