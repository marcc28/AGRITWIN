import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ReadingChart } from '@/components/ReadingChart';
import {
  MEASURES,
  formatDateTime,
  formatValue,
  getMeasureValue,
  type MeasureKey,
} from '@/constants/measures';
import { Colors } from '@/constants/theme';
import type { Dashboard, Reading } from '@/services/api';
import { styles } from '@/styles/sensor.styles';

type Props = Readonly<{
  visible: boolean;
  dashboard: Dashboard;
  latest: Reading;
  onClose: () => void;
  asScreen?: boolean;
}>;

const SOIL_DRY_THRESHOLD = 35;
const CHART_WIDTH = 240;

export function SensorModal({
  visible,
  dashboard,
  latest,
  onClose,
  asScreen = false,
}: Props) {
  const [selectedKey, setSelectedKey] = useState<MeasureKey>('temperature');
  const [chartWidth, setChartWidth] = useState(CHART_WIDTH);

  const measure =
    MEASURES.find((item) => item.key === selectedKey) ?? MEASURES[0];
  const values = dashboard.history.map((reading) =>
    getMeasureValue(reading, measure),
  );
  const latestValue = getMeasureValue(latest, measure);
  const max = values.length > 0 ? Math.max(...values) : latestValue;
  const min = values.length > 0 ? Math.min(...values) : latestValue;
  const first = dashboard.history[0] ?? latest;
  const soilDry = latest.soil_humidity < SOIL_DRY_THRESHOLD;

  const body = (
    <>
      <View style={styles.modalHeader}>
        <View>
          <Text style={styles.modalTitle}>{dashboard.field_name}</Text>
          <Text style={styles.cardSubtitle}>
            {dashboard.device_ids.length === 1
              ? `Dades del sensor · ${dashboard.device_ids[0]}`
              : `Dades del camp · ${dashboard.device_ids.length} sensors`}
          </Text>
        </View>
        {asScreen ? null : (
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={18} color={Colors.light.text} />
          </Pressable>
        )}
      </View>

      <View style={styles.hero}>
        <View style={styles.heroLeft}>
          <Ionicons
            name={measure.icon}
            size={36}
            color={Colors.light.primaryDark}
          />
          <View>
            <Text style={styles.heroValue}>
              {formatValue(getMeasureValue(latest, measure), measure)}
              {measure.unit}
            </Text>
            <Text style={styles.heroLabel}>{measure.label}</Text>
          </View>
        </View>
        <View style={styles.heroRight}>
          <Text style={styles.heroSmall}>Darrera lectura</Text>
          <Text style={styles.heroStrong}>
            Màx {formatValue(max, measure)} · Mín {formatValue(min, measure)}
          </Text>
          <Text style={styles.heroSmall}>
            {formatDateTime(latest.timestamp)}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Evolució</Text>
        <Text style={styles.sectionHint}>
          Últimes {dashboard.history.length} lectures
        </Text>
      </View>
      <View
        onLayout={(event) => {
          const next = Math.floor(event.nativeEvent.layout.width);
          if (next > 0 && next !== chartWidth) {
            setChartWidth(next);
          }
        }}
      >
        <ReadingChart
          history={dashboard.history}
          getValue={(reading) => getMeasureValue(reading, measure)}
          width={chartWidth}
        />
      </View>

      <View style={styles.grid}>
        {MEASURES.map((item) => {
          const selected = item.key === measure.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.gridItem, selected && styles.gridItemSelected]}
              onPress={() => setSelectedKey(item.key)}
            >
              <View style={styles.gridItemHeader}>
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={Colors.light.primaryDark}
                />
                <Text style={styles.gridLabel}>{item.label}</Text>
              </View>
              <Text style={styles.gridValue}>
                {formatValue(getMeasureValue(latest, item), item)} {item.unit}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.rangeRow}>
        <View style={styles.rangeItem}>
          <Ionicons
            name="time-outline"
            size={14}
            color={Colors.light.textSecondary}
          />
          <Text style={styles.rangeText}>
            Primera {formatDateTime(first.timestamp)}
          </Text>
        </View>
        <View style={styles.rangeItem}>
          <Ionicons
            name="time-outline"
            size={14}
            color={Colors.light.textSecondary}
          />
          <Text style={styles.rangeText}>
            Última {formatDateTime(latest.timestamp)}
          </Text>
        </View>
      </View>

      <View style={styles.tip}>
        <Ionicons
          name="leaf-outline"
          size={16}
          color={Colors.light.successText}
        />
        <View style={styles.tipTextBox}>
          <Text style={styles.tipTitle}>
            {soilDry ? 'El sòl està sec' : 'Humitat del sòl correcta'}
          </Text>
          <Text style={styles.tipText}>
            {soilDry
              ? 'La humitat del sòl és baixa. Revisa el reg, millor a primera hora o al capvespre.'
              : 'No cal regar ara mateix. Torna a comprovar-ho demà.'}
          </Text>
        </View>
      </View>

      <Text style={styles.footnote}>
        {dashboard.device_ids.length === 1
          ? `Lectures reals del dispositiu ${dashboard.device_ids[0]}.`
          : `Mitjana de ${dashboard.device_ids.length} sensors del camp.`}{' '}
        No inclou previsió meteorològica.
      </Text>
    </>
  );

  if (asScreen) {
    return (
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageCard}>{body}</View>
      </ScrollView>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>{body}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}
