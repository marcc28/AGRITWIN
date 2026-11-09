import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { styles } from '../../styles/product.styles';

type Props = {
  quantity: number;
  available: number;
  outOfStock: boolean;
  onChange: React.Dispatch<React.SetStateAction<number>>;
};

export default function ProductQuantity({
  quantity,
  available,
  outOfStock,
  onChange,
}: Props) {
  const cannotDecrease = quantity <= 1;
  const cannotIncrease = quantity >= available || outOfStock;

  return (
    <View style={styles.quantityPanel}>
      <View style={styles.quantityHeader}>
        <View>
          <Text style={styles.quantityTitle}>Quantitat</Text>
          <Text style={styles.quantityHint}>Selecciona els kg que vols</Text>
        </View>

        <Text style={styles.quantityUnit}>kg</Text>
      </View>

      <View style={styles.quantityRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reduir quantitat"
          style={[
            styles.quantityButton,
            cannotDecrease && styles.disabledButton,
          ]}
          disabled={cannotDecrease}
          onPress={() => onChange((current) => Math.max(1, current - 1))}
        >
          <Text style={styles.quantityButtonText}>−</Text>
        </Pressable>

        <View style={styles.quantityValueContainer}>
          <Text style={styles.quantityValue}>{quantity}</Text>
          <Text style={styles.quantityValueUnit}>kg</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Augmentar quantitat"
          style={[
            styles.quantityButton,
            cannotIncrease && styles.disabledButton,
          ]}
          disabled={cannotIncrease}
          onPress={() =>
            onChange((current) => Math.min(available, current + 1))
          }
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}
