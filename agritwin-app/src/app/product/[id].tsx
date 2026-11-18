import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { type MarketProduct } from '@/services/api_market';
import { useCachedQuery } from '@/hooks/use-cached-query';
import {
  findProductInMarketPages,
  marketProductQuery,
} from '@/services/queries';

import CheckoutForm from '@/components/checkout-form';
import { Colors } from '../../constants/theme';
import { getProductStyles } from '../../styles/product.styles';

type ProductStyles = ReturnType<typeof getProductStyles>;

function ProductUnavailable({
  message,
  onBack,
  styles,
}: {
  message: string;
  onBack: () => void;
  styles: ProductStyles;
}) {
  return (
    <View style={[styles.screen, { justifyContent: 'center' }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Producte no disponible</Text>

          <Text style={styles.description}>{message}</Text>

          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Tornar al mercat"
          >
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backButtonText}>Tornar al mercat</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function ProductScreen() {
  const router = useRouter();

  const { width, height } = useWindowDimensions();

  const styles = getProductStyles(Colors.light, width, height);

  const { id } = useLocalSearchParams<{
    id: string | string[];
  }>();

  const productId = Array.isArray(id) ? id[0] : id;

  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState('1');
  const formatQuantity = (value: number) =>
    Number(value.toFixed(2)).toString().replace('.', ',');

  // Shown at once from the cache (or from the market list it was opened
  // from); price and stock are always refreshed from the server.
  const result = useCachedQuery({
    ...marketProductQuery(String(productId)),
    enabled: !!productId,
    placeholderData: () =>
      productId ? findProductInMarketPages(String(productId)) : undefined,
  });

  const product: MarketProduct | null = result.data ?? null;
  const loading = !!productId && result.data === undefined && !result.isError;
  let error: string | null = null;
  if (!productId) {
    error = 'No s’ha indicat cap producte.';
  } else if (!product && result.isError) {
    error =
      result.error instanceof Error
        ? result.error.message
        : 'No s’ha pogut carregar el producte.';
  }

  useEffect(() => {
    setQuantity(1);
    setQuantityInput('1');
  }, [productId]);

  // The starting quantity depends on the stock: it is set once per product,
  // from the server's answer (not from the copy shown while it loads).
  const quantityFor = useRef<string | null>(null);
  useEffect(() => {
    if (!product || result.isPlaceholderData) {
      return;
    }
    const key = String(productId);
    if (quantityFor.current === key) {
      return;
    }
    quantityFor.current = key;
    const stock = Number(product.left_units);
    const initialQuantity = Number.isFinite(stock)
      ? Math.min(1, Math.max(0.01, Math.floor(stock * 100) / 100))
      : 1;
    setQuantity(initialQuantity);
    setQuantityInput(formatQuantity(initialQuantity));
  }, [product, productId, result.isPlaceholderData]);

  const handleBack = () => router.back();

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center' }]}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>AGRITWIN · MERCAT</Text>

            <Text style={styles.title}>Carregant producte...</Text>

            <Text style={styles.description}>
              Estem obtenint les dades del mercat.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (error !== null) {
    return (
      <ProductUnavailable message={error} onBack={handleBack} styles={styles} />
    );
  }

  if (product === null) {
    return (
      <ProductUnavailable
        message="No s’han pogut carregar les dades del producte."
        onBack={handleBack}
        styles={styles}
      />
    );
  }

  const rawAvailable = Number(product.left_units);
  const available = Number.isFinite(rawAvailable)
    ? Math.max(0, Math.floor(rawAvailable * 100) / 100)
    : 0;
  const maxQuantity = Math.min(available, 20);

  const unitPrice = Number(product.price_per_kg) || 0;
  const total = unitPrice * quantity;
  const outOfStock = maxQuantity < 0.01;

  const handleQuantityInput = (value: string) => {
    if (!/^\d*(?:[.,]\d{0,2})?$/.test(value)) return;

    setQuantityInput(value);
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= 0.01 && parsed <= maxQuantity) {
      setQuantity(parsed);
    }
  };

  const commitQuantityInput = () => {
    const parsed = Number(quantityInput.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= 0.01) {
      const nextQuantity = Math.min(maxQuantity, parsed);
      if (nextQuantity >= 0.01) setQuantity(nextQuantity);
      setQuantityInput(formatQuantity(nextQuantity));
      return;
    }

    setQuantityInput(formatQuantity(quantity));
  };

  const changeQuantity = (nextQuantity: number) => {
    const boundedQuantity = Number(
      Math.min(maxQuantity, Math.max(0.01, nextQuantity)).toFixed(2),
    );
    setQuantity(boundedQuantity);
    setQuantityInput(formatQuantity(boundedQuantity));
  };

  const formatPrice = (value: number) =>
    `${value.toFixed(2).replace('.', ',')} €`;

  const incrementDisabled = outOfStock || quantity >= maxQuantity;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Decoració */}
          <View pointerEvents="none" style={styles.decoration}>
            <View style={styles.decorCircleLarge} />
            <View style={styles.decorCircleSmall} />
            <View style={styles.decorCircleTiny} />
          </View>

          <View style={styles.topLine} />

          <View style={styles.hero}>
            {/* Imatge */}
            {product.image_url ? (
              <Image
                source={{ uri: product.image_url }}
                accessibilityLabel={`Imatge de ${product.product}`}
                resizeMode="cover"
                style={styles.productImage}
              />
            ) : null}

            {/* Capçalera */}
            <View style={styles.header}>
              <Text style={styles.eyebrow}>AGRITWIN · MERCAT</Text>

              <Text style={styles.title}>{product.product}</Text>

              {!!product.tecnical_name && (
                <Text style={styles.description}>{product.tecnical_name}</Text>
              )}
            </View>
          </View>

          {/* Preu i disponibilitat */}
          <View style={styles.priceSection}>
            <View style={styles.priceInfo}>
              <Text style={styles.priceLabel}>PREU DEL PRODUCTE</Text>

              <Text style={styles.price}>{formatPrice(unitPrice)}</Text>

              <Text style={styles.priceUnit}>per kg</Text>
            </View>

            <View
              style={[styles.stockBadge, outOfStock && styles.stockBadgeEmpty]}
            >
              <View
                style={[styles.stockDot, outOfStock && styles.stockDotEmpty]}
              />

              <Text
                style={[styles.stockText, outOfStock && styles.stockTextEmpty]}
              >
                {outOfStock
                  ? 'Sense estoc'
                  : `${formatQuantity(available)} kg disponibles`}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Informació */}
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

                <Text
                  style={[
                    styles.infoValue,
                    outOfStock && styles.infoValueEmpty,
                  ]}
                >
                  {outOfStock
                    ? 'Actualment no disponible'
                    : 'Disponible per comprar'}
                </Text>
              </View>
            </View>
          </View>

          {/* Quantitat */}
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
                disabled={quantity <= 0.01}
                style={[
                  styles.quantityButton,
                  quantity <= 0.01 && styles.disabledButton,
                ]}
                onPress={() => changeQuantity(quantity - 0.25)}
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </Pressable>

              <View style={styles.quantityValueContainer}>
                <TextInput
                  accessibilityLabel="Quantitat en quilograms"
                  keyboardType="decimal-pad"
                  value={quantityInput}
                  editable={!outOfStock}
                  selectTextOnFocus
                  onChangeText={handleQuantityInput}
                  onBlur={commitQuantityInput}
                  onSubmitEditing={commitQuantityInput}
                  style={styles.quantityValue}
                />
                <Text style={styles.quantityValueUnit}>kg</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Augmentar quantitat"
                disabled={incrementDisabled}
                style={[
                  styles.quantityButton,
                  incrementDisabled && styles.disabledButton,
                ]}
                onPress={() => changeQuantity(quantity + 0.25)}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* Resum de la comanda */}
          <View style={styles.totalPanel}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.totalLabel}>TOTAL DE LA COMANDA</Text>

              <Text style={styles.totalHint}>
                {formatQuantity(quantity)} kg ×{' '}
                {unitPrice.toFixed(2).replace('.', ',')} €/kg
              </Text>
            </View>

            <Text style={styles.totalPrice}>{formatPrice(total)}</Text>
          </View>

          {/* Pagament Stripe */}
          <CheckoutForm
            productId={String(productId)}
            quantity={quantity}
            disabled={outOfStock}
          />

          <Text style={styles.footerText}>
            AgriTwin · Agricultura intel·ligent
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
