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
import { searchMarketProducts } from '@/services/api_market';
import { prefetchImages } from '@/services/imagePrefetch';
import {
  MARKET_PAGE_SIZE,
  marketCountQuery,
  marketPageQuery,
  queryKeys,
} from '@/services/queries';
import { queryClient } from '@/services/queryClient';
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

const PAGE_SIZE = MARKET_PAGE_SIZE;

function productImage(product: Product) {
  return product.image_url ?? product.url_image;
}

/** Market data already in the cache (from this session or the last one). */
function readCachedMarket(language: string) {
  const total = queryClient.getQueryData<number>(queryKeys.marketCount);
  const firstPage = queryClient.getQueryData<Product[]>(
    queryKeys.marketPage(0, PAGE_SIZE, language),
  );
  const ready = typeof total === 'number' && Array.isArray(firstPage);
  return {
    ready,
    total: total ?? 0,
    products: Array.isArray(firstPage) ? firstPage : [],
    hasMore: ready ? firstPage.length < total : true,
  };
}

// Per sota d'aquest estoc avisem que en queden poques unitats
const LOW_STOCK = 50;

const euros = (value: number, language: string) =>
  new Intl.NumberFormat(language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));

type ProductCardProps = {
  product: Product;
  language: string;
  styles: ReturnType<typeof getMarketStyles>;
  palette: ReturnType<typeof getMarketPalette>;
  buyLabel: string;
  outOfStockLabel: string;
  lowStockLabel: (units: number) => string;
  availableLabel: (units: number) => string;
  viewProductLabel: (name: string) => string;
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
  outOfStockLabel,
}: {
  product: Product;
  label: string;
  styles: ReturnType<typeof getMarketStyles>;
  outOfStockLabel: string;
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
          {outOfStock ? outOfStockLabel : label}
        </Text>
      </View>
    </Animated.View>
  );
}

function ProductCard({
  product,
  language,
  styles,
  palette,
  buyLabel,
  outOfStockLabel,
  lowStockLabel,
  availableLabel,
  viewProductLabel,
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
    ? outOfStockLabel
    : lowStock
      ? lowStockLabel(units)
      : availableLabel(units);

  return (
    <ProductPreview
      title={product.product}
      imageUrl={imageUrl}
      styles={styles}
      testID={`product-item-${product.id}`}
      accessibilityLabel={viewProductLabel(product.product)}
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
            {euros(product.price, language)} €
          </Text>
        </View>
      </View>

      <View style={styles.priceBottom}>
        <Text
          testID={`product-price-kg-${product.id}`}
          style={styles.smallInfo}
        >
          {euros(product.price_per_kg, language)} €/kg
        </Text>

        <HeartbeatBuyButton
          product={product}
          label={buyLabel}
          styles={styles}
          outOfStockLabel={outOfStockLabel}
        />
      </View>
    </ProductPreview>
  );
}

type MarketListContentProps = {
  loading: boolean;
  searching: boolean;
  searchError: string;
  products: Product[];
  language: string;
  isSearching: boolean;
  searchQuery: string;
  hasMore: boolean;
  loadingPage: boolean;
  styles: ReturnType<typeof getMarketStyles>;
  palette: ReturnType<typeof getMarketPalette>;
  skeletonCardWidth?: number;
  skeletonGap: number;
  compactSkeleton: boolean;
  buyLabel: string;
  outOfStockLabel: string;
  lowStockLabel: (units: number) => string;
  availableLabel: (units: number) => string;
  noMatchLabel: (query: string) => string;
  noProductsLabel: string;
  viewProductLabel: (name: string) => string;
  loadMoreAccessibilityLabel: string;
  loadingLabel: string;
  loadMoreLabel: string;
  onLoadMore: () => void;
  onOpenProduct: (productId: string | number) => void;
  onHover: (
    title: string,
    imageUrl: string | null | undefined,
    pageX: number,
    pageY: number,
  ) => void;
  onHoverOut: () => void;
};

function MarketListContent({
  loading,
  searching,
  searchError,
  products,
  language,
  isSearching,
  searchQuery,
  hasMore,
  loadingPage,
  styles,
  palette,
  skeletonCardWidth,
  skeletonGap,
  compactSkeleton,
  buyLabel,
  outOfStockLabel,
  lowStockLabel,
  availableLabel,
  noMatchLabel,
  noProductsLabel,
  viewProductLabel,
  loadMoreAccessibilityLabel,
  loadingLabel,
  loadMoreLabel,
  onLoadMore,
  onOpenProduct,
  onHover,
  onHoverOut,
}: MarketListContentProps) {
  if (loading || searching) {
    return (
      <MarketSkeleton
        count={PAGE_SIZE}
        cardWidth={skeletonCardWidth}
        gap={skeletonGap}
        compact={compactSkeleton}
      />
    );
  }

  if (searchError) {
    return <Text style={styles.statusText}>{searchError}</Text>;
  }

  if (products.length === 0) {
    const emptyMessage = isSearching
      ? noMatchLabel(searchQuery.trim())
      : noProductsLabel;
    return <Text style={styles.statusText}>{emptyMessage}</Text>;
  }

  return (
    <>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          language={language}
          styles={styles}
          palette={palette}
          buyLabel={buyLabel}
          outOfStockLabel={outOfStockLabel}
          lowStockLabel={lowStockLabel}
          availableLabel={availableLabel}
          viewProductLabel={viewProductLabel}
          onPress={() => onOpenProduct(product.id)}
          onHover={(pageX, pageY) =>
            onHover(
              product.product,
              product.image_url ?? product.url_image,
              pageX,
              pageY,
            )
          }
          onHoverOut={onHoverOut}
        />
      ))}
      {Platform.OS === 'web' && !isSearching && hasMore && (
        <View style={styles.loadMoreWrap}>
          <Pressable
            testID="market-load-more"
            accessibilityRole="button"
            accessibilityLabel={loadMoreAccessibilityLabel}
            disabled={loadingPage}
            onPress={onLoadMore}
            style={({ pressed }) => [
              styles.loadMoreButton,
              pressed && !loadingPage && { opacity: 0.75 },
              loadingPage && { opacity: 0.65 },
            ]}
          >
            <Text style={styles.loadMoreText}>
              {loadingPage ? loadingLabel : loadMoreLabel}
            </Text>
          </Pressable>
        </View>
      )}
      {loadingPage && !loading && (
        <MarketSkeleton
          cardWidth={skeletonCardWidth}
          gap={skeletonGap}
          compact={compactSkeleton}
        />
      )}
    </>
  );
}

export default function MarketScreen() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'ca';
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

  // The first page and the total saved from the last visit are shown at
  // once; they are refreshed from the server right after.
  const [cached] = useState(() => readCachedMarket(language));

  const [products, setProducts] = useState<Product[]>(cached.products);
  const [allProducts, setAllProducts] = useState<Product[]>(cached.products);
  const [currentItems, setCurrentItems] = useState<Product[]>([]);
  const [productsTotal, setProductsTotal] = useState(cached.total);

  const [loading, setLoading] = useState(!cached.ready);
  const [loadingPage, setLoadingPage] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const isSearching = Boolean(searchQuery.trim());
  const loadingMoreRef = useRef(false);
  const [hasMore, setHasMore] = useState(cached.hasMore);
  // Càrrega inicial
  useEffect(() => {
    let active = true;
    const localeCache = readCachedMarket(language);
    setProducts(localeCache.products);
    setAllProducts(localeCache.products);
    setCurrentItems(localeCache.products);
    setProductsTotal(localeCache.total);
    setHasMore(localeCache.hasMore);
    setLoading(!localeCache.ready);

    async function loadData() {
      try {
        const [productsCount, productsData] = await Promise.all([
          queryClient.query(marketCountQuery()),
          queryClient.query(marketPageQuery(0, PAGE_SIZE, language)),
        ]);

        if (active) {
          const firstPage = productsData as Product[];
          // Fresh first page; pages already loaded further on are kept.
          const previous = queryClient.getQueryData<Product[]>(
            queryKeys.marketPage(PAGE_SIZE, PAGE_SIZE, language),
          ) ?? [];
          const merge = [...firstPage, ...previous];

          setProductsTotal(productsCount);
          setAllProducts(merge);
          setCurrentItems(merge);
          setProducts(merge);
          setHasMore(firstPage.length < productsCount);
          prefetchImages(firstPage.map(productImage));
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
  }, [language]);

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
        const results = await searchMarketProducts(query, language);

        if (active) {
          setProducts(results);
          setCurrentItems(results);
        }
      } catch (error) {
        console.error('Error en la cerca:', error);

        if (active) {
          setSearchError(t('market.errors.searchFailed'));
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
  }, [searchQuery, loading, allProducts, language, t]);

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

      const batch = (await queryClient.query(
        marketPageQuery(offset, PAGE_SIZE, language),
      )) as Product[];
      prefetchImages(batch.map(productImage));

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
      void loadMoreProducts();
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
          placeholder={t('market.searchPlaceholder')}
          placeholderTextColor={palette.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />

        {searchQuery.length > 0 && (
          <Pressable
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel={t('market.clearSearch')}
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
        <MarketListContent
          loading={loading}
          searching={searching}
          searchError={searchError}
          products={products}
          language={language}
          isSearching={isSearching}
          searchQuery={searchQuery}
          hasMore={hasMore}
          loadingPage={loadingPage}
          styles={styles}
          palette={palette}
          skeletonCardWidth={skeletonCardWidth}
          skeletonGap={skeletonGap}
          compactSkeleton={compactSkeleton}
          buyLabel={t('market.buy')}
          outOfStockLabel={t('market.stock.outOfStock')}
          lowStockLabel={(units) => t('market.stock.low', { count: units })}
          availableLabel={(units) => t('market.stock.available', { count: units })}
          noMatchLabel={(query) => t('market.noMatch', { query })}
          noProductsLabel={t('market.noProducts')}
          viewProductLabel={(name) => t('market.viewProduct', { name })}
          loadMoreAccessibilityLabel={t('market.loadMore')}
          loadingLabel={t('market.loading')}
          loadMoreLabel={t('market.loadMore')}
          onLoadMore={loadMoreProducts}
          onOpenProduct={openProduct}
          onHover={showImagePreview}
          onHoverOut={() => setHoverPreview(null)}
        />
      </ScrollView>
      <View style={styles.bannerWrap}></View>

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
