import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { styles } from '@/styles/device-setup.styles';

type WifiFormStepProps = Readonly<{
  boardName: string;
  ssid: string;
  password: string;
  onSsidChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  /** The `onConnect(name, password)` of the form. */
  onConnect: () => void;
}>;

/** Wi-Fi name and password. Nothing is saved: it only lives in this state. */
export function WifiFormStep({
  boardName,
  ssid,
  password,
  onSsidChange,
  onPasswordChange,
  onConnect,
}: WifiFormStepProps) {
  const { t } = useTranslation();
  const [passwordShown, setPasswordShown] = useState(false);
  const canConnect = ssid.trim().length > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('addDevice.wifi.title')}</Text>
      <Text style={styles.cardText}>
        {t('addDevice.wifi.board', { name: boardName })}
      </Text>

      <Text style={styles.label}>{t('addDevice.wifi.ssid')}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={ssid}
          onChangeText={onSsidChange}
          placeholder={t('addDevice.wifi.ssidPlaceholder')}
          placeholderTextColor={Colors.light.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Text style={styles.label}>{t('addDevice.wifi.password')}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={onPasswordChange}
          placeholder={t('addDevice.wifi.passwordPlaceholder')}
          placeholderTextColor={Colors.light.textMuted}
          secureTextEntry={!passwordShown}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          style={styles.eyeButton}
          onPress={() => setPasswordShown((shown) => !shown)}
          accessibilityLabel={
            passwordShown
              ? t('addDevice.wifi.hidePassword')
              : t('addDevice.wifi.showPassword')
          }
        >
          <Ionicons
            name={passwordShown ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={Colors.light.textMuted}
          />
        </Pressable>
      </View>

      <Text style={styles.hint}>{t('addDevice.wifi.hint24')}</Text>
      <Text style={styles.hint}>{t('addDevice.wifi.privacy')}</Text>

      <Pressable
        style={[
          styles.primaryButton,
          canConnect ? null : styles.primaryButtonDisabled,
        ]}
        onPress={onConnect}
        disabled={!canConnect}
      >
        <Text style={styles.primaryText}>{t('addDevice.wifi.connect')}</Text>
      </Pressable>
    </View>
  );
}

/** Loading screen: connecting to the board, testing the Wi-Fi, saving. */
export function ProgressStep({
  title,
  hint,
}: Readonly<{ title: string; hint?: string }>) {
  return (
    <View style={styles.card} testID="device-setup-progress">
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={[styles.cardTitle, styles.progressTitle]}>{title}</Text>
        {hint ? <Text style={styles.cardText}>{hint}</Text> : null}
      </View>
    </View>
  );
}
