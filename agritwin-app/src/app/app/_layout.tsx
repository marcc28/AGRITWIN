import { Tabs, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { currentUsername, accessToken } from '../../services/auth';

export default function TabsLayout() {
  // Temporalment.
  // Més endavant vindrà de l'estat d'autenticació.
  const username = currentUsername;

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
            style={{
              marginRight: 16,
            }}
          >
            <Text style={{ fontSize: 24 }}>⚙️</Text>
          </Pressable>
        ),

        tabBarActiveTintColor: '#1089D3',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inici',
          tabBarLabel: 'Inici',
          tabBarIcon: () => <Text>🏠</Text>,
        }}
      />

      <Tabs.Screen
        name="fields"
        options={{
          title: 'Camps',
          tabBarLabel: 'Camps',
          tabBarIcon: () => <Text>🌱</Text>,
        }}
      />

      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasques',
          tabBarLabel: 'Tasques',
          tabBarIcon: () => <Text>📋</Text>,
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
