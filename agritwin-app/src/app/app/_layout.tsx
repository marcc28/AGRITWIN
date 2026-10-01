import { useEffect, useState } from 'react';
import { Tabs, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { getAuth } from '../../services/auth';

export default function TabsLayout() {
  const [username, setUsername] = useState('');

  useEffect(() => {
    let active = true;

    async function loadAuth() {
      try {
        const auth = await getAuth();

        if (!active) return;

        if (!auth?.token) {
          router.replace('/auth/login');
          return;
        }

        setUsername(auth.username ?? '');
      } catch (error) {
        console.error('Error recuperant la sessió');
        if (active) {
          router.replace('/auth/login');
        }
      }
    }

    loadAuth();

    return () => {
      active = false;
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: '',

        headerLeft: () => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginLeft: 16,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#1089D3',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: 'white',
                  fontWeight: 'bold',
                }}
              >
                {username.charAt(0).toUpperCase()}
              </Text>
            </View>

            <Text
              style={{
                marginLeft: 10,
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              {username}
            </Text>
          </View>
        ),

        headerRight: () => (
          <Pressable
            onPress={() => router.push('/app/settings')}
            style={{ marginRight: 16 }}
          >
            <Text style={{ fontSize: 24 }}>⚙️</Text>
          </Pressable>
        ),

        tabBarActiveTintColor: '#1089D3',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inici',
          tabBarLabel: 'Inici',
          tabBarIcon: () => <Text>🏠</Text>,
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorar',
          tabBarLabel: 'Explorar',
          tabBarIcon: () => <Text>🌱</Text>,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: 'Configuració',
        }}
      />
    </Tabs>
  );
}
