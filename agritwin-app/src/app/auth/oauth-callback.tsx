import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function SocialOAuthCallbackScreen() {
  const { provider } = useLocalSearchParams<{ provider: string }>();
  const label = provider === 'x' ? 'X' : 'Facebook';

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
      <ActivityIndicator size="large" />
      <Text>Finalitzant la sessió amb {label}...</Text>
    </View>
  );
}
