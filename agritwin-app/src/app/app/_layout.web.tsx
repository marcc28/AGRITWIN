import {
  Image,
  Pressable,
  Text,
  View,
  StyleSheet,
  useColorScheme,
  type ImageSourcePropType,
} from 'react-native';
import { usePathname } from 'expo-router';
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
        ]}
      >
        <Image source={icon} style={[styles.icon, { tintColor: tint }]} />
      </View>
      <Text
        style={[
          styles.label,
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
  const scheme = useColorScheme();
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
            ]}
          >
            <TabTrigger name="home" href="/app/home" asChild>
              <WebTabButton
                name="home"
                label="Inici"
                icon={require('@assets/images/tabIcons/home.png')}
              />
            </TabTrigger>
            <TabTrigger name="explore" href="/app/explore" asChild>
              <WebTabButton
                name="explore"
                label="Explorar"
                icon={require('@assets/images/tabIcons/explore.png')}
              />
            </TabTrigger>
            <TabTrigger name="market" href="/app/market" asChild>
              <WebTabButton
                name="market"
                label="Mercat"
                icon={require('@assets/images/tabIcons/market.png')}
              />
            </TabTrigger>
            <TabTrigger name="settings" href="/app/settings" asChild>
              <WebTabButton
                name="settings"
                label="Perfil"
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
    maxWidth: 360,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
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
  icon: {
    width: 22,
    height: 22,
  },
  label: {
    fontSize: 11,
  },
});
