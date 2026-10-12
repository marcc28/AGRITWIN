import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { getMarketStyles } from '../../styles/market.styles';
import { getcontentfeed, getnews } from '@/services/api';

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

export default function MarketScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const styles = getMarketStyles(colors);

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

  const visibleNews = news.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  const canGoBack = page > 0;
  const canGoForward = page + 1 < totalPages;

  useEffect(() => {
    async function loadData() {
      try {
        const [productsData, newsData] = await Promise.all([
          getcontentfeed(0, 10),
          getnews(0, 10),
        ]);

        setProducts(productsData);
        setNews(newsData);
      } catch (error) {
        console.error(t('market.errors.loadFailed'), error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [t]);

  const changeTab = (nextTab: Tab) => {
    setTab(nextTab);
    setPage(0);
  };

  const goBack = () => {
    setPage((current) => Math.max(0, current - 1));
  };

  const goForward = () => {
    setPage((current) =>
      Math.min(Math.max(0, totalPages - 1), current + 1),
    );
  };

  return (
    <View
      testID="market-screen"
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={styles.trackWrap}>
        <View style={styles.track}>
          {(['prices', 'news'] as Tab[]).map((k) => {
            const active = tab === k;

            return (
              <Pressable
                key={k}
                testID={`market-tab-${k}`}
                onPress={() => changeTab(k)}
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
                  {t(`market.${k}`)}
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
        ) : tab === 'prices' ? (
          visibleProducts.length > 0 ? (
            visibleProducts.map((p) => (
              <View
                key={p.id}
                testID={`product-item-${p.id}`}
                style={styles.priceCard}
              >
                <View style={styles.priceTop}>
                  <View style={{ flex: 1 }}>
                    <Text
                      testID={`product-name-${p.id}`}
                      style={styles.productName}
                    >
                      {p.product}
                    </Text>

                    <Text
                      testID={`product-technical-name-${p.id}`}
                      style={styles.detail}
                    >
                      {p.tecnical_name}
                    </Text>
                  </View>

                  <View style={styles.priceMain}>
                    <Text
                      testID={`product-price-${p.id}`}
                      style={styles.priceValue}
                    >
                      {Number(p.price).toFixed(2)} €
                    </Text>
                  </View>
                </View>

                <View style={styles.priceBottom}>
                  <Text
                    testID={`product-price-kg-${p.id}`}
                    style={styles.smallInfo}
                  >
                    {Number(p.price_per_kg).toFixed(2)} €/kg
                  </Text>

                  <Text
                    testID={`product-units-${p.id}`}
                    style={styles.smallInfo}
                  >
                    {Number(p.left_units).toFixed(2)} {t('market.units')}
                  </Text>

                  <Pressable
                    testID={`buy-button-${p.id}`}
                    onPress={() => {}}
                    style={({ pressed }) => [
                      styles.buyBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      testID={`buy-text-${p.id}`}
                      style={styles.buyText}
                    >
                      {t('market.buy')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.statusText}>No hi ha productes.</Text>
          )
        ) : visibleNews.length > 0 ? (
          visibleNews.map((n) => (
            <View
              key={n.id}
              testID={`news-item-${n.id}`}
              style={styles.priceCard}
            >
              <View style={styles.chip}>
                <Text
                  testID={`news-subtitle-${n.id}`}
                  style={styles.chipText}
                >
                  {n.subtile}
                </Text>
              </View>

              <Text
                testID={`news-title-${n.id}`}
                style={styles.newsTitle}
              >
                {n.title}
              </Text>

              <Text
                testID={`news-content-${n.id}`}
                style={styles.newsBody}
              >
                {n.content}
              </Text>

              <Text style={styles.source}>{n.agent}</Text>
            </View>
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
              source={require('@/assets/images/left_arrow.png')}
              style={styles.arrowIcon}
              resizeMode="contain"
            />
          </Pressable>

          <Text
            testID="market-page-indicator"
            style={styles.pageText}
          >
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
              source={require('@/assets/images/right_arrow.png')}
              style={styles.arrowIcon}
              resizeMode="contain"
            />
          </Pressable>
        </View>
      )}
    </View>
  );
}
