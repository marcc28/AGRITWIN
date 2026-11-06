import { useEffect, useState } from 'react';
import { Pressable, Text, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/theme';
import { clearAuth, getAuth } from '@/services/auth';
import { isAuthError, type Field } from '@/services/api';
import {
  getCurrentField,
  setCurrentField,
  subscribeCurrentField,
} from '@/services/currentField';
import {
  getGardenPicker,
  loadGardenPickerFields,
  setGardenPicker,
  subscribeGardenPicker,
} from '@/services/gardenPicker';

export default function AppHeader() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  const [fields, setFields] = useState<Field[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [gardenName, setGardenName] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function applyStoredField() {
      const stored = await getCurrentField();
      if (cancelled) {
        return;
      }
      setCurrentId(stored?.id ?? null);
      setGardenName(stored?.name ?? '');
    }

    async function loadHeader() {
      const auth = await getAuth();
      if (cancelled) {
        return;
      }

      if (!auth?.token) {
        setFields([]);
        setCurrentId(null);
        setGardenName('');
        setPickerOpen(false);
        setGardenPicker({ open: false, fields: [], currentId: null });
        return;
      }

      // Start loading the picker list as soon as authentication is known.
      const fieldsPromise = loadGardenPickerFields();
      await applyStoredField();

      try {
        const gardens = await fieldsPromise;
        if (cancelled) {
          return;
        }
        setFields(gardens);
        setGardenPicker({ fields: gardens });

        const stored = await getCurrentField();
        const storedStillMine = gardens.some(
          (field) => field.id === stored?.id,
        );
        let next = storedStillMine ? stored : null;
        if (!next && gardens[0]) {
          next = { id: gardens[0].id, name: gardens[0].name };
        }

        if (next) {
          setCurrentId(next.id);
          setGardenName(next.name);
          if (!storedStillMine) {
            await setCurrentField(next);
          }
        } else {
          setCurrentId(null);
          setGardenName('');
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (isAuthError(error)) {
          await clearAuth();
          router.replace('/auth/login');
        }
      }
    }

    const unsubscribeField = subscribeCurrentField(() => {
      void applyStoredField();
    });
    const unsubscribePicker = subscribeGardenPicker(() => {
      const next = getGardenPicker();
      setPickerOpen(next.open);
      setFields(next.fields);
    });
    void loadHeader();

    return () => {
      cancelled = true;
      unsubscribeField();
      unsubscribePicker();
      setGardenPicker({ open: false });
    };
  }, []);

  function handleTogglePicker() {
    if (pickerOpen) {
      setPickerOpen(false);
      setGardenPicker({ open: false });
      return;
    }

    const cached = getGardenPicker().fields;
    setPickerOpen(true);
    setGardenPicker({ open: true, fields: cached, currentId });

    // Render the cached list immediately; refresh it without blocking the menu.
    loadGardenPickerFields(true).catch((error) => {
      if (isAuthError(error)) {
        void clearAuth().then(() => router.replace('/auth/login'));
      }
    });
  }

  const canSwitch = fields.length > 1;

  return (
    <View
      style={{
        alignSelf: 'stretch',
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        elevation: 2,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 20,
          fontWeight: '800',
          letterSpacing: 0.6,
          color: colors.primaryDark,
        }}
      >
        AGRITWIN
      </Text>

      {gardenName ? (
        <View>
          <Pressable
            onPress={() => void handleTogglePicker()}
            accessibilityRole="button"
            accessibilityLabel={gardenName}
            hitSlop={8}
            style={({ pressed }) => ({
              maxWidth: 160,
              marginLeft: 8,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: colors.surfaceSecondary,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              numberOfLines={1}
              style={{
                flexShrink: 1,
                fontSize: 12,
                fontWeight: '600',
                color: colors.text,
              }}
            >
              {gardenName}
            </Text>
            {canSwitch ? (
              <Ionicons
                name={pickerOpen ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.text}
                style={{ marginLeft: 4 }}
              />
            ) : null}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
