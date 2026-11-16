import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BannerAd as AdMobBanner,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';

// Test IDs for development, production Android Ad Unit ID for release
const adUnitId = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : 'ca-app-pub-9932105333351744/1777581401';

interface BannerAdProps {
  position?: 'top' | 'bottom';
  marginTop?: number;
  marginBottom?: number;
}

export default function BannerAd({
  position = 'bottom',
  marginTop = 20,
  marginBottom = 0,
}: BannerAdProps) {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  const handleAdLoaded = () => {
    setAdLoaded(true);
    setAdError(false);
  };

  const handleAdFailedToLoad = (error: any) => {
    console.log('Ad failed to load:', error);
    setAdError(true);
    setAdLoaded(false);
  };

  // Don't render anything if ad failed to load
  if (adError) {
    return null;
  }

  return (
    <View style={[styles.container, { marginTop, marginBottom }]}>
      <AdMobBanner
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
          networkExtras: {
            collapsible: position,
          },
        }}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});