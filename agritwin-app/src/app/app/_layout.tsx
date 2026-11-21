import { View, useColorScheme } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import GardenPickerOverlay from '@/components/GardenPickerOverlay';

import { useEffect } from 'react';
import { useCurrentField } from '@/hooks/use-current-field';
import { loadGardenPickerFields } from '@/services/gardenPicker';
import { prefetchAppData, prefetchFieldData } from '@/services/queries';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const field = useCurrentField();
  const fieldId = field?.id ?? null;

  useEffect(() => {
    loadGardenPickerFields().catch((error) => {
      console.error('Error carregant els camps:', error);
    });
  }, []);

  useEffect(() => {
    // Market, profile and crop types ready before their tab is opened.
    prefetchAppData(i18n.resolvedLanguage || i18n.language);
  }, [i18n, i18n.language]);

  useEffect(() => {
    // Everything the tabs show for the selected garden, loaded in advance.
    if (fieldId != null) {
      prefetchFieldData(fieldId, i18n.language);
    }
  }, [fieldId, i18n.language]);

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
          <NativeTabs.Trigger name="calendar">
            <NativeTabs.Trigger.Label>
              {t('tabs.calendar')}
            </NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              src={require('@assets/images/tabIcons/edit_calendar.png')}
              renderingMode="template"
            />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="diagnosis">
            <NativeTabs.Trigger.Label>
              {t('tabs.diagnosis')}
            </NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              src={require('@assets/images/tabIcons/diagnosis.png')}
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

          <NativeTabs.Trigger name="crops">
            <NativeTabs.Trigger.Label>
              {t('tabs.Crops')}
            </NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              src={require('@assets/images/brote.png')}
              renderingMode="template"
            />
          </NativeTabs.Trigger>
        </NativeTabs>
      </View>

      <GardenPickerOverlay />
    </View>
  );
}
