import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '../constants/theme';
import { styles } from '../styles/AgritwinLoadingScreen.styles';

type Props = { label: string; progress?: number };

export default function AgritwinLoadingScreen({ label, progress }: Props) {
  const { width } = useWindowDimensions();
  const pulse = useRef(new Animated.Value(0)).current;
  const activity = useRef(new Animated.Value(0)).current;
  const completion = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [trackWidth, setTrackWidth] = useState(Math.min(320, width - 64));
  const knownProgress = progress !== undefined && Number.isFinite(progress);
  const fraction = knownProgress ? Math.min(1, Math.max(0, progress)) : 0;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion]);

  useEffect(() => {
    if (knownProgress || reduceMotion) return;
    const animation = Animated.loop(
      Animated.timing(activity, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [activity, knownProgress, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      completion.setValue(fraction);
      return;
    }
    const animation = Animated.timing(completion, {
      toValue: fraction,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [completion, fraction, reduceMotion]);

  return (
    <View style={styles.screen} testID="agritwin-loading-screen">
      <LinearGradient
        colors={[Colors.light.background, '#F4F3EA', Colors.light.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Animated.Text
          accessibilityRole="header"
          style={[
            styles.title,
            {
              fontSize: Math.min(60, Math.max(28, (width - 64) / 6.2)),
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.62, 1],
              }),
            },
          ]}
        >
          AGRITWIN
        </Animated.Text>
        <Text style={styles.subtitle} accessibilityLiveRegion="polite">
          {label}
        </Text>
        <View
          style={styles.progressTrack}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`AGRITWIN. ${label}`}
          accessibilityValue={
            knownProgress
              ? { min: 0, max: 100, now: Math.round(fraction * 100) }
              : undefined
          }
        >
          <Animated.View
            style={[
              styles.progressIndicator,
              knownProgress
                ? {
                    width: completion.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  }
                : {
                    width: '35%',
                    transform: [
                      {
                        translateX: reduceMotion
                          ? trackWidth * 0.325
                          : activity.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-trackWidth * 0.35, trackWidth],
                            }),
                      },
                    ],
                  },
            ]}
          />
        </View>
      </View>
    </View>
  );
}
