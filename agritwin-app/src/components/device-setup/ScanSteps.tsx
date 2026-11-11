import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { styles } from '@/styles/device-setup.styles';
import type { BleBoard } from '@/types/device-setup';

type ScanStepProps = Readonly<{
  boards: BleBoard[];
  /** True while the scan is running: shows the loading indicator. */
  searching: boolean;
  onSelect: (board: BleBoard) => void;
  onSearchAgain: () => void;
}>;

/** Searching for boards, and the list of boards found. */
export function ScanStep({
  boards,
  searching,
  onSelect,
  onSearchAgain,
}: ScanStepProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.centered}>
        <Ionicons
          name="bluetooth"
          size={32}
          color={Colors.light.primary}
          style={styles.statusIcon}
        />
        <Text style={styles.cardTitle}>{t('addDevice.scan.title')}</Text>
        <Text style={styles.cardText}>{t('addDevice.scan.instructions')}</Text>
      </View>

      {searching ? (
        <View style={styles.searchRow} testID="device-setup-searching">
          <ActivityIndicator color={Colors.light.primary} />
          <Text style={styles.searchText}>{t('addDevice.scan.searching')}</Text>
        </View>
      ) : null}

      {boards.length > 0 ? (
        <>
          <Text style={styles.listTitle}>{t('addDevice.scan.found')}</Text>
          {boards.map((board) => (
            <Pressable
              key={board.id}
              style={styles.boardRow}
              onPress={() => onSelect(board)}
              accessibilityRole="button"
            >
              <Text style={styles.boardName} numberOfLines={1}>
                {board.name}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.light.textMuted}
              />
            </Pressable>
          ))}
          <Text style={styles.hint}>{t('addDevice.scan.tapHint')}</Text>
        </>
      ) : null}

      {searching ? null : (
        <Pressable style={styles.secondaryButton} onPress={onSearchAgain}>
          <Text style={styles.secondaryText}>
            {t('addDevice.scan.searchAgain')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** No board found: retry, plus the tip for a board stuck in normal mode. */
export function NoBoardsStep({ onRetry }: Readonly<{ onRetry: () => void }>) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.centered}>
        <Ionicons
          name="search"
          size={32}
          color={Colors.light.textMuted}
          style={styles.statusIcon}
        />
        <Text style={styles.cardTitle}>{t('addDevice.noBoards.title')}</Text>
        <Text style={styles.cardText}>
          {t('addDevice.noBoards.instructions')}
        </Text>
      </View>
      <View style={styles.tipBox}>
        <Text style={styles.tipText}>{t('addDevice.noBoards.tip')}</Text>
      </View>
      <Pressable style={styles.primaryButton} onPress={onRetry}>
        <Text style={styles.primaryText}>{t('addDevice.noBoards.retry')}</Text>
      </Pressable>
    </View>
  );
}
