import { View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { Colors } from '@/constants/theme';
import type { Reading } from '@/services/api';

type Props = {
  history: Reading[];
  getValue: (reading: Reading) => number;
  width?: number;
};

export function ReadingChart({ history, getValue, width = 280 }: Props) {
  const values = history.map(getValue);
  const data = values.map((value) => ({ value }));
  const min = Math.floor(Math.min(...values));
  const max = Math.ceil(Math.max(...values));

  return (
    <View style={{ marginTop: 12 }}>
      <LineChart
        data={data}
        height={120}
        width={width}
        color={Colors.light.primary}
        thickness={2}
        curved
        areaChart
        startFillColor={Colors.light.primary}
        endFillColor={Colors.light.surface}
        startOpacity={0.25}
        endOpacity={0}
        hideDataPoints
        hideRules
        yAxisTextStyle={{ color: Colors.light.textSecondary, fontSize: 10 }}
        xAxisColor={Colors.light.border}
        yAxisColor={Colors.light.border}
        noOfSections={4}
        yAxisOffset={min}
        maxValue={Math.max(max - min, 1)}
        initialSpacing={0}
        spacing={width / Math.max(data.length - 1, 1)}
      />
    </View>
  );
}
