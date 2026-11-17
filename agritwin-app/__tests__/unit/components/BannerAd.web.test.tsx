import React from 'react';
import { cleanup, render } from '@testing-library/react-native';

import BannerAd from '@/components/adBanner/BannerAd.web';

describe('BannerAd.web', () => {
  let originalWindow: typeof globalThis.window | undefined;

  beforeEach(() => {
    originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { adsbygoogle: [] },
    });
  });

  afterEach(() => {
    cleanup();

    if (originalWindow === undefined) {
      delete (globalThis as { window?: typeof globalThis.window }).window;
    } else {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it('pushes one responsive AdSense request when mounted', () => {
    const screen = render(<BannerAd />);
    const adSlot = screen.root.find(
      (node: { type: unknown }) => node.type === 'ins',
    );
    const wrapper = screen.root.find(
      (node: { type: unknown }) => node.type === 'div',
    );

    expect(globalThis.window.adsbygoogle).toHaveLength(1);
    expect(globalThis.window.adsbygoogle[0]).toEqual({});
    expect(adSlot.props).toMatchObject({
      className: 'adsbygoogle',
      'data-ad-client': 'ca-pub-5472828884402627',
      'data-ad-slot': '9969549773',
      'data-auto-format': 'rspv',
      'data-full-width-responsive': 'true',
    });
    expect(wrapper.props.style).toMatchObject({
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      marginTop: 20,
      marginBottom: 0,
    });
  });

  it('applies custom spacing and reuses the existing AdSense queue', () => {
    const existingQueue = [{ existingRequest: true }];
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { adsbygoogle: existingQueue },
    });

    const screen = render(
      <BannerAd position="bottom" marginTop={4} marginBottom={9} />,
    );
    const wrapper = screen.root.find(
      (node: { type: unknown }) => node.type === 'div',
    );

    expect(globalThis.window.adsbygoogle).toEqual([
      { existingRequest: true },
      {},
    ]);
    expect(wrapper.props.style).toMatchObject({
      marginTop: 4,
      marginBottom: 9,
    });
  });
});
