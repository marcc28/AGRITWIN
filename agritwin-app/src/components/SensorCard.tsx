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
  title?: string;
  subtitle?: string;
  hint?: string;
};

function EmptyCard({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export function SensorCard({
  dashboard,
  errorMessage,
  onPress,
  title,
  subtitle,
  hint,
}: Props) {
  const heading = title ?? 'Dades del camp';

  if (errorMessage) {
    return <EmptyCard title={heading} message={errorMessage} />;
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
      <EmptyCard title={heading} message="Encara no tens cap camp." />
    );
  }

  if (dashboard.device_ids.length === 0) {
    return (
      <EmptyCard
        title={heading}
        message="Aquest camp encara no té cap dispositiu."
      />
    );
  }

  if (!dashboard.latest) {
    return (
      <EmptyCard title={heading} message="Encara no hi ha cap lectura." />
    );
  }

  const { latest } = dashboard;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{heading}</Text>
          {subtitle ? (
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          ) : null}
          <Text style={styles.cardHint}>
            Darrera lectura · {formatDateTime(latest.timestamp)}
          </Text>
          {hint ? <Text style={styles.cardHint}>{hint}</Text> : null}
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
