import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/result.styles';

export default function PaymentResultScreen() {
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setChecking(false);
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-circle" size={76} color="#2E8B57" />
        </View>

        <Text style={styles.title}>Gràcies per la teva compra!</Text>

        <Text style={styles.subtitle}>Hem rebut el retorn de Stripe.</Text>

        {checking ? (
          <Text style={styles.message}>Comprovant el pagament...</Text>
        ) : session_id ? (
          <View style={styles.statusBox}>
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color="#2E8B57"
            />
            <Text style={styles.statusText}>
              La sessió de pagament s'ha rebut correctament.
            </Text>
          </View>
        ) : (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle-outline" size={22} color="#B7791F" />
            <Text style={styles.warningText}>
              No hem rebut l'identificador de la sessió de Stripe.
            </Text>
          </View>
        )}

        <Text style={styles.message}>
          Gràcies per confiar en AgriTwin i donar suport als productors locals.
        </Text>

        <Pressable style={styles.button} onPress={() => router.replace('/')}>
          <Ionicons name="home-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Tornar a l'inici</Text>
        </Pressable>

        <Text style={styles.footer}>
          AgriTwin · Consum responsable, futur sostenible
        </Text>
      </View>
    </View>
  );
}
