import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { getNewsById, type News } from '@/services/api_market';
import { getNewsDetailStyles } from '@/styles/news-detail.styles';

export default function NewsDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();

  const newsId = Array.isArray(id) ? id[0] : id;

  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const styles = getNewsDetailStyles(colors);

  const [news, setNews] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadNews() {
      setLoading(true);
      setError(null);
      setNews(null);

      try {
        if (!newsId) {
          throw new Error('No s’ha indicat cap notícia.');
        }

        const data = await getNewsById(String(newsId));

        if (active) {
          setNews(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'No s’ha pogut carregar la notícia.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadNews();

    return () => {
      active = false;
    };
  }, [newsId]);

  let articleContent: React.ReactNode;
  if (loading) {
    articleContent = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Carregant notícia...</Text>
      </View>
    );
  } else if (error !== null) {
    articleContent = <Text style={styles.errorText}>{error}</Text>;
  } else if (news === null) {
    articleContent = (
      <Text style={styles.errorText}>No s’ha trobat la notícia.</Text>
    );
  } else {
    articleContent = (
      <>
        {news.image_url ? (
          <Image
            source={{ uri: news.image_url }}
            accessibilityLabel={`Imatge de ${news.title}`}
            resizeMode="cover"
            style={styles.image}
          />
        ) : null}
        <Text style={styles.subtitle}>{news.subtile}</Text>
        <Text style={styles.title}>{news.title}</Text>
        <View style={styles.separator} />
        <Text style={styles.content}>{news.content}</Text>
        <Text style={styles.source}>Font: {news.agent}</Text>
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Tornar al mercat</Text>
        </Pressable>

        <View style={styles.card}>{articleContent}</View>
      </ScrollView>
    </View>
  );
}
