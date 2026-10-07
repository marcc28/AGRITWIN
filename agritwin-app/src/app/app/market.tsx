import { useEffect, useState } from 'react';
import {
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

const styles = getMarketStyles(Colors.light);

export default function MarketScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [tab, setTab] = useState<Tab>('prices');
  const [products, setProducts] = useState<Product[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.trackWrap}>
        <View style={styles.track}>
          {(['prices', 'news'] as Tab[]).map((k) => {
            const active = tab === k;

            return (
              <Pressable
                key={k}
                testID={`market-tab-${k}`}
                onPress={() => setTab(k)}
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
                    { color: active ? '#fff' : '#111' },
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
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'prices'
          ? products.map((p) => (
              <View
                key={p.id}
                testID={`product-item-${p.id}`}
                style={styles.priceCard}
              >
                <View style={styles.priceTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{p.product}</Text>

                    <Text style={styles.detail}>{p.tecnical_name}</Text>
                  </View>

                  <View style={styles.priceMain}>
                    <Text style={styles.priceValue}>
                      {Number(p.price).toFixed(2)} €
                    </Text>
                  </View>
                </View>

                <View style={styles.priceBottom}>
                  <Text style={styles.smallInfo}>
                    {Number(p.price_per_kg).toFixed(2)} €/kg
                  </Text>

                  <Text style={styles.smallInfo}>
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
                    <Text style={styles.buyText}>{t('market.buy')}</Text>
                  </Pressable>
                </View>
              </View>
            ))
          : news.map((n) => (
              <View
                key={n.id}
                testID={`news-item-${n.id}`}
                style={styles.priceCard}
              >
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{n.subtile}</Text>
                </View>

                <Text style={styles.newsTitle}>{n.title}</Text>

                <Text style={styles.newsBody}>{n.content}</Text>

                <Text style={styles.source}>{n.agent}</Text>
              </View>
            ))}
      </ScrollView>
    </View>
  );
}
