import { useEffect, useState } from 'react';
import { Pressable, Text, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import DeviceStatusDot from '@/components/DeviceStatusDot';
import {
  DEVICE_HEALTH_LABEL,
  deviceHealthFromCounts,
} from '@/services/deviceHealth';
import { clearAuth } from '@/services/auth';
import { setCurrentField } from '@/services/currentField';
import {
  getGardenPicker,
  setGardenPicker,
  subscribeGardenPicker,
} from '@/services/gardenPicker';
import type { Field } from '@/services/api';

async function selectGarden(field: Field) {
  // Tanquem el selector immediatament
  setGardenPicker({
    open: false,
    currentId: field.id,
  });

  // Després desem el camp seleccionat
  try {
    await setCurrentField({
      id: field.id,
      name: field.name,
    });
  } catch (error) {
    console.error('Error seleccionant el camp:', error);
  }
}

function openFromPicker(path: '/field-selection' | '/profile') {
  setGardenPicker({ open: false });
  router.push(path);
}

async function logoutFromPicker() {
  setGardenPicker({ open: false });
  await clearAuth();
  router.replace('/auth/login');
}

const PICKER_LINKS = [
  {
    testID: 'garden-picker-all',
    icon: 'grid-outline',
    labelKey: 'fieldSelection.allGardens',
    danger: false,
    onPress: () => openFromPicker('/field-selection'),
  },
  {
    testID: 'garden-picker-profile',
    icon: 'person-circle-outline',
    labelKey: 'fieldSelection.profile',
    danger: false,
    onPress: () => openFromPicker('/profile'),
  },
  {
    testID: 'garden-picker-logout',
    icon: 'log-out-outline',
    labelKey: 'settings.logout',
    danger: true,
    onPress: () => void logoutFromPicker(),
  },
] as const;

export default function GardenPickerOverlay() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [picker, setPicker] = useState(getGardenPicker);

  useEffect(() => {
    const unsubscribe = subscribeGardenPicker(() => {
      setPicker(getGardenPicker());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  if (!picker.open || picker.fields.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 50,
      }}
    >
      <Pressable
        testID="garden-picker-backdrop"
        onPress={() => setGardenPicker({ open: false })}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: insets.top + 60,
          right: 16,
          minWidth: 200,
          maxWidth: 260,
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: 4,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        {picker.fields.map((field) => {
          const selected = field.id === picker.currentId;
          return (
            <Pressable
              key={field.id}
              onPress={() => void selectGarden(field)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: selected
                  ? colors.surfaceSecondary
                  : 'transparent',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {field.devices_online == null ? null : (
                <View
                  accessible
                  accessibilityLabel={t(
                    DEVICE_HEALTH_LABEL[
                      deviceHealthFromCounts(
                        field.device_count,
                        field.devices_online,
                      )
                    ],
                  )}
                  style={{ marginRight: 8 }}
                >
                  <DeviceStatusDot
                    health={deviceHealthFromCounts(
                      field.device_count,
                      field.devices_online,
                    )}
                  />
                </View>
              )}
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  marginRight: 8,
                  fontSize: 14,
                  fontWeight: selected ? '700' : '500',
                  color: colors.text,
                }}
              >
                {field.name}
              </Text>
              {selected ? (
                <Ionicons name="checkmark" size={16} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
        {PICKER_LINKS.map((link, index) => (
          <Pressable
            key={link.testID}
            testID={link.testID}
            onPress={link.onPress}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 10,
              opacity: pressed ? 0.7 : 1,
              ...(index === 0
                ? {
                    marginTop: 4,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }
                : {}),
            })}
          >
            <Ionicons
              name={link.icon}
              size={16}
              color={link.danger ? colors.dangerText : colors.primary}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: '600',
                color: link.danger ? colors.dangerText : colors.primary,
              }}
            >
              {t(link.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
