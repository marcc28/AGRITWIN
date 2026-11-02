import React from 'react';
import { Text, View } from 'react-native';

import { styles } from '../../styles/product.styles';

type Props = {
  unitPrice: number;
  available: number;
  outOfStock: boolean;
};

function formatPrice(value: number) {
  return `${value.toFixed(2).replace('.', ',')} €`;
}

export default function ProductPrice({
  unitPrice,
  available,
  outOfStock,
}: Props) {
  return (
    <View style={styles.priceSection}>
      <View style={styles.priceInfo}>
        <Text style={styles.priceLabel}>PREU DEL PRODUCTE</Text>
        <Text style={styles.price}>{formatPrice(unitPrice)}</Text>
        <Text style={styles.priceUnit}>per kg</Text>
      </View>

      <View style={[styles.stockBadge, outOfStock && styles.stockBadgeEmpty]}>
        <View style={[styles.stockDot, outOfStock && styles.stockDotEmpty]} />

        <Text style={styles.stockText}>
          {outOfStock ? 'Sense estoc' : `${available} disponibles`}
        </Text>
      </View>
    </View>
  );
}
