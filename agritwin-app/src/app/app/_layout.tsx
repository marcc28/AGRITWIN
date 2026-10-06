import { View, useColorScheme } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';

export default function Layout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* A dalt */}
      <AppHeader />

      {/* Contingut + tabs a baix */}
      <View style={{ flex: 1 }}>
        <NativeTabs
          backgroundColor={colors.surface}
          indicatorColor={colors.primary}
          labelStyle={{
            selected: { color: colors.primary },
          }}
        >
          <NativeTabs.Trigger name="home">
            <NativeTabs.Trigger.Label>Inici</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              src={require('@/assets/images/tabIcons/home.png')}
              renderingMode="template"
            />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="explore">
            <NativeTabs.Trigger.Label>Explorar</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              src={require('@/assets/images/tabIcons/explore.png')}
              renderingMode="template"
            />
          </NativeTabs.Trigger>
          
          <NativeTabs.Trigger name="market">
            <NativeTabs.Trigger.Label>Mercat</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              src={require('@/assets/images/tabIcons/market.png')}
              renderingMode="template"
            />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="settings">
            <NativeTabs.Trigger.Label>Configuració</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              src={require('@/assets/images/tabIcons/settings.png')}
              renderingMode="template"
            />
          </NativeTabs.Trigger>
        </NativeTabs>
      </View>
    </View>
  );
}
