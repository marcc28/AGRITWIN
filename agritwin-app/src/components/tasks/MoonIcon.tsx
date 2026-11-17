import { View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { MoonPhase } from '@/utils/moon';

type Props = {
  phase: MoonPhase;
  size?: number;
  testID?: string;
  label?: string;
};

const LIT = Colors.light.textSecondary;
const DARK = Colors.light.surface;
// How far the second circle moves to make a crescent or a gibbous moon.
const SHIFT = 0.35;

/**
 * A tiny moon drawn with plain circles: the lit side is filled and the dark
 * side is white. The moon grows on the right side (northern hemisphere).
 */
export function MoonIcon({ phase, size = 10, testID, label }: Props) {
  const inner = size - 2;
  const waxing = ['waxingCrescent', 'firstQuarter', 'waxingGibbous'].includes(
    phase,
  );
  const crescent = phase === 'waxingCrescent' || phase === 'waningCrescent';
  const gibbous = phase === 'waxingGibbous' || phase === 'waningGibbous';
  const quarter = phase === 'firstQuarter' || phase === 'lastQuarter';

  // The container is the main colour; the child is drawn over it.
  const background = phase === 'full' || crescent ? LIT : DARK;

  return (
    <View
      testID={testID}
      accessible={label !== undefined}
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: LIT,
        overflow: 'hidden',
        backgroundColor: background,
      }}
    >
      {quarter ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: inner / 2,
            ...(waxing ? { right: 0 } : { left: 0 }),
            backgroundColor: LIT,
          }}
        />
      ) : null}
      {crescent || gibbous ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            // A crescent hides part of the lit disc with a white disc.
            // A gibbous moon shows a lit disc on a white one.
            backgroundColor: crescent ? DARK : LIT,
            left: (waxing === crescent ? -1 : 1) * SHIFT * inner,
          }}
        />
      ) : null}
    </View>
  );
}
