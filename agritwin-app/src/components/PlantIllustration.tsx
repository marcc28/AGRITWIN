import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';

const C = Colors.light;

type Props = {
  size?: number;
};

export function PlantIllustration({ size = 150 }: Readonly<Props>) {
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 200 160">
      <Circle cx={160} cy={36} r={16} fill={C.secondary} opacity={0.35} />
      <Ellipse cx={100} cy={146} rx={70} ry={8} fill={C.border} />
      <Path
        d="M100 104 C100 84 100 70 100 52"
        stroke={C.primaryDark}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M100 78 C78 80 60 66 56 44 C78 42 96 54 100 78 Z"
        fill={C.primary}
      />
      <Path
        d="M100 66 C122 68 140 54 144 32 C122 30 104 42 100 66 Z"
        fill={C.surfaceSecondary}
        stroke={C.primary}
        strokeWidth={2}
      />
      <Path
        d="M100 54 C92 42 94 28 104 18 C112 30 110 44 100 54 Z"
        fill={C.primaryDark}
      />
      <Rect x={62} y={100} width={76} height={12} rx={4} fill={C.primaryDark} />
      <Path d="M68 112 L132 112 L124 146 L76 146 Z" fill={C.secondary} />
      <Path
        d="M74 124 L126 124"
        stroke={C.surface}
        strokeWidth={2}
        opacity={0.5}
      />
    </Svg>
  );
}
