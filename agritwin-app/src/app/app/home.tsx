import { StyleSheet, Text, View } from 'react-native';

import { styles } from '../../styles/home.styles';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Benvingut a AgriTwin 🌱</Text>

      <Text style={styles.subtitle}>
        Aquí tindràs el resum de la teva explotació agrícola.
      </Text>
    </View>
  );
}

