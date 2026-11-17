import React from 'react';
import { Text, View } from 'react-native';

import { Colors } from '../../constants/theme';
import { getProductStyles } from '../../styles/product.styles';

const styles = getProductStyles(Colors.light);

type Props = {
  quantity: number;
  unitPrice: number;
  total: number;
};

function formatPrice(value: number) {
  return `${value.toFixed(2).replace('.', ',')} €`;
}

export default function ProductTotal({ quantity, unitPrice, total }: Props) {
  return (
    <View style={styles.totalPanel}>
      <View>
        <Text style={styles.totalLabel}>TOTAL DE LA COMANDA</Text>
        <Text style={styles.totalHint}>
          {quantity} kg × {unitPrice.toFixed(2).replace('.', ',')} €/kg
        </Text>
      </View>

      <Text style={styles.totalPrice}>{formatPrice(total)}</Text>
    </View>
  );
}
