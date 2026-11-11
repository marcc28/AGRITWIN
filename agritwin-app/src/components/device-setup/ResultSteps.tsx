import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { styles } from '@/styles/device-setup.styles';
import type { ProvisioningErrorCode } from '@/types/device-setup';

import { errorGroup, needsSettings } from './errorGroups';

/** The board is connected and linked to the field. */
export function SuccessStep({
  alreadyLinked,
  onDone,
}: Readonly<{ alreadyLinked: boolean; onDone: () => void }>) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.centered}>
        <Ionicons
          name="checkmark-circle"
          size={48}
          color="#2F9E44"
          style={styles.statusIcon}
        />
        <Text style={styles.cardTitle}>{t('addDevice.success.title')}</Text>
        <Text style={styles.cardText}>
          {alreadyLinked
            ? t('addDevice.success.alreadyLinked')
            : t('addDevice.success.hint')}
        </Text>
      </View>
      <Pressable style={styles.primaryButton} onPress={onDone}>
        <Text style={styles.primaryText}>{t('addDevice.success.done')}</Text>
      </Pressable>
    </View>
  );
}

type ErrorStepProps = Readonly<{
  code: ProvisioningErrorCode | null;
  onRetry: () => void;
  onClose: () => void;
  onOpenSettings: () => void;
}>;

/** Something failed: one message per kind of error, and a retry button. */
export function ErrorStep({
  code,
  onRetry,
  onClose,
  onOpenSettings,
}: ErrorStepProps) {
  const { t } = useTranslation();
  const group = errorGroup(code);

  return (
    <View style={styles.card}>
      <View style={styles.centered}>
        <Ionicons
          name="alert-circle"
          size={48}
          color={Colors.light.dangerText}
          style={styles.statusIcon}
        />
        <Text style={[styles.cardTitle, styles.errorTitle]}>
          {t(`addDevice.error.groups.${group}.title`)}
        </Text>
        <Text style={styles.cardText}>
          {t(`addDevice.error.groups.${group}.hint`)}
        </Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={onRetry}>
        <Text style={styles.primaryText}>{t('addDevice.error.retry')}</Text>
      </Pressable>

      {needsSettings(group) ? (
        <Pressable style={styles.secondaryButton} onPress={onOpenSettings}>
          <Text style={styles.secondaryText}>
            {t('addDevice.error.openSettings')}
          </Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.secondaryButton} onPress={onClose}>
        <Text style={styles.secondaryText}>{t('addDevice.error.back')}</Text>
      </Pressable>
    </View>
  );
}
