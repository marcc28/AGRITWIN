import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  MEASURES,
  formatDateTime,
  formatValue,
  getMeasureValue,
} from '@/constants/measures';
import { Colors } from '@/constants/theme';
import type { Dashboard } from '@/services/api';
import { styles } from '@/styles/sensor.styles';

type Props = {
  dashboard: Dashboard | null;
  errorMessage: string;
  onPress: () => void;
};

function EmptyCard({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export function SensorCard({ dashboard, errorMessage, onPress }: Props) {
  if (errorMessage) {
    return <EmptyCard title="Dades del camp" message={errorMessage} />;
  }

  if (!dashboard) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={Colors.light.primary} />
      </View>
    );
  }

  if (dashboard.field_name === null) {
    return (
      <EmptyCard title="Dades del camp" message="Encara no tens cap camp." />
    );
  }

  if (dashboard.device_ids.length === 0) {
    return (
      <EmptyCard
        title={dashboard.field_name}
        message="Aquest camp encara no té cap dispositiu."
      />
    );
  }

  if (!dashboard.latest) {
    return (
      <EmptyCard
        title={dashboard.field_name}
        message="Encara no hi ha cap lectura."
      />
    );
  }

  const { latest } = dashboard;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{dashboard.field_name}</Text>
          <Text style={styles.cardSubtitle}>
            Darrera lectura · {formatDateTime(latest.timestamp)}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={Colors.light.textMuted}
        />
      </View>

      <View style={styles.measureRow}>
        {MEASURES.map((measure) => (
          <View key={measure.key} style={styles.measureColumn}>
            <Text style={styles.measureLabel}>{measure.shortLabel}</Text>
            <Ionicons
              name={measure.icon}
              size={22}
              color={Colors.light.primaryDark}
            />
            <Text style={styles.measureValue}>
              {formatValue(getMeasureValue(latest, measure), measure)}
            </Text>
            <Text style={styles.measureUnit}>{measure.unit}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}
