import { useEffect, useState } from 'react';
import { Pressable, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { getAuth } from '@/services/auth';

export default function AppHeader() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState('');

  useEffect(() => {
    async function loadAuth() {
      try {
        const auth = await getAuth();
        setUsername(auth?.username ?? '');
      } catch (error) {
        console.error('Error recuperant la sessió', error);
      }
    }

    loadAuth();
  }, []);

  const initial = username ? username.charAt(0).toUpperCase() : '?';

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
      {/* Usuari */}
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.surface, fontSize: 18, fontWeight: 'bold' }}>
            {initial}
          </Text>
        </View>

        <View style={{ marginLeft: 12, flexShrink: 1 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Benvingut</Text>
          <Text
            style={{ fontSize: 17, fontWeight: '600', color: colors.text }}
            numberOfLines={1}
          >
            {username || 'Usuari'}
          </Text>
        </View>
      </View>

      {/* Configuració */}
      <Pressable
        onPress={() => router.push('/app/settings')}
        accessibilityRole="button"
        accessibilityLabel="Configuració"
        hitSlop={8}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: 22,
          marginLeft: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceSecondary,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name="settings-outline" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}