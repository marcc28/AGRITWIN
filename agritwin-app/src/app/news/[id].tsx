
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

export default function NewsDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();

  const newsId = Array.isArray(id) ? id[0] : id;

  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

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

  const textColor = colors.text;
  const mutedColor = colors.textMuted;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          flexGrow: 1,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={{ marginBottom: 24, paddingVertical: 8 }}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: 16,
              fontWeight: '700',
            }}
          >
            ‹ Tornar al mercat
          </Text>
        </Pressable>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 22,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: textColor, marginTop: 12 }}>
                Carregant notícia...
              </Text>
            </View>
          ) : error || !news ? (
            <Text style={{ color: textColor, lineHeight: 24 }}>
              {error ?? 'No s’ha trobat la notícia.'}
            </Text>
          ) : (
            <>
              {news.image_url ? (
                <Image
                  source={{ uri: news.image_url }}
                  accessibilityLabel={`Imatge de ${news.title}`}
                  resizeMode="cover"
                  style={{
                    width: '100%',
                    aspectRatio: 1.65,
                    borderRadius: 14,
                    marginBottom: 22,
                    backgroundColor: colors.surfaceSecondary,
                  }}
                />
              ) : null}

              <Text
                style={{
                  color: colors.primary,
                  fontSize: 12,
                  fontWeight: '800',
                  letterSpacing: 1,
                  marginBottom: 12,
                }}
              >
                {news.subtile}
              </Text>

              <Text
                style={{
                  color: textColor,
                  fontSize: 28,
                  lineHeight: 35,
                  fontWeight: '900',
                  marginBottom: 18,
                }}
              >
                {news.title}
              </Text>

              <View
                style={{
                  height: 1,
                  backgroundColor: colors.border,
                  marginBottom: 18,
                }}
              />

              <Text
                style={{
                  color: textColor,
                  fontSize: 16,
                  lineHeight: 27,
                }}
              >
                {news.content}
              </Text>

              <Text
                style={{
                  color: mutedColor,
                  fontSize: 13,
                  marginTop: 24,
                  fontWeight: '600',
                }}
              >
                Font: {news.agent}
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
