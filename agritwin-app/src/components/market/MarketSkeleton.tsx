import { useEffect, useRef } from 'react';
import {
  Animated,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';

import { Colors } from '@/constants/theme';

function SkeletonProductCard({
  testID,
  cardWidth,
  compact = false,
}: {
  testID: string;
  cardWidth?: number;
  compact?: boolean;
}) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { width } = useWindowDimensions();

  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => animation.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const base = colors.surfaceSecondary;
  const highlight = colors.surface;
  const thumbSize = compact ? 48 : 64;

  const block = {
    backgroundColor: base,
    borderRadius: 6,
  } as const;

  return (
    <View
      testID={testID}
      style={{
        width: cardWidth ?? '100%',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: compact ? 16 : 18,
        padding: compact ? 10 : 14,
        overflow: 'hidden',
      }}
    >
      {/* Imatge i informació principal */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={[
            block,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: 10,
            },
          ]}
        />

        <View
          style={{
            flex: 1,
            marginLeft: compact ? 8 : 12,
            gap: compact ? 6 : 9,
          }}
        >
          <View style={[block, { width: '65%', height: compact ? 11 : 13 }]} />
          <View style={[block, { width: '85%', height: compact ? 9 : 10 }]} />
          <View style={[block, { width: '45%', height: compact ? 8 : 9 }]} />
        </View>

        <View style={[block, { width: 58, height: 19, marginLeft: 8 }]} />
      </View>

      {/* Preu i botó */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: compact ? 8 : 17,
        }}
      >
        <View style={[block, { width: 65, height: compact ? 9 : 11 }]} />
        <View
          style={[
            block,
            {
              width: compact ? 72 : 85,
              height: compact ? 28 : 32,
              borderRadius: 20,
            },
          ]}
        />
      </View>

      {/* Efecte shimmer */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: width * 0.55,
          backgroundColor: highlight,
          opacity: 0.35,
          transform: [{ translateX }, { skewX: '-20deg' }],
        }}
      />
    </View>
  );
}

export default function MarketSkeleton({
  count = 5,
  cardWidth,
  gap = 12,
  compact = false,
}: {
  count?: number;
  cardWidth?: number;
  gap?: number;
  compact?: boolean;
}) {
  return (
    <View
      testID="market-skeleton"
      style={{
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap,
        paddingTop: compact ? 6 : 8,
      }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonProductCard
          key={index}
          testID={`market-skeleton-card-${index}`}
          cardWidth={cardWidth}
          compact={compact}
        />
      ))}
    </View>
  );
}
