import React from 'react';
import { Image, Text, View } from 'react-native';

import type { MarketProduct } from '@/services/api_market';
import { styles } from '../../styles/product.styles';

type Props = {
  product: MarketProduct;
};

export default function ProductHeader({ product }: Props) {
  return (
    <>
      {product.image_url ? (
        <Image
          source={{ uri: product.image_url }}
          accessibilityLabel={`Imatge de ${product.product}`}
          resizeMode="cover"
          style={styles.productImage}
        />
      ) : null}

      <View style={styles.header}>
        <Text style={styles.eyebrow}>AGRITWIN · MERCAT</Text>
        <Text style={styles.title}>{product.product}</Text>
        <Text style={styles.description}>{product.tecnical_name}</Text>
      </View>
    </>
  );
}
