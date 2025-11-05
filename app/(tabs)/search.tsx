import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ExampleGroup } from '@/components/ui/example-group';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { WordCard } from '@/components/ui/word-card';
import { ChatSection } from '@/components/ui/chat-section';
import { ShimmerSuggestions } from '@/components/ui/shimmer';
import { useChatSession } from '@/hooks/use-chat-session';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getCachedSuggestions, subscribeSuggestions } from '@/services/cache/suggestion-cache';
import { prefetchWordDetail } from '@/services/cache/word-detail-cache';
import { getWordDetailStream, searchJaToEn } from '@/services/api/search';
import { toQAPairs } from '@/utils/chat';
import { logger } from '@/utils/logger';
import type { SuggestionItem } from '@/types/search';

const examples = [
  {
    english: 'He studies English every morning before work.',
    japanese: '彼は仕事の前に毎朝英語を勉強しています。',
  },
  {
    english: 'He studies English every morning before work.',
    japanese: '彼は仕事の前に毎朝英語を勉強しています。',
  },
];

export default function SearchScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const router = useRouter();
  const params = useLocalSearchParams();

  const query = typeof params.query === 'string' ? params.query : '';
  const resultsParam = typeof params.results === 'string' ? params.results : '[]';

  const initialResults = useMemo<SuggestionItem[]>(() => {
    try {
      const parsed = JSON.parse(resultsParam);
      return Array.isArray(parsed) ? (parsed as SuggestionItem[]) : [];
    } catch (error) {
      logger.warn('[Search] Failed to parse search results', error);
      return [];
    }
  }, [resultsParam]);

  const [suggestions, setSuggestions] = useState<SuggestionItem[]>(initialResults);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSuggestions(initialResults);
  }, [initialResults]);

  // 即座に画面遷移した場合（resultsパラメータがない）はAPI呼び出し
  useEffect(() => {
    if (!query) {
      return;
    }

    // パラメータからresultsが渡されている場合はスキップ
    if (initialResults.length > 0) {
      return;
    }

    // キャッシュチェック
    const cached = getCachedSuggestions(query);
    if (cached && cached.length > 0) {
      logger.debug('[Search] Using cached suggestions');
      setSuggestions(cached);
      return;
    }

    // API呼び出し
    const fetchSuggestions = async () => {
      try {
        setIsLoading(true);
        logger.info('[Search] Fetching suggestions for:', query);
        const result = await searchJaToEn(query);
        logger.info('[Search] Received suggestions:', result.items.length);
        setSuggestions(result.items);
      } catch (error) {
        logger.error('[Search] Failed to fetch suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [query, initialResults]);

  // サブスクリプション（キャッシュ更新を受信）
  useEffect(() => {
    if (!query) {
      return;
    }

    const unsubscribe = subscribeSuggestions(query, (items) => {
      logger.debug('[Search] Received updated suggestions from subscription');
      setSuggestions(items);
    });

    return unsubscribe;
  }, [query]);

  const chatContext = useMemo(
    () => ({
      searchSuggestions: suggestions.map((item) => ({
        lemma: item.lemma,
        shortSenseJa: item.shortSenseJa,
      })),
    }),
    [suggestions]
  );

  const {
    messages: chatMessages,
    followUps,
    isStreaming: isChatStreaming,
    error: chatError,
    sendMessage: sendChatMessage,
    sendQuickQuestion,
  } = useChatSession({
    scope: 'search',
    identifier: query,
    context: chatContext,
  });

  const qaPairs = useMemo(
    () => toQAPairs(chatMessages, { fallbackError: chatError }),
    [chatMessages, chatError]
  );

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleChatSubmit = async (text: string) => {
    await sendChatMessage(text);
  };

  const handleLanguagePress = () => {
    // TODO: Implement language selection
  };

  const handleQACardRetry = (question: string) => {
    if (!question.trim()) {
      return;
    }
    void sendChatMessage(question);
  };

  const handleWordCardPress = (item: SuggestionItem) => {
    prefetchWordDetail(item.lemma, () => getWordDetailStream(item.lemma));

    router.push({
      pathname: '/(tabs)/word-detail',
      params: {
        word: item.lemma,
        fromPage: 'search',
        searchQuery: query,
        searchResults: JSON.stringify(suggestions),
      },
    });
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <UnifiedHeaderBar
              pageType="jpSearch"
              title={query || '学習する'}
              selectedFlag="🇺🇸"
              onLanguagePress={handleLanguagePress}
              onBackPress={handleBackPress}
            />
          </View>

          {/* Word Cards */}
          <View style={styles.searchResultView}>
            {isLoading && suggestions.length === 0 ? (
              <ShimmerSuggestions />
            ) : suggestions.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.wordCardList}
              >
                {suggestions.map((item, index) => (
                  <Pressable
                    key={`${item.lemma}-${index}`}
                    style={styles.wordCardPressable}
                    accessibilityRole="button"
                    onPress={() => handleWordCardPress(item)}
                  >
                    <WordCard
                      word={item.lemma}
                      posTags={item.pos}
                      definitions={[item.shortSenseJa]}
                      description={`信頼度: ${Math.round(item.confidence * 100)}%`}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>
                  「{query}」の検索結果が見つかりませんでした
                </Text>
              </View>
            )}

            {/* Examples */}
            <View style={styles.exampleList}>
              {examples.map((example, index) => (
                <ExampleGroup
                  key={index}
                  english={example.english}
                  japanese={example.japanese}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Chat Section - Fixed at bottom */}
      <View pointerEvents="box-none" style={styles.chatContainerFixed}>
        <ChatSection
          placeholder="この単語について質問をする..."
          qaPairs={qaPairs}
          followUps={followUps}
          isStreaming={isChatStreaming}
          error={qaPairs.length === 0 ? chatError : null}
          onSend={handleChatSubmit}
          onQuickQuestion={sendQuickQuestion}
          onRetryQuestion={handleQACardRetry}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 61,
    paddingHorizontal: 16,
    paddingBottom: 220, // ChatSection分のスペースを確保
  },
  headerContainer: {
    marginBottom: 39,
  },
  searchResultView: {
    gap: 36,
  },
  wordCardList: {
    gap: 12,
    paddingRight: 16,
  },
  wordCardPressable: {
    minWidth: 150,
  },
  exampleList: {
    gap: 18,
    paddingLeft: 0,
  },
  chatContainerFixed: {
    position: 'absolute',
    top: 141,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 40,
    justifyContent: 'flex-end',
  },
  noResultsContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#686868',
    textAlign: 'center',
  },
});
