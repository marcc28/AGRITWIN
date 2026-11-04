import { View, useColorScheme } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import GardenPickerOverlay from '@/components/GardenPickerOverlay';

export default function Layout() {
  const { t } = useTranslation();
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
            <NativeTabs.Trigger.Label>
              {t('tabs.home')}
            </NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              src={require('@assets/images/tabIcons/home.png')}
              renderingMode="template"
            />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="edit_calendar">
            <NativeTabs.Trigger.Label>
              {t('tabs.explore')}
            </NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              src={require('@assets/images/tabIcons/edit_calendar.png')}
              renderingMode="template"
            />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="clover">
            <NativeTabs.Trigger.Label>
              {t('tabs.clover')}
            </NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              src={require('@assets/images/tabIcons/clover.png')}
              renderingMode="template"
            />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="market">
            <NativeTabs.Trigger.Label>
              {t('tabs.market')}
            </NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              src={require('@assets/images/tabIcons/market.png')}
              renderingMode="template"
            />
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="settings">
            <NativeTabs.Trigger.Label>
              {t('tabs.profile')}
            </NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              src={require('@assets/images/tabIcons/settings.png')}
              renderingMode="template"
            />
          </NativeTabs.Trigger>
        </NativeTabs>
      </View>

      <GardenPickerOverlay />
    </View>
  );
}
