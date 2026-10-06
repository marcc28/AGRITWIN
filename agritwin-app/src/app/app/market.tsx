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
import { styles } from '../../styles/market.styles';
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

export default function MarketScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [tab, setTab] = useState<Tab>('prices');
  const [products, setProducts] = useState<Product[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await getcontentfeed(0, 10);
        setProducts(data);
      } catch (error) {
        console.error('Error carregant productes:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

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
        console.error('Error carregant dades del mercat:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.trackWrap}>
        <View style={styles.track}>
          {(['prices', 'news'] as Tab[]).map((k) => {
            const active = tab === k;

            return (
              <Pressable
                key={k}
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
              <View key={p.id} style={styles.priceCard}>
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
                    {Number(p.left_units).toFixed(2)} unitats
                  </Text>

                  <Pressable
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
              <View key={n.id} style={styles.card}>
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
