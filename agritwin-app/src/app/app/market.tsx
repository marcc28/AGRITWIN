import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { getMarketStyles } from '../../styles/market.styles';
import {
  getcontentfeed,
  searchMarketProducts,
  getAnuncesCount,
  getMarketProductsCount,
} from '@/services/api_market';

type Tab = 'prices';

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

function MarketImagePreview({
  title,
  imageUrl,
  styles,
  children,
  onPress,
  testID,
  accessibilityLabel,
  pressedOpacity = 0.7,
  onHover,
  onHoverOut,
}: {
  title: string;
  imageUrl?: string | null;
  styles: ReturnType<typeof getMarketStyles>;
  children: ReactNode;
  onPress: () => void;
  testID: string;
  accessibilityLabel: string;
  pressedOpacity?: number;
  onHover: (pageX: number, pageY: number) => void;
  onHoverOut: () => void;
}) {
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
      onHoverOut={onHoverOut}
      onPress={onPress}
      style={({ pressed }) => [
        styles.priceCard,
        pressed && { opacity: pressedOpacity },
      ]}
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

  useEffect(() => {
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
  }, [scale]);
  const outOfStock = Number(product.left_units) <= 0;

  return (
    <Animated.View
      style={{
        marginLeft: 'auto',
        transform: [{ scale }],
      }}
    >
      <View
        testID={`buy-button-${product.id}`}
        style={[styles.buyBtn, outOfStock && { opacity: 0.45 }]}
      >
        <Text testID={`buy-text-${product.id}`} style={styles.buyText}>
          {outOfStock ? 'Esgotat' : label}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function MarketScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { width, height } = useWindowDimensions();
  const compactLandscape = width > height && height < 600;
  const styles = getMarketStyles(colors, compactLandscape);
  const router = useRouter();
  const marketRef = useRef<View>(null);

  const [tab, setTab] = useState<Tab>('prices');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [pageLoadError, setPageLoadError] = useState('');
  const [page, setPage] = useState(0);
  const [productsTotal, setProductsTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [currentItems, setCurrentItems] = useState<Product[]>([]);
  const isSearching = Boolean(searchQuery.trim());
  const currentTotal = isSearching ? currentItems.length : productsTotal;
  const totalPages = Math.ceil(currentTotal / PAGE_SIZE);

  const visibleProducts = products.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  const canGoBack = page > 0;
  const canGoForward = page + 1 < totalPages;

  const [allProducts, setAllProducts] = useState<Product[]>([]);
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

    marketRef.current?.measureInWindow((x, y, width) => {
      const previewWidth = 190;
      const previewHeight = 155;
      const left = Math.min(
        Math.max(8, pageX - x - previewWidth / 2),
        Math.max(8, width - previewWidth - 8),
      );
      const top = Math.max(8, pageY - y - previewHeight - 12);

      setHoverPreview({ title, imageUrl, left, top });
    });
  };

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [productsCount, newsCount] = await Promise.all([
          getMarketProductsCount(),
          getAnuncesCount(),
        ]);

        const [productsData] = await Promise.all([
          getcontentfeed(0, PAGE_SIZE),
        ]);

        if (active) {
          setProductsTotal(productsCount);
          setAllProducts(productsData);

          setCurrentItems(productsData);

          setProducts(productsData);
        }
      } catch (error) {
        console.error('Error carregant les dades del mercat:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const query = searchQuery.trim();
    let active = true;

    setSearchError('');

    // Si la cerca està buida, recuperem els productes originals
    if (!query) {
      setSearching(false);
      setProducts(allProducts);
      setCurrentItems(allProducts);
      setPage(0);

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
          setPage(0);
        }
      } catch (error) {
        console.error('Error en la cerca:', error);

        if (active) {
          setSearchError('Error en realitzar la cerca.');
          setProducts([]);
          setCurrentItems([]);
        }
      } finally {
        if (active) {
          setSearching(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [searchQuery, tab, loading, allProducts]);

  useEffect(() => {
    setPage(0);
    setPageLoadError('');
  }, [searchQuery, tab]);

  const changeTab = (nextTab: Tab) => {
    setTab(nextTab);
    setPage(0);
  };

  const goBack = () => {
    setPage((current) => Math.max(0, current - 1));
    setPageLoadError('');
  };

  const goForward = async () => {
    if (loadingPage || !canGoForward) return;

    const nextPage = page + 1;
    const nextOffset = nextPage * PAGE_SIZE;
    const loadedItems = allProducts;

    if (!isSearching && loadedItems.length < nextOffset + 1) {
      setLoadingPage(true);
      setPageLoadError('');
      try {
        const batch = await getcontentfeed(nextOffset, PAGE_SIZE);
        setAllProducts((previous) => [...previous, ...batch]);
        setProducts((previous) => [...previous, ...batch]);
        setCurrentItems((previous) => [...previous, ...batch]);
      } catch (error) {
        console.error('Error carregant més dades del mercat:', error);
        setPageLoadError(
          'No s’han pogut carregar més dades. Torna-ho a provar.',
        );
        return;
      } finally {
        setLoadingPage(false);
      }
    }

    setPage(nextPage);
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
          style={{ width: 20, height: 20, marginRight: 10 }}
          resizeMode="contain"
        />

        <TextInput
          style={styles.searchInput}
          placeholder={t(
            'market.searchPlaceholder',
            'Cerca productes o notícies...',
          )}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />

        {searchQuery.length > 0 && (
          <Pressable
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text style={styles.statusText}>
            {t('common.loading', 'Carregant...')}
          </Text>
        ) : searching ? (
          <Text style={styles.statusText}>Cercant...</Text>
        ) : searchError ? (
          <Text style={styles.statusText}>{searchError}</Text>
        ) : visibleProducts.length > 0 ? (
          visibleProducts.map((product) => (
            <MarketImagePreview
              key={product.id}
              title={product.product}
              imageUrl={product.image_url ?? product.url_image}
              styles={styles}
              testID={`product-item-${product.id}`}
              accessibilityLabel={`Veure producte ${product.product}`}
              onHover={(pageX, pageY) =>
                showImagePreview(
                  product.product,
                  product.image_url ?? product.url_image,
                  pageX,
                  pageY,
                )
              }
              onHoverOut={() => setHoverPreview(null)}
              onPress={() => openProduct(product.id)}
            >
              <View style={styles.priceTop}>
                <View style={{ flex: 1 }}>
                  <Text
                    testID={`product-name-${product.id}`}
                    style={styles.productName}
                  >
                    {product.product}
                  </Text>

                  <Text
                    testID={`product-technical-name-${product.id}`}
                    style={styles.detail}
                  >
                    {product.tecnical_name}
                  </Text>
                </View>

                <View style={styles.priceMain}>
                  <Text
                    testID={`product-price-${product.id}`}
                    style={styles.priceValue}
                  >
                    {Number(product.price).toFixed(2)} €
                  </Text>
                </View>
              </View>

              <View style={styles.priceBottom}>
                <Text
                  testID={`product-price-kg-${product.id}`}
                  style={styles.smallInfo}
                >
                  {Number(product.price_per_kg).toFixed(2)} €/kg
                </Text>

                <Text
                  testID={`product-units-${product.id}`}
                  style={styles.smallInfo}
                >
                  {Number(product.left_units).toFixed(2)} {t('market.units')}
                </Text>

                <HeartbeatBuyButton
                  product={product}
                  label={t('market.buy')}
                  styles={styles}
                />
              </View>
            </MarketImagePreview>
          ))
        ) : (
          <Text style={styles.statusText}>No hi ha productes.</Text>
        )}
      </ScrollView>

      {loadingPage && (
        <Text style={styles.statusText}>
          {t('common.loading', 'Carregant...')}
        </Text>
      )}
      {pageLoadError ? (
        <Text style={styles.statusText}>{pageLoadError}</Text>
      ) : null}

      {!loading && totalPages > 1 && (
        <View style={styles.pagination}>
          <Pressable
            testID="market-previous-page"
            accessibilityRole="button"
            accessibilityLabel="Cinc elements enrere"
            disabled={!canGoBack}
            onPress={goBack}
            style={({ pressed }) => [
              styles.arrowButton,
              !canGoBack && styles.arrowDisabled,
              pressed && canGoBack && styles.arrowPressed,
            ]}
          >
            <Image
              source={require('@assets/images/left_arrow.png')}
              style={styles.arrowIcon}
              resizeMode="contain"
            />
          </Pressable>

          <Text testID="market-page-indicator" style={styles.pageText}>
            {page + 1} / {totalPages}
          </Text>

          <Pressable
            testID="market-next-page"
            accessibilityRole="button"
            accessibilityLabel="Cinc elements endavant"
            disabled={!canGoForward || loadingPage}
            onPress={goForward}
            style={({ pressed }) => [
              styles.arrowButton,
              !canGoForward && styles.arrowDisabled,
              pressed && canGoForward && styles.arrowPressed,
            ]}
          >
            <Image
              source={require('@assets/images/right_arrow.png')}
              style={styles.arrowIcon}
              resizeMode="contain"
            />
          </Pressable>
        </View>
      )}

      {hoverPreview && (
        <View
          pointerEvents="none"
          style={[
            styles.imagePreview,
            { left: hoverPreview.left, top: hoverPreview.top },
          ]}
        >
          <Text style={styles.imagePreviewTitle} numberOfLines={1}>
            {hoverPreview.title}
          </Text>
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
