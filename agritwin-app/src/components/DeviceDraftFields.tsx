import { Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors } from '../constants/theme';
import type { FieldDevice } from '../services/api';
import { styles as fieldStyles } from '../styles/create-field.styles';
import { deviceStyles as styles } from '../styles/device-form.styles';

export type DeviceDraft = {
  key: string;
  id: string;
  brand: string;
  serial: string;
};

type DevicePayload = {
  id: string;
  brand: string;
  serial_number: string;
};

export function emptyDeviceDraft(): DeviceDraft {
  return {
    key: `${Date.now()}-${Math.random()}`,
    id: '',
    brand: '',
    serial: '',
  };
}

export function filledDevices(drafts: DeviceDraft[]): DevicePayload[] {
  return drafts
    .map((draft) => ({
      id: draft.id.trim(),
      brand: draft.brand.trim(),
      serial_number: draft.serial.trim(),
    }))
    .filter((device) => device.id);
}

export function hasIncompleteDevices(
  drafts: DeviceDraft[],
  existing: Pick<FieldDevice, 'brand' | 'serial_number'>[] = [],
): boolean {
  const incompleteDraft = drafts.some((draft) => {
    const id = draft.id.trim();
    const brand = draft.brand.trim();
    const serial = draft.serial.trim();
    if (!id && !brand && !serial) {
      return false;
    }
    return !id || !brand || !serial;
  });

  const incompleteExisting = existing.some(
    (device) =>
      !(device.brand ?? '').trim() || !(device.serial_number ?? '').trim(),
  );

  return incompleteDraft || incompleteExisting;
}

function DeviceForm({
  id,
  brand,
  serial,
  idLocked,
  disabled,
  onId,
  onBrand,
  onSerial,
  onRemove,
}: {
  id: string;
  brand: string;
  serial: string;
  idLocked: boolean;
  disabled: boolean;
  onId?: (value: string) => void;
  onBrand: (value: string) => void;
  onSerial: (value: string) => void;
  onRemove?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.box}>
      <View style={styles.boxHeader}>
        <Text style={fieldStyles.label}>
          {t('settings.createField.deviceId')}
        </Text>
        {onRemove ? (
          <Pressable onPress={onRemove} disabled={disabled}>
            <Text style={styles.removeText}>
              {t('settings.createField.removeDevice')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <TextInput
        style={fieldStyles.input}
        value={id}
        onChangeText={onId}
        editable={!disabled && !idLocked}
        autoCapitalize="none"
        placeholder={t('settings.createField.deviceIdPlaceholder')}
        placeholderTextColor={Colors.light.textMuted}
      />
      <Text style={fieldStyles.label}>
        {t('settings.createField.deviceBrand')}
      </Text>
      <TextInput
        style={fieldStyles.input}
        value={brand}
        onChangeText={onBrand}
        editable={!disabled}
        placeholder={t('settings.createField.deviceBrandPlaceholder')}
        placeholderTextColor={Colors.light.textMuted}
      />
      <Text style={fieldStyles.label}>
        {t('settings.createField.deviceSerial')}
      </Text>
      <TextInput
        style={fieldStyles.input}
        value={serial}
        onChangeText={onSerial}
        editable={!disabled}
        autoCapitalize="none"
        placeholder={t('settings.createField.deviceSerialPlaceholder')}
        placeholderTextColor={Colors.light.textMuted}
      />
    </View>
  );
}

type Props = {
  later: boolean;
  onLaterChange: (later: boolean) => void;
  drafts: DeviceDraft[];
  onChange: (drafts: DeviceDraft[]) => void;
  existing?: FieldDevice[];
  onExistingChange?: (devices: FieldDevice[]) => void;
  onRemoveExisting?: (deviceId: string) => void;
  onSave?: () => void;
  mode?: 'create' | 'manage';
  disabled: boolean;
};

export function DeviceDraftFields({
  later,
  onLaterChange,
  drafts,
  onChange,
  existing = [],
  onExistingChange,
  onRemoveExisting,
  onSave,
  mode = 'create',
  disabled,
}: Props) {
  const { t } = useTranslation();
  const manage = mode === 'manage';

  function updateDraft(key: string, patch: Partial<DeviceDraft>) {
    onChange(
      drafts.map((draft) =>
        draft.key === key ? { ...draft, ...patch } : draft,
      ),
    );
  }

  function updateExisting(deviceId: string, patch: Partial<FieldDevice>) {
    onExistingChange?.(
      existing.map((device) =>
        device.id === deviceId ? { ...device, ...patch } : device,
      ),
    );
  }

  return (
    <View>
      {manage ? null : (
        <View style={styles.optionRow}>
          <Pressable
            style={[styles.option, later ? styles.optionOn : null]}
            onPress={() => onLaterChange(true)}
            disabled={disabled}
          >
            <Text
              style={[styles.optionText, later ? styles.optionTextOn : null]}
            >
              {t('settings.createField.configureLater')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.option, later ? null : styles.optionOn]}
            onPress={() => {
              onLaterChange(false);
              if (drafts.length === 0) {
                onChange([emptyDeviceDraft()]);
              }
            }}
            disabled={disabled}
          >
            <Text
              style={[styles.optionText, later ? null : styles.optionTextOn]}
            >
              {t('settings.createField.addNow')}
            </Text>
          </Pressable>
        </View>
      )}

      {later && !manage ? (
        <Text style={fieldStyles.subtitle}>
          {t('settings.createField.arduinosHint')}
        </Text>
      ) : (
        <>
          {existing.map((device) => (
            <DeviceForm
              key={device.id}
              id={device.id}
              brand={device.brand ?? ''}
              serial={device.serial_number ?? ''}
              idLocked
              disabled={disabled}
              onBrand={(brand) => updateExisting(device.id, { brand })}
              onSerial={(serial) =>
                updateExisting(device.id, { serial_number: serial })
              }
              onRemove={
                onRemoveExisting ? () => onRemoveExisting(device.id) : undefined
              }
            />
          ))}

          {drafts.map((draft) => (
            <DeviceForm
              key={draft.key}
              id={draft.id}
              brand={draft.brand}
              serial={draft.serial}
              idLocked={false}
              disabled={disabled}
              onId={(id) => updateDraft(draft.key, { id })}
              onBrand={(brand) => updateDraft(draft.key, { brand })}
              onSerial={(serial) => updateDraft(draft.key, { serial })}
              onRemove={() =>
                onChange(drafts.filter((item) => item.key !== draft.key))
              }
            />
          ))}

          <Pressable
            style={styles.addButton}
            onPress={() => onChange([...drafts, emptyDeviceDraft()])}
            disabled={disabled}
          >
            <Text style={styles.addText}>
              {t('settings.createField.addAnother')}
            </Text>
          </Pressable>

          {manage && onSave ? (
            <Pressable
              style={styles.saveButton}
              onPress={onSave}
              disabled={disabled}
            >
              <Text style={styles.saveText}>
                {t('settings.createField.saveDevices')}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}
