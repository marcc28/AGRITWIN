import {
  Image,
  Pressable,
  Text,
  View,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabTriggerSlotProps,
} from 'expo-router/ui';

import { Colors } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import GardenPickerOverlay from '@/components/GardenPickerOverlay';

function WebTabButton({
  name,
  label,
  icon,
  isFocused,
  ...props
}: TabTriggerSlotProps & {
  name: string;
  label: string;
  icon: ImageSourcePropType;
}) {
  const scheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  const compactLandscape = width > height && height < 600;
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const pathname = usePathname();
  const active = Boolean(isFocused) || pathname.startsWith(`/app/${name}`);
  const tint = active ? colors.primaryDark : colors.textMuted;

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tab, pressed ? styles.tabPressed : null]}
    >
      <View
        style={[
          styles.iconWrap,
          active
            ? {
                backgroundColor: colors.successBackground,
                borderColor: colors.successBorder,
              }
            : null,
          compactLandscape ? styles.iconWrapCompact : null,
        ]}
      >
        <Image
          source={icon}
          style={[
            styles.icon,
            compactLandscape ? styles.iconCompact : null,
            { tintColor: tint },
          ]}
        />
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          compactLandscape ? styles.labelCompact : null,
          {
            color: tint,
            fontWeight: active ? '800' : '500',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function WebLayout() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  const compactLandscape = width > height && height < 600;
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader />

      <View style={styles.body}>
        <Tabs style={styles.tabs}>
          <TabSlot style={styles.slot} />
          <TabList
            style={[
              styles.tabList,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
              },
              compactLandscape ? styles.tabListCompact : null,
            ]}
          >
            <TabTrigger name="home" href="/app/home" asChild>
              <WebTabButton
                name="home"
                label={t('tabs.home')}
                icon={require('@assets/images/tabIcons/home.png')}
              />
            </TabTrigger>
            <TabTrigger name="calendar" href="/app/calendar" asChild>
              <WebTabButton
                name="calendar"
                label={t('tabs.calendar')}
                icon={require('@assets/images/tabIcons/edit_calendar.png')}
              />
            </TabTrigger>
            <TabTrigger name="diagnosis" href="/app/diagnosis" asChild>
              <WebTabButton
                name="diagnosis"
                label={t('tabs.diagnosis')}
                icon={require('@assets/images/tabIcons/diagnosis.png')}
              />
            </TabTrigger>
            <TabTrigger name="clover" href="/app/clover" asChild>
              <WebTabButton
                name="clover"
                label={t('tabs.clover')}
                icon={require('@assets/images/tabIcons/clover.png')}
              />
            </TabTrigger>
            <TabTrigger name="market" href="/app/market" asChild>
              <WebTabButton
                name="market"
                label={t('tabs.market')}
                icon={require('@assets/images/tabIcons/market.png')}
              />
            </TabTrigger>
            <TabTrigger name="settings" href="/app/settings" asChild>
              <WebTabButton
                name="settings"
                label={t('tabs.profile')}
                icon={require('@assets/images/tabIcons/settings.png')}
              />
            </TabTrigger>
          </TabList>
        </Tabs>
      </View>

      <GardenPickerOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  tabs: {
    flex: 1,
  },
  slot: {
    flex: 1,
  },
  tabList: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  tabListCompact: {
    paddingTop: 3,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  tabPressed: {
    opacity: 0.75,
  },
  iconWrap: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconWrapCompact: {
    width: 40,
    height: 26,
  },
  icon: {
    width: 22,
    height: 22,
  },
  iconCompact: {
    width: 19,
    height: 19,
  },
  label: {
    fontSize: 11,
  },
  labelCompact: {
    fontSize: 10,
  },
});
