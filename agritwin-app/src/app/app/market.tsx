import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { getMarketStyles } from '../../styles/market.styles';
import {
  getcontentfeed,
  getnews,
  searchMarketProducts,
  searchNews,
} from '@/services/api_market';

type Tab = 'prices' | 'news';


type Product = {
  id: string | number;
  product: string;
  tecnical_name: string;
  price: number;
  price_per_kg: number;
  left_units: number;
};

type News = {
  id: string | number;
  title: string;
  subtile: string;
  agent: string;
  content: string;
};

const PAGE_SIZE = 5;
const INITIAL_PAGE_SIZE = 12;

function HeartbeatBuyButton({
  product,
  onPress,
  label,
  styles,
}: {
  product: Product;
  onPress: () => void;
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
      <Pressable
        testID={`buy-button-${product.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${product.product}`}
        accessibilityState={{ disabled: outOfStock }}
        disabled={outOfStock}
        onPress={onPress}
        style={({ pressed }) => [
          styles.buyBtn,
          outOfStock && { opacity: 0.45 },
          pressed && !outOfStock && { opacity: 0.75 },
        ]}
      >
        <Text testID={`buy-text-${product.id}`} style={styles.buyText}>
          {outOfStock ? 'Esgotat' : label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function MarketScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const styles = getMarketStyles(colors);
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('prices');
  const [products, setProducts] = useState<Product[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const currentItems = tab === 'prices' ? products : news;
  const totalPages = Math.ceil(currentItems.length / PAGE_SIZE);

  const visibleProducts = products.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  const visibleNews = news.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const canGoBack = page > 0;
  const canGoForward = page + 1 < totalPages;
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allNews, setAllNews] = useState<News[]>([]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [productsData, newsData] = await Promise.all([
          getcontentfeed(0, INITIAL_PAGE_SIZE),
          getnews(0, INITIAL_PAGE_SIZE),
        ]);

        if (active) {
          setAllProducts(productsData);
          setAllNews(newsData);
          setProducts(productsData);
          setNews(newsData);
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

  useEffect(() => {
    if (loading) return;

    const query = searchQuery.trim();
    let active = true;
    setPage(0);
    setSearchError('');

    if (!query) {
      setSearching(false);
      setProducts(allProducts);
      setNews(allNews);
      return () => {
        active = false;
      };
    }

    const timeout = setTimeout(async () => {
      setSearching(true);

      try {
        if (tab === 'prices') {
          const results = await searchMarketProducts(query);
          if (active) setProducts(results);
        } else {
          const results = await searchNews(query);
          if (active) setNews(results);
        }
      } catch (error) {
        console.error('Error en la cerca:', error);
        if (active) setSearchError('Error en realitzar la cerca.');
      } finally {
        if (active) setSearching(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [searchQuery, tab, loading, allProducts, allNews]);

  const changeTab = (nextTab: Tab) => {
    setTab(nextTab);
    setPage(0);
  };

  const goBack = () => {
    setPage((current) => Math.max(0, current - 1));
  };

  const goForward = () => {
    setPage((current) => Math.min(Math.max(0, totalPages - 1), current + 1));
  };

  const openProduct = (productId: string | number) => {
    router.push({
      pathname: '/product/[id]',
      params: { id: String(productId) },
    });
  };

  return (
    <View
      testID="market-screen"
      style={{ flex: 1, backgroundColor: colors.background }}
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
      <View style={styles.trackWrap}>
        <View style={styles.track}>
          {(['prices', 'news'] as Tab[]).map((key) => {
            const active = tab === key;

            return (
              <Pressable
                key={key}
                testID={`market-tab-${key}`}
                onPress={() => changeTab(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[
                  styles.segment,
                  active ? styles.segmentOn : styles.segmentOff,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? '#fff' : colors.text },
                  ]}
                >
                  {t(`market.${key}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
        ) : tab === 'prices' ? (
          visibleProducts.length > 0 ? (
            visibleProducts.map((product) => (
              <Pressable
                key={product.id}
                testID={`product-item-${product.id}`}
                style={({ pressed }) => [
                  styles.priceCard,
                  pressed && { opacity: 0.7 },
                ]}
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
                    onPress={() => openProduct(product.id)}
                  />
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={styles.statusText}>No hi ha productes.</Text>
          )
        ) : visibleNews.length > 0 ? (
          visibleNews.map((item) => (
            <Pressable
              key={item.id}
              testID={`news-item-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Llegir notícia: ${item.title}`}
              style={({ pressed }) => [
                styles.priceCard,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() =>
                router.push({
                  pathname: '/news/[id]',
                  params: { id: String(item.id) },
                })
              }
            >
              <View style={styles.chip}>
                <Text
                  testID={`news-subtitle-${item.id}`}
                  style={styles.chipText}
                >
                  {item.subtile}
                </Text>
              </View>

              <Text testID={`news-title-${item.id}`} style={styles.newsTitle}>
                {item.title}
              </Text>

              <Text testID={`news-content-${item.id}`} style={styles.newsBody}>
                {item.content}
              </Text>

              <Text style={styles.source}>{item.agent}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.statusText}>No hi ha notícies.</Text>
        )}
      </ScrollView>

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
            disabled={!canGoForward}
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
    </View>
  );
}
