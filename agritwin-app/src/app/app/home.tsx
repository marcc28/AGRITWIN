import { StyleSheet, Text, View } from 'react-native';
import { currentUsername, accessToken } from '../../services/auth';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Benvingut a AgriTwin 🌱
      </Text>

      <Text style={styles.subtitle}>
        Aquí tindràs el resum de la teva explotació agrícola.
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },

  subtitle: {
    marginTop: 10,
    fontSize: 16,
  },

  info: {
    marginTop: 30,
  },

  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
  },

  value: {
    fontSize: 16,
    marginTop: 5,
  },

  token: {
    fontSize: 12,
    marginTop: 5,
  },
});