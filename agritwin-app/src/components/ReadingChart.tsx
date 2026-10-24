import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { Colors } from '@/constants/theme';
import type { Reading } from '@/services/api';

type Props = Readonly<{
  history: Reading[];
  getValue: (reading: Reading) => number;
  width?: number;
}>;

const HEIGHT = 132;
const PAD_LEFT = 36;
const PAD_RIGHT = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 18;

function tickLabel(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(1);
}

export function ReadingChart({ history, getValue, width = 280 }: Props) {
  const values = history.map(getValue);

  if (values.length === 0 || width <= 0) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerWidth = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
  const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const points = values.map((value, index) => {
    const x =
      values.length === 1
        ? PAD_LEFT + innerWidth / 2
        : PAD_LEFT + (index / (values.length - 1)) * innerWidth;
    const y = PAD_TOP + innerHeight - ((value - min) / range) * innerHeight;
    return { x, y };
  });

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
    .join(' ');
  const lastPoint = points.at(-1);
  const area = `${line} L${lastPoint?.x} ${PAD_TOP + innerHeight} L${points[0].x} ${PAD_TOP + innerHeight} Z`;
  const ticks = [max, (max + min) / 2, min];
  let shownPoints = points;
  if (points.length > 16 && lastPoint) {
    shownPoints = [points[0], lastPoint];
  }

  return (
    <View style={{ marginTop: 12, overflow: 'visible' }}>
      <Svg width={width} height={HEIGHT}>
        <Defs>
          <LinearGradient id="agritwinChartFill" x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0"
              stopColor={Colors.light.primary}
              stopOpacity={0.28}
            />
            <Stop offset="1" stopColor={Colors.light.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {ticks.map((tick, index) => {
          const y = PAD_TOP + (index / (ticks.length - 1)) * innerHeight;
          return (
            <Line
              key={`grid-${tick}-${index}`}
              x1={PAD_LEFT}
              x2={width - PAD_RIGHT}
              y1={y}
              y2={y}
              stroke={Colors.light.border}
              strokeWidth={1}
            />
          );
        })}

        {values.length > 1 ? (
          <Path d={area} fill="url(#agritwinChartFill)" />
        ) : null}

        {values.length > 1 ? (
          <Path
            d={line}
            stroke={Colors.light.primary}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {shownPoints.map((point, index) => (
          <Circle
            key={`point-${point.x}-${point.y}`}
            cx={point.x}
            cy={point.y}
            r={values.length === 1 ? 5 : 3.5}
            fill={Colors.light.primary}
          />
        ))}

        {ticks.map((tick, index) => {
          const y = PAD_TOP + (index / (ticks.length - 1)) * innerHeight + 3;
          return (
            <SvgText
              key={`label-${tick}-${index}`}
              x={0}
              y={y}
              fontSize={10}
              fill={Colors.light.textSecondary}
            >
              {tickLabel(tick)}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
