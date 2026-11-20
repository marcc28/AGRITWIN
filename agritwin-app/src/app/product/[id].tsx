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
import { useTranslation } from 'react-i18next';

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
  title,
  backLabel,
  onBack,
  styles,
}: {
  message: string;
  title: string;
  backLabel: string;
  onBack: () => void;
  styles: ProductStyles;
}) {
  return (
    <View style={[styles.screen, { justifyContent: 'center' }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.description}>{message}</Text>

          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
          >
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backButtonText}>{backLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const formatQuantity = (value: number, language = 'ca') =>
  new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(value);

/** Starting quantity: 1, or less when there is less than 1 unit in stock. */
function initialQuantityFor(product: MarketProduct) {
  const stock = Number(product.left_units);
  return Number.isFinite(stock)
    ? Math.min(1, Math.max(0.01, Math.floor(stock * 100) / 100))
    : 1;
}

function loadError(
  productId: string | undefined,
  hasProduct: boolean,
  failure: unknown,
  missingProductMessage: string,
  fallbackMessage: string,
): string | null {
  if (!productId) {
    return missingProductMessage;
  }
  if (hasProduct || !failure) {
    return null;
  }
  return failure instanceof Error ? failure.message : fallbackMessage;
}

/**
 * Product of the page and the quantity chosen. Shown at once from the cache
 * (or from the market list it was opened from); price and stock are always
 * refreshed from the server.
 */
function useMarketProduct(
  productId: string | undefined,
  language: string,
  missingProductMessage: string,
  fallbackMessage: string,
) {
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState('1');

  const result = useCachedQuery({
    ...marketProductQuery(String(productId), language),
    enabled: !!productId,
    placeholderData: () =>
      productId
        ? findProductInMarketPages(String(productId), language)
        : undefined,
  });

  const product: MarketProduct | null = result.data ?? null;
  const loading = !!productId && result.data === undefined && !result.isError;
  const error = loadError(
    productId,
    !!product,
    result.error,
    missingProductMessage,
    fallbackMessage,
  );

  useEffect(() => {
    setQuantity(1);
    setQuantityInput('1');
  }, [productId]);

  // The starting quantity depends on the stock: it is set once per product,
  // from the server's answer (not from the copy shown while it loads).
  const quantityFor = useRef<string | null>(null);
  useEffect(() => {
    const key = String(productId);
    if (!product || result.isPlaceholderData || quantityFor.current === key) {
      return;
    }
    quantityFor.current = key;
    const initialQuantity = initialQuantityFor(product);
    setQuantity(initialQuantity);
    setQuantityInput(formatQuantity(initialQuantity, language));
  }, [product, productId, result.isPlaceholderData, language]);

  return {
    product,
    loading,
    error,
    quantity,
    setQuantity,
    quantityInput,
    setQuantityInput,
  };
}

export default function ProductScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'ca';

  const { width, height } = useWindowDimensions();

  const styles = getProductStyles(Colors.light, width, height);

  const { id } = useLocalSearchParams<{
    id: string | string[];
  }>();

  const productId = Array.isArray(id) ? id[0] : id;

  const {
    product,
    loading,
    error,
    quantity,
    setQuantity,
    quantityInput,
    setQuantityInput,
  } = useMarketProduct(
    productId,
    language,
    t('market.detail.missingProductId'),
    t('market.detail.loadError'),
  );

  const handleBack = () => router.dismissTo('/app/market');

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center' }]}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>AGRITWIN · MERCAT</Text>

            <Text style={styles.title}>{t('market.detail.loading')}</Text>

            <Text style={styles.description}>
              {t('market.detail.loadingDescription')}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (error !== null) {
    return (
      <ProductUnavailable
        message={error}
        title={t('market.detail.unavailable')}
        backLabel={t('market.detail.back')}
        onBack={handleBack}
        styles={styles}
      />
    );
  }

  if (product === null) {
    return (
      <ProductUnavailable
        message={t('market.detail.loadError')}
        title={t('market.detail.unavailable')}
        backLabel={t('market.detail.back')}
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
      setQuantityInput(formatQuantity(nextQuantity, language));
      return;
    }

    setQuantityInput(formatQuantity(quantity, language));
  };

  const changeQuantity = (nextQuantity: number) => {
    const boundedQuantity = Number(
      Math.min(maxQuantity, Math.max(0.01, nextQuantity)).toFixed(2),
    );
    setQuantity(boundedQuantity);
    setQuantityInput(formatQuantity(boundedQuantity, language));
  };

  const formatPrice = (value: number) =>
    new Intl.NumberFormat(language, {
      style: 'currency',
      currency: 'EUR',
    }).format(value);

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
              <Text style={styles.eyebrow}>{t('market.detail.eyebrow')}</Text>

              <Text style={styles.title}>{product.product}</Text>

              {!!product.tecnical_name && (
                <Text style={styles.description}>{product.tecnical_name}</Text>
              )}
            </View>
          </View>

          {/* Preu i disponibilitat */}
          <View style={styles.priceSection}>
            <View style={styles.priceInfo}>
              <Text style={styles.priceLabel}>{t('market.detail.price')}</Text>

              <Text style={styles.price}>{formatPrice(unitPrice)}</Text>

              <Text style={styles.priceUnit}>{t('market.detail.perKg')}</Text>
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
                  ? t('market.detail.noStock')
                  : t('market.detail.available', {
                      value: formatQuantity(available, language),
                    })}
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
                  {t('market.detail.availability')}
                </Text>

                <Text
                  style={[
                    styles.infoValue,
                    outOfStock && styles.infoValueEmpty,
                  ]}
                >
                  {outOfStock
                    ? t('market.detail.unavailableNow')
                    : t('market.detail.availableToBuy')}
                </Text>
              </View>
            </View>
          </View>

          {/* Quantitat */}
          <Text style={styles.sectionTitle}>{t('market.detail.order')}</Text>

          <View style={styles.quantityPanel}>
            <View style={styles.quantityHeader}>
              <View>
                <Text style={styles.quantityTitle}>
                  {t('market.detail.quantity')}
                </Text>

                <Text style={styles.quantityHint}>
                  {t('market.detail.quantityHint')}
                </Text>
              </View>

              <Text style={styles.quantityUnit}>kg</Text>
            </View>

            <View style={styles.quantityRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('market.detail.reduceQuantity')}
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
                  accessibilityLabel={t('market.detail.quantityInKg')}
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
                accessibilityLabel={t('market.detail.increaseQuantity')}
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
              <Text style={styles.totalLabel}>{t('market.detail.total')}</Text>

              <Text style={styles.totalHint}>
                {formatQuantity(quantity, language)} kg ×{' '}
                {new Intl.NumberFormat(language, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(unitPrice)}{' '}
                €/kg
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

          <Text style={styles.footerText}>{t('market.detail.footer')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
