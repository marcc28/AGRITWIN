import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import MapCanvas from './field-location/MapCanvas';
import type { MapPoint } from './field-location/types';
import { pickerStyles as styles } from './FieldLocationPicker';
import {
  displayArea,
  fieldGeometry,
  type AreaUnit,
} from '../utils/fieldGeometry';

type Props = {
  initialPoint: MapPoint | null;
  initialBoundary: MapPoint[];
  initialExcludedZones?: MapPoint[][];
  unit: AreaUnit;
  readOnly?: boolean;
  onConfirm: (points: MapPoint[], excludedZones: MapPoint[][]) => void;
  onCancel: () => void;
};
export function FieldBoundaryPicker({
  initialPoint,
  initialBoundary,
  initialExcludedZones = [],
  unit,
  readOnly = false,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const [points, setPoints] = useState(initialBoundary);
  const [zones, setZones] = useState(initialExcludedZones);
  const [active, setActive] = useState<number | null>(null);
  let geometry: ReturnType<typeof fieldGeometry> | null = null;
  let error = '';
  try {
    geometry = fieldGeometry(points, zones);
  } catch (e) {
    if (points.length >= 3) error = e instanceof Error ? e.message : 'invalid';
  }
  const ring = active === null ? points : zones[active];
  const change = (next: MapPoint[]) => {
    if (readOnly) return;
    if (active === null) setPoints(next);
    else setZones(zones.map((p, i) => (i === active ? next : p)));
  };
  const label = (key: string) => t(`settings.createField.boundary.${key}`);
  const unitLabel = t(`settings.createField.areaUnits.${unit}`);
  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {label(readOnly ? 'viewTitle' : 'title')}
          </Text>
          <Text style={styles.hint}>
            {label(readOnly ? 'viewHint' : 'hint')}
          </Text>
          {!readOnly ? (
            <ScrollView
              horizontal
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 8 }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active === null }}
                onPress={() => setActive(null)}
                style={[styles.cancel, active === null && styles.selected]}
              >
                <Text style={styles.cancelText}>{label('outer')}</Text>
              </Pressable>
              {zones.map((_, i) => (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active === i }}
                  onPress={() => setActive(i)}
                  style={[styles.cancel, active === i && styles.selected]}
                >
                  <Text style={styles.cancelText}>
                    {t('settings.createField.boundary.exclusion', {
                      number: i + 1,
                    })}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
        <MapCanvas
          point={initialPoint}
          onSelect={() => undefined}
          boundary={points}
          excludedZones={zones}
          activeZone={active}
          readOnly={readOnly}
          onBoundaryChange={change}
        />
        <ScrollView
          style={{ flexGrow: 0, maxHeight: '45%' }}
          contentContainerStyle={styles.footer}
        >
          <Text style={styles.hint}>
            {readOnly
              ? label('viewHint')
              : t('settings.createField.boundary.corners', {
                  count: ring.length,
                })}
          </Text>
          {geometry ? (
            <Text style={styles.hint}>
              {t('settings.createField.boundary.areaSummary', {
                gross: displayArea(geometry.grossAreaM2, unit),
                excluded: displayArea(geometry.excludedAreaM2, unit),
                net: displayArea(geometry.areaM2, unit),
                unit: unitLabel,
              })}
            </Text>
          ) : (
            <Text style={styles.hint}>{label('minimum')}</Text>
          )}
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {t(`settings.createField.boundary.errors.${error}`)}
            </Text>
          ) : null}
          {!readOnly ? (
            <>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={!ring.length}
                  onPress={() => change(ring.slice(0, -1))}
                  style={styles.cancel}
                >
                  <Text style={styles.cancelText}>{label('undo')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (active === null) {
                      setPoints([]);
                      setZones([]);
                    } else {
                      setZones(zones.filter((_, i) => i !== active));
                      setActive(null);
                    }
                  }}
                  style={styles.cancel}
                >
                  <Text style={styles.cancelText}>
                    {label(active === null ? 'clear' : 'removeExclusion')}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={!geometry || zones.length >= 20}
                onPress={() => {
                  setZones([...zones, []]);
                  setActive(zones.length);
                }}
                style={[
                  styles.cancel,
                  (!geometry || zones.length >= 20) && styles.disabled,
                ]}
              >
                <Text style={styles.cancelText}>{label('addExclusion')}</Text>
              </Pressable>
            </>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={styles.cancel}
            >
              <Text style={styles.cancelText}>
                {readOnly
                  ? label('close')
                  : t('settings.createField.map.cancel')}
              </Text>
            </Pressable>
            {!readOnly ? (
              <Pressable
                accessibilityRole="button"
                disabled={!geometry}
                accessibilityState={{ disabled: !geometry }}
                onPress={() => geometry && onConfirm(points, zones)}
                style={[styles.confirm, !geometry && styles.disabled]}
              >
                <Text style={styles.confirmText}>{label('confirm')}</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
