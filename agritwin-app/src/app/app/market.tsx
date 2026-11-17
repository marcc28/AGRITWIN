import { useTranslation } from 'react-i18next';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { getMarketStyles, getMarketPalette } from '../../styles/market.styles';
import {
  getcontentfeed,
  searchMarketProducts,
  getMarketProductsCount,
} from '@/services/api_market';
import BannerAd from '@/components/adBanner/BannerAd';
import MarketSkeleton from '@/components/market/MarketSkeleton';

type Product = {
  id: string | number;
  product: string;
  tecnical_name: string;
  price: number;
  price_per_kg: number;
  left_units: number;
  image_url?: string | null;
  url_image?: string | null;
};

const configuredPageSize = Number(process.env.EXPO_PUBLIC_MARKET_PAGE_SIZE);
const PAGE_SIZE =
  Number.isInteger(configuredPageSize) && configuredPageSize > 0
    ? configuredPageSize
    : 5;

// Per sota d'aquest estoc avisem que en queden poques unitats
const LOW_STOCK = 50;

const euros = (value: number) => Number(value).toFixed(2).replace('.', ',');

type ProductCardProps = {
  product: Product;
  styles: ReturnType<typeof getMarketStyles>;
  palette: ReturnType<typeof getMarketPalette>;
  buyLabel: string;
  onPress: () => void;
};

type ProductPreviewProps = {
  title: string;
  imageUrl?: string | null;
  styles: ReturnType<typeof getMarketStyles>;
  children: ReactNode;
  onPress: () => void;
  onHover: (pageX: number, pageY: number) => void;
  onHoverOut: () => void;
  testID: string;
  accessibilityLabel: string;
};

function ProductPreview({
  title,
  imageUrl,
  styles,
  children,
  onPress,
  onHover,
  onHoverOut,
  testID,
  accessibilityLabel,
}: ProductPreviewProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onHoverIn={(event) => {
        if (imageUrl) {
          onHover(event.nativeEvent.pageX, event.nativeEvent.pageY);
        }
      }}
      onPointerMove={(event) => {
        if (imageUrl && event.nativeEvent.pointerType === 'mouse') {
          onHover(event.nativeEvent.pageX, event.nativeEvent.pageY);
        }
      }}
      onHoverOut={onHoverOut}
      onPress={onPress}
      style={({ pressed }) => [styles.priceCard, pressed && { opacity: 0.75 }]}
    >
      {children}
    </Pressable>
  );
}

function HeartbeatBuyButton({
  product,
  label,
  styles,
}: {
  product: Product;
  label: string;
  styles: ReturnType<typeof getMarketStyles>;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const outOfStock = Number(product.left_units) <= 0;

  useEffect(() => {
    if (outOfStock) {
      scale.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.04,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.delay(1200),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
      scale.stopAnimation();
    };
  }, [scale, outOfStock]);

  return (
    <Animated.View
      style={{
        marginLeft: 'auto',
        transform: [{ scale }],
      }}
    >
      <View
        testID={`buy-button-${product.id}`}
        style={[styles.buyBtn, outOfStock && styles.buyBtnDisabled]}
      >
        <Text
          testID={`buy-text-${product.id}`}
          style={[styles.buyText, outOfStock && styles.buyTextDisabled]}
        >
          {outOfStock ? 'Esgotat' : label}
        </Text>
      </View>
    </Animated.View>
  );
}

function ProductCard({
  product,
  styles,
  palette,
  buyLabel,
  onPress,
  onHover,
  onHoverOut,
}: ProductCardProps & {
  onHover: (pageX: number, pageY: number) => void;
  onHoverOut: () => void;
}) {
  const imageUrl = product.image_url ?? product.url_image;

  const units = Math.max(0, Math.trunc(Number(product.left_units)));

  const outOfStock = units <= 0;
  const lowStock = !outOfStock && units <= LOW_STOCK;

  const stockColor = outOfStock
    ? palette.muted
    : lowStock
      ? palette.warn
      : palette.ok;

  const stockLabel = outOfStock
    ? 'Esgotat'
    : lowStock
      ? `Només en queden ${units}`
      : `${units} disponibles`;

  return (
    <ProductPreview
      title={product.product}
      imageUrl={imageUrl}
      styles={styles}
      testID={`product-item-${product.id}`}
      accessibilityLabel={`Veure producte ${product.product}`}
      onHover={onHover}
      onHoverOut={onHoverOut}
      onPress={onPress}
    >
      <View style={styles.priceTop}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.thumb}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.thumbFallback}>
            <Text style={styles.thumbFallbackText}>
              {product.product.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.info}>
          <Text
            testID={`product-name-${product.id}`}
            style={styles.productName}
            numberOfLines={2}
          >
            {product.product}
          </Text>

          <Text
            testID={`product-technical-name-${product.id}`}
            style={styles.detail}
            numberOfLines={1}
          >
            {product.tecnical_name}
          </Text>

          <View style={styles.stockRow}>
            <View style={[styles.stockDot, { backgroundColor: stockColor }]} />

            <Text
              testID={`product-units-${product.id}`}
              style={[styles.stockText, { color: stockColor }]}
            >
              {stockLabel}
            </Text>
          </View>
        </View>

        <View style={styles.priceMain}>
          <Text
            testID={`product-price-${product.id}`}
            style={styles.priceValue}
          >
            {euros(product.price)} €
          </Text>
        </View>
      </View>

      <View style={styles.priceBottom}>
        <Text
          testID={`product-price-kg-${product.id}`}
          style={styles.smallInfo}
        >
          {euros(product.price_per_kg)} €/kg
        </Text>

        <HeartbeatBuyButton
          product={product}
          label={buyLabel}
          styles={styles}
        />
      </View>
    </ProductPreview>
  );
}

export default function MarketScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const { width, height } = useWindowDimensions();
  const compactLandscape = width > height && height < 600;
  const styles = getMarketStyles(colors, { width, height });
  const palette = getMarketPalette(colors);
  const skeletonCardWidth =
    typeof styles.priceCard.width === 'number'
      ? styles.priceCard.width
      : undefined;
  const skeletonGap =
    typeof styles.list.gap === 'number' ? styles.list.gap : 12;
  const compactSkeleton = width < 360 || compactLandscape;
  const router = useRouter();
  const marketRef = useRef<View>(null);

  const [hoverPreview, setHoverPreview] = useState<{
    title: string;
    imageUrl: string;
    left: number;
    top: number;
  } | null>(null);
  const showImagePreview = (
    title: string,
    imageUrl: string | null | undefined,
    pageX: number,
    pageY: number,
  ) => {
    if (!imageUrl) return;

    marketRef.current?.measureInWindow((x, y, width, height) => {
      const previewWidth = 190;
      const previewHeight = 155;
      const offset = 16;

      const cursorX = pageX - x;
      const cursorY = pageY - y;
      const maxLeft = Math.max(8, width - previewWidth - 8);
      const maxTop = Math.max(8, height - previewHeight - 8);
      const requestedLeft =
        cursorX + offset + previewWidth > width - 8
          ? cursorX - previewWidth - offset
          : cursorX + offset;
      const requestedTop =
        cursorY + offset + previewHeight > height - 8
          ? cursorY - previewHeight - offset
          : cursorY + offset;

      const left = Math.min(Math.max(8, requestedLeft), maxLeft);
      const top = Math.min(Math.max(8, requestedTop), maxTop);

      setHoverPreview({
        title,
        imageUrl,
        left,
        top,
      });
    });
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [currentItems, setCurrentItems] = useState<Product[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const isSearching = Boolean(searchQuery.trim());
  const loadingMoreRef = useRef(false);
  const [hasMore, setHasMore] = useState(true);
  // Càrrega inicial
  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [productsCount, productsData] = await Promise.all([
          getMarketProductsCount(),
          getcontentfeed(0, PAGE_SIZE),
        ]);

        if (active) {
          setProductsTotal(productsCount);
          setAllProducts(productsData);
          setCurrentItems(productsData);
          setProducts(productsData);
          setHasMore(productsData.length < productsCount);
        }
      } catch (error) {
        console.error('Error carregant les dades del mercat:', error);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  // Cerca amb debounce
  useEffect(() => {
    if (loading) return;

    const query = searchQuery.trim();
    let active = true;

    setSearchError('');

    // Cerca buida: recuperem els productes originals
    if (!query) {
      setSearching(false);
      setProducts(allProducts);
      setCurrentItems(allProducts);
      return () => {
        active = false;
      };
    }

    const timeout = setTimeout(async () => {
      setSearching(true);

      try {
        const results = await searchMarketProducts(query);

        if (active) {
          setProducts(results);
          setCurrentItems(results);
        }
      } catch (error) {
        console.error('Error en la cerca:', error);

        if (active) {
          setSearchError('No s’ha pogut fer la cerca. Torna-ho a provar.');
          setProducts([]);
          setCurrentItems([]);
        }
      } finally {
        if (active) setSearching(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [searchQuery, loading, allProducts]);

  useEffect(() => {}, [searchQuery]);

  const loadMoreProducts = async () => {
    if (
      loading ||
      searching ||
      isSearching ||
      loadingMoreRef.current ||
      !hasMore
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingPage(true);

    try {
      const offset = allProducts.length;

      const batch = await getcontentfeed(offset, PAGE_SIZE);

      if (batch.length === 0) {
        setHasMore(false);
        return;
      }

      setAllProducts((previous) => [...previous, ...batch]);
      setProducts((previous) => [...previous, ...batch]);

      // Comprovem si encara queden productes per carregar
      setHasMore(offset + batch.length < productsTotal);
    } catch (error) {
      console.error('Error carregant més productes:', error);
    } finally {
      loadingMoreRef.current = false;
      setLoadingPage(false);
    }
  };
  const handleScroll = ({
    nativeEvent,
  }: {
    nativeEvent: {
      layoutMeasurement: { height: number };
      contentOffset: { y: number };
      contentSize: { height: number };
    };
  }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;

    const distanceFromBottom =
      contentSize.height - (layoutMeasurement.height + contentOffset.y);

    // Carreguem quan falten menys de 200 píxels per arribar al final
    if (distanceFromBottom < 200) {
      loadMoreProducts();
    }
  };

  const openProduct = (productId: string | number) => {
    router.push({
      pathname: '/product/[id]',
      params: { id: String(productId) },
    });
  };

  return (
    <View
      ref={marketRef}
      collapsable={false}
      testID="market-screen"
      style={{
        flex: 1,
        position: 'relative',
        backgroundColor: colors.background,
      }}
    >
      <View style={styles.searchWrap}>
        <Image
          source={require('@assets/images/search.png')}
          style={{
            width: compactLandscape ? 16 : 20,
            height: compactLandscape ? 16 : 20,
            marginRight: compactLandscape ? 6 : 10,
          }}
          resizeMode="contain"
        />

        <TextInput
          style={styles.searchInput}
          placeholder={t('market.searchPlaceholder', 'Cerca productes')}
          placeholderTextColor={palette.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />

        {searchQuery.length > 0 && (
          <Pressable
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Esborra la cerca"
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        testID="market-scroll-view"
        style={styles.scroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={300}
      >
        {loading ? (
          <MarketSkeleton
            count={PAGE_SIZE}
            cardWidth={skeletonCardWidth}
            gap={skeletonGap}
            compact={compactSkeleton}
          />
        ) : searching ? (
          <MarketSkeleton
            count={PAGE_SIZE}
            cardWidth={skeletonCardWidth}
            gap={skeletonGap}
            compact={compactSkeleton}
          />
        ) : searchError ? (
          <Text style={styles.statusText}>{searchError}</Text>
        ) : products.length > 0 ? (
          <>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                styles={styles}
                palette={palette}
                buyLabel={t('market.buy')}
                onPress={() => openProduct(product.id)}
                onHover={(pageX, pageY) =>
                  showImagePreview(
                    product.product,
                    product.image_url ?? product.url_image,
                    pageX,
                    pageY,
                  )
                }
                onHoverOut={() => setHoverPreview(null)}
              />
            ))}
            {Platform.OS === 'web' && !isSearching && hasMore && (
              <View style={styles.loadMoreWrap}>
                <Pressable
                  testID="market-load-more"
                  accessibilityRole="button"
                  accessibilityLabel="Carregar més productes"
                  disabled={loadingPage}
                  onPress={loadMoreProducts}
                  style={({ pressed }) => [
                    styles.loadMoreButton,
                    pressed && !loadingPage && { opacity: 0.75 },
                    loadingPage && { opacity: 0.65 },
                  ]}
                >
                  <Text style={styles.loadMoreText}>
                    {loadingPage
                      ? t('common.loading', 'Carregant...')
                      : t('market.loadMore', 'Carregar més productes')}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.statusText}>
            {isSearching
              ? `Cap producte coincideix amb «${searchQuery.trim()}».`
              : 'Encara no hi ha productes al mercat.'}
          </Text>
        )}

        {/* Skeleton al final de la llista */}
        {loadingPage && !loading && (
          <MarketSkeleton
            cardWidth={skeletonCardWidth}
            gap={skeletonGap}
            compact={compactSkeleton}
          />
        )}
      </ScrollView>
      <View style={styles.bannerWrap}>
      </View>

      {hoverPreview && (
        <View
          pointerEvents="none"
          style={[
            styles.imagePreview,
            { left: hoverPreview.left, top: hoverPreview.top },
          ]}
        >
          <Text style={styles.imagePreviewTitle}>{hoverPreview.title}</Text>
          <Image
            source={{ uri: hoverPreview.imageUrl }}
            style={styles.imagePreviewImage}
            resizeMode="cover"
          />
        </View>
      )}
    </View>
  );
}
