import { ScrollView, Text, View } from 'react-native';

import { styles } from '@/styles/home.styles';

export default function HomeScreen() {
  const today = new Date()
    .toLocaleDateString('ca', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    .toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View testID="home-screen" style={styles.content}>
          <Text style={styles.date}>{today}</Text>
          <Text style={styles.title}>El teu hort,{'\n'}cada dia millor.</Text>
          <Text style={styles.subtitle}>
            Tasques, temps i cultius adaptats al teu hort.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
