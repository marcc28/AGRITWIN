import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { SensorCard } from '@/components/SensorCard';
import { SensorModal } from '@/components/SensorModal';
import { getDashboard, type Dashboard } from '@/services/api';
import { styles } from '@/styles/home.styles';

export default function HomeScreen() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await getDashboard();
        setDashboard(data);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'No s’ha pogut carregar el dashboard';

        setErrorMessage(message);
      }
    }

    void loadDashboard();
  }, []);

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

          <SensorCard
            dashboard={dashboard}
            errorMessage={errorMessage}
            onPress={() => setModalVisible(true)}
          />
        </View>
      </ScrollView>

      {dashboard && dashboard.latest ? (
        <SensorModal
          visible={modalVisible}
          dashboard={dashboard}
          latest={dashboard.latest}
          onClose={() => setModalVisible(false)}
        />
      ) : null}
    </View>
  );
}
