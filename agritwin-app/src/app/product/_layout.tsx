import { useEffect } from 'react';
import { BackHandler, Platform, Pressable, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import StripeProvider from '../../components/stripe-provider';
import { Colors } from '../../constants/theme';

export default function ProductLayout() {
  const router = useRouter();
  const { t } = useTranslation();
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        router.dismissTo('/app/market');
        return true;
      },
    );
    return () => subscription.remove();
  }, [router]);
  return (
    <StripeProvider>
      <Stack>
        <Stack.Screen
          name="[id]"
          options={{
            title: t('market.detail.eyebrow'),
            headerStyle: { backgroundColor: Colors.light.background },
            headerTintColor: Colors.light.primaryDark,
            headerBackVisible: false,
            headerLeft: () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('market.detail.back')}
                onPress={() => router.dismissTo('/app/market')}
                hitSlop={8}
                style={{
                  minHeight: 44,
                  justifyContent: 'center',
                  paddingRight: 16,
                }}
              >
                <Text style={{ color: Colors.light.primaryDark, fontSize: 15 }}>
                  ‹ {t('market.detail.back')}
                </Text>
              </Pressable>
            ),
          }}
        />
      </Stack>
    </StripeProvider>
  );
}
