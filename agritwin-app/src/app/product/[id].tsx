import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { getMarketProduct, type MarketProduct } from '@/services/api';

import { styles } from '../../styles/product.styles';

export default function ProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();

  const productId = Array.isArray(id) ? id[0] : id;

  const [product, setProduct] = useState<MarketProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      setLoading(true);
      setError(null);
      setProduct(null);
      setQuantity(1);

      try {
        if (!productId) {
          throw new Error('No s’ha indicat cap producte.');
        }

        const data = await getMarketProduct(String(productId));

        if (active) {
          setProduct(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'No s’ha pogut carregar el producte.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [productId]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />

        <View style={styles.card}>
          <Text style={styles.title}>Carregant producte...</Text>

          <Text style={styles.description}>
            Estem obtenint les dades del mercat.
          </Text>
        </View>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />

        <View style={styles.card}>
          <Text style={styles.title}>Producte no disponible</Text>

          <Text style={styles.description}>
            {error ?? 'No s’han pogut carregar les dades del producte.'}
          </Text>

          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Tornar a la pantalla anterior"
          >
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backButtonText}>Tornar al mercat</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const available = Math.max(
    0,
    Math.floor(Number(product.left_units) || 0),
  );

  const unitPrice = Number(product.price_per_kg) || 0;
  const total = unitPrice * quantity;
  const outOfStock = available < 1;

  const formatPrice = (value: number) =>
    `${value.toFixed(2).replace('.', ',')} €`;

  const handleBuy = () => {
    Alert.alert(
      'Compra',
      'Cal connectar aquesta acció amb l’API de compra.',
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Decoració superior */}
          <View pointerEvents="none" style={styles.decoration}>
            <View style={styles.decorCircleLarge} />
            <View style={styles.decorCircleSmall} />
            <View style={styles.decorCircleTiny} />
          </View>

          <View style={styles.topLine} />

          {/* Capçalera del producte */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>AGRITWIN · MERCAT</Text>

            <Text style={styles.title}>{product.product}</Text>

            <Text style={styles.description}>
              {product.tecnical_name}
            </Text>
          </View>

          {/* Preu i disponibilitat */}
          <View style={styles.priceSection}>
            <View style={styles.priceInfo}>
              <Text style={styles.priceLabel}>PREU DEL PRODUCTE</Text>

              <Text style={styles.price}>
                {formatPrice(unitPrice)}
              </Text>

              <Text style={styles.priceUnit}>per kg</Text>
            </View>

            <View
              style={[
                styles.stockBadge,
                outOfStock && styles.stockBadgeEmpty,
              ]}
            >
              <View
                style={[
                  styles.stockDot,
                  outOfStock && styles.stockDotEmpty,
                ]}
              />

              <Text style={styles.stockText}>
                {outOfStock
                  ? 'Sense estoc'
                  : `${available} disponibles`}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Informació essencial */}
          <View style={styles.infoPanel}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Text style={styles.infoIconText}>
                  {outOfStock ? '!' : '✓'}
                </Text>
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>
                  Disponibilitat del producte
                </Text>

                <Text style={styles.infoValue}>
                  {outOfStock
                    ? 'Actualment no disponible'
                    : 'Disponible per comprar'}
                </Text>
              </View>
            </View>
          </View>

          {/* Comanda */}
          <Text style={styles.sectionTitle}>La teva comanda</Text>

          <View style={styles.quantityPanel}>
            <View style={styles.quantityHeader}>
              <View>
                <Text style={styles.quantityTitle}>Quantitat</Text>

                <Text style={styles.quantityHint}>
                  Selecciona els kg que vols
                </Text>
              </View>

              <Text style={styles.quantityUnit}>kg</Text>
            </View>

            <View style={styles.quantityRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reduir quantitat"
                style={[
                  styles.quantityButton,
                  quantity <= 1 && styles.disabledButton,
                ]}
                disabled={quantity <= 1}
                onPress={() =>
                  setQuantity((current) => Math.max(1, current - 1))
                }
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
                  (quantity >= available || outOfStock) &&
                    styles.disabledButton,
                ]}
                disabled={quantity >= available || outOfStock}
                onPress={() =>
                  setQuantity((current) =>
                    Math.min(available, current + 1),
                  )
                }
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* Resum del preu */}
          <View style={styles.totalPanel}>
            <View>
              <Text style={styles.totalLabel}>
                TOTAL DE LA COMANDA
              </Text>

              <Text style={styles.totalHint}>
                {quantity} kg × {unitPrice.toFixed(2).replace('.', ',')} €/kg
              </Text>
            </View>

            <Text style={styles.totalPrice}>
              {formatPrice(total)}
            </Text>
          </View>

          {/* Botó de compra */}
          <Pressable
            style={({ pressed }) => [
              styles.buyButton,
              outOfStock && styles.buyButtonDisabled,
              pressed && !outOfStock && styles.buyButtonPressed,
            ]}
            disabled={outOfStock}
            onPress={handleBuy}
            accessibilityRole="button"
            accessibilityLabel={
              outOfStock ? 'Producte esgotat' : 'Comprar ara'
            }
          >
            <Text style={styles.buyButtonText}>
              {outOfStock ? 'Producte esgotat' : 'Comprar ara  →'}
            </Text>
          </Pressable>

          {/* Tornar al mercat */}
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Tornar al mercat"
          >
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backButtonText}>Tornar al mercat</Text>
          </Pressable>

          <Text style={styles.footerText}>
            AgriTwin · Agricultura intel·ligent
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
