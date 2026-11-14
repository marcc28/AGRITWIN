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

import { Colors } from '../constants/theme';

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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B7E0D0',
  },
  sun: {
    position: 'absolute',
    top: 56,
    right: '13%',
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFE18A',
    shadowColor: '#FFE18A',
    shadowOpacity: 0.75,
    shadowRadius: 24,
    elevation: 10,
  },
  star: {
    position: 'absolute',
    top: 0,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  landscape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '28%',
    backgroundColor: '#638C3D',
    borderTopWidth: 12,
    borderTopColor: '#88A94F',
  },
  fieldLines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.24,
    borderTopWidth: 2,
    borderColor: '#E8D89A',
    transform: [{ skewY: '-8deg' }],
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 20,
  },
  farmer: {
    width: 190,
    height: 205,
    alignItems: 'center',
    marginBottom: 18,
  },
  hatBrim: {
    position: 'absolute',
    top: 12,
    width: 106,
    height: 19,
    borderRadius: 50,
    backgroundColor: '#C58B45',
    zIndex: 4,
  },
  hatCrown: {
    position: 'absolute',
    top: 0,
    width: 64,
    height: 30,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderBottomWidth: 4,
    borderColor: '#A96D35',
    backgroundColor: '#D9A35F',
    zIndex: 5,
  },
  head: {
    position: 'absolute',
    top: 22,
    width: 65,
    height: 65,
    borderRadius: 34,
    backgroundColor: '#F0B27A',
    zIndex: 3,
  },
  eye: {
    position: 'absolute',
    top: 25,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B241B',
  },
  leftEye: { left: 14 },
  rightEye: { right: 14 },
  moustache: {
    position: 'absolute',
    left: 19,
    top: 43,
    width: 28,
    height: 9,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#4A2B20',
  },
  torso: {
    position: 'absolute',
    top: 82,
    width: 76,
    height: 84,
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
    backgroundColor: '#5B7F3B',
    alignItems: 'center',
    zIndex: 2,
  },
  overalls: {
    position: 'absolute',
    top: 33,
    width: 38,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#8CAE56',
    borderTopWidth: 5,
    borderColor: '#D7E5A5',
  },
  arm: {
    position: 'absolute',
    top: 91,
    width: 34,
    height: 22,
    borderRadius: 12,
    backgroundColor: '#6F9347',
    zIndex: 1,
  },
  leftArm: { left: 39, transform: [{ rotate: '-16deg' }] },
  rightArm: { right: 39, transform: [{ rotate: '16deg' }] },
  leg: {
    position: 'absolute',
    top: 158,
    width: 21,
    height: 34,
    borderBottomWidth: 7,
    borderBottomColor: '#3B291E',
    backgroundColor: '#815632',
    zIndex: 1,
  },
  leftLeg: { left: 66, transform: [{ rotate: '8deg' }] },
  rightLeg: { right: 66, transform: [{ rotate: '-8deg' }] },
  rakeHandle: {
    position: 'absolute',
    top: 45,
    right: 45,
    width: 7,
    height: 114,
    borderRadius: 4,
    backgroundColor: '#70472A',
    transform: [{ rotate: '20deg' }],
    zIndex: 4,
  },
  rakeHead: {
    position: 'absolute',
    top: -3,
    left: -19,
    width: 45,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D9E0DB',
  },

  rakeTooth: {
    position: 'absolute',
    top: 5,
    width: 4,
    height: 13,
    borderRadius: 2,
    backgroundColor: '#D9E0DB',
  },
  title: {
    color: Colors.light.primaryDark,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#46614F',
    fontSize: 16,
    marginTop: 5,
  },
  progressTrack: {
    width: '76%',
    maxWidth: 320,
    height: 9,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 21,
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  progressIndicator: {
    width: '38%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: Colors.light.primaryDark,
  },
});
