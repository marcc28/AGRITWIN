import { Text, View } from 'react-native';

import AppHeader from '@/components/AppHeader';
import { styles } from '../../styles/home.styles';

export default function HomeScreen() {
  return (
    <View style={styles.container}>

      <View style={{ flex: 1, padding: 20 }}>
        <Text style={styles.title}>
          Benvingut a AgriTwin 🌱
        </Text>

        <Text style={styles.subtitle}>
          Aquí tindràs el resum de la teva explotació agrícola.
        </Text>
      </View>
    </View>
  );
}