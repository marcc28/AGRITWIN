import { useEffect, useState } from 'react';
import { Pressable, Text, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { setCurrentField } from '@/services/currentField';
import {
  getGardenPicker,
  setGardenPicker,
  subscribeGardenPicker,
} from '@/services/gardenPicker';
import type { Field } from '@/services/api';

export default function GardenPickerOverlay() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const [picker, setPicker] = useState(getGardenPicker);

  useEffect(() => {
    return subscribeGardenPicker(() => {
      setPicker(getGardenPicker());
    });
  }, []);

  if (!picker.open || picker.fields.length <= 1) {
    return null;
  }

  async function handleSelect(field: Field) {
    await setCurrentField({ id: field.id, name: field.name });
    setGardenPicker({ open: false, currentId: field.id });
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
              onPress={() => void handleSelect(field)}
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
      </View>
    </View>
  );
}
