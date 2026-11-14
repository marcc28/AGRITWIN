import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { styles } from '../styles/AgritwinLoadingScreen.styles';

const STAR_POSITIONS = [
  { left: '12%', delay: 0 },
  { left: '31%', delay: 450 },
  { left: '70%', delay: 900 },
  { left: '87%', delay: 250 },
] as const;

export default function AgritwinLoadingScreen({ label }: { label: string }) {
  const { height, width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1250,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );

    animation.start();
    return () => animation.stop();
  }, [progress]);

  const progressTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.28, width * 0.48],
  });

  return (
    <View style={styles.screen} accessibilityLabel={`AgriTwin. ${label}`}>
      <LinearGradient
        colors={['#72C6E8', '#B7E0D0', '#E8C879']}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.sun} />
      {STAR_POSITIONS.map(({ left, delay }, index) => (
        <FallingStar
          key={left}
          left={left}
          delay={delay}
          duration={2600 + index * 220}
          travel={height * 0.58}
        />
      ))}

      <View style={styles.landscape}>
        <View style={styles.fieldLines} />
      </View>

      <View style={styles.content}>
        <View style={styles.farmer} accessibilityElementsHidden>
          <View style={styles.hatBrim} />
          <View style={styles.hatCrown} />
          <View style={styles.head}>
            <View style={[styles.eye, styles.leftEye]} />
            <View style={[styles.eye, styles.rightEye]} />
            <View style={styles.moustache} />
          </View>
          <View style={[styles.arm, styles.leftArm]} />
          <View style={[styles.arm, styles.rightArm]} />
          <View style={styles.torso}>
            <View style={styles.overalls} />
          </View>
          <View style={[styles.leg, styles.leftLeg]} />
          <View style={[styles.leg, styles.rightLeg]} />
          <View style={styles.rakeHandle}>
            <View style={styles.rakeHead}>
              {Array.from({ length: 5 }).map((_, index) => (
                <View
                  key={index}
                  style={[styles.rakeTooth, { left: 4 + index * 8 }]}
                />
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.title}>AgriTwin</Text>
        <Text style={styles.subtitle} accessibilityLiveRegion="polite">
          {label}
        </Text>
        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityLabel={`AgriTwin. ${label}`}
        >
          <Animated.View
            style={[
              styles.progressIndicator,
              { transform: [{ translateX: progressTranslateX }] },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

function FallingStar({
  left,
  delay,
  duration,
  travel,
}: {
  left: `${number}%`;
  delay: number;
  duration: number;
  travel: number;
}) {
  const fall = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(fall, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(fall, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [delay, duration, fall]);

  const translateY = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, travel],
  });
  const opacity = fall.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 0.9, 0.8, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.star, { left, opacity, transform: [{ translateY }] }]}
    />
  );
}
