import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { getDashboard, type Dashboard } from '../../services/api';
import { styles } from '../../styles/home.styles';

export default function HomeScreen() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

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

    loadDashboard();
  }, []);

  return (
    <View style={styles.container}>
      <View testID="home-screen" style={styles.content}>
        <Text style={styles.title}>Benvingut a AgriTwin 🌱</Text>

        <Text style={styles.subtitle}>
          Aquí tindràs el resum de la teva explotació agrícola.
        </Text>

        {errorMessage ? (
          <Text style={styles.subtitle}>{errorMessage}</Text>
        ) : null}

        {dashboard && dashboard.device_id === null ? (
          <Text style={styles.subtitle}>Encara no tens cap dispositiu.</Text>
        ) : null}

        {dashboard &&
        dashboard.device_id !== null &&
        dashboard.latest === null ? (
          <Text style={styles.subtitle}>Encara no hi ha cap lectura.</Text>
        ) : null}

        {dashboard && dashboard.latest ? (
          <View style={styles.info}>
            <Text style={styles.label}>Dispositiu</Text>
            <Text style={styles.value}>{dashboard.device_id}</Text>

            <Text style={styles.label}>Última lectura</Text>
            <Text style={styles.value}>
              {new Date(dashboard.latest.timestamp).toLocaleString('ca')}
            </Text>

            <Text style={styles.label}>Temperatura</Text>
            <Text style={styles.value}>{dashboard.latest.temperature} °C</Text>

            <Text style={styles.label}>Humitat de l’aire</Text>
            <Text style={styles.value}>{dashboard.latest.air_humidity} %</Text>

            <Text style={styles.label}>Humitat del sòl</Text>
            <Text style={styles.value}>{dashboard.latest.soil_humidity} %</Text>

            <Text style={styles.label}>Llum</Text>
            <Text style={styles.value}>{dashboard.latest.light} lux</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
