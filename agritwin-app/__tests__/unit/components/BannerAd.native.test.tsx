import React from 'react';
import { StyleSheet } from 'react-native';
import { act, cleanup, render } from '@testing-library/react-native';

import BannerAd from '@/components/adBanner/BannerAd.native';

jest.mock('react-native-google-mobile-ads', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return {
    BannerAd: (props: Record<string, unknown>) =>
      ReactModule.createElement(View, {
        ...props,
        testID: 'mocked-admob-banner',
      }),
    BannerAdSize: {
      ANCHORED_ADAPTIVE_BANNER: 'adaptive-banner',
    },
    TestIds: {
      ADAPTIVE_BANNER: 'test-banner-unit-id',
    },
  };
});

describe('BannerAd.native', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('renders an adaptive AdMob banner with the test unit in development', () => {
    const screen = render(
      <BannerAd position="top" marginTop={7} marginBottom={11} />,
    );

    const banner = screen.getByTestId('mocked-admob-banner');
    const container = screen.getByTestId('native-banner-ad-container');

    expect(banner.props.unitId).toBe('test-banner-unit-id');
    expect(banner.props.size).toBe('adaptive-banner');
    expect(banner.props.requestOptions).toEqual({
      requestNonPersonalizedAdsOnly: true,
      networkExtras: { collapsible: 'top' },
    });
    expect(StyleSheet.flatten(container.props.style)).toMatchObject({
      width: '100%',
      marginTop: 7,
      marginBottom: 11,
    });
  });

  it('keeps the banner visible after a successful load', () => {
    const screen = render(<BannerAd />);
    const banner = screen.getByTestId('mocked-admob-banner');

    act(() => banner.props.onAdLoaded());

    expect(screen.getByTestId('native-banner-ad-container')).toBeTruthy();
  });

  it('hides the banner after an AdMob load error', () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    const screen = render(<BannerAd />);
    const banner = screen.getByTestId('mocked-admob-banner');

    act(() => banner.props.onAdFailedToLoad(new Error('No fill')));

    expect(screen.queryByTestId('native-banner-ad-container')).toBeNull();
  });
});
