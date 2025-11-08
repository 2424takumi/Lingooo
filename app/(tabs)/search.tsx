import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { WordCard } from '@/components/ui/word-card';
import { ChatSection } from '@/components/ui/chat-section';
import { ShimmerSuggestions } from '@/components/ui/shimmer';
import { useChatSession } from '@/hooks/use-chat-session';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useAISettings } from '@/contexts/ai-settings-context';
import { getCachedSuggestions, subscribeSuggestions } from '@/services/cache/suggestion-cache';
import { prefetchWordDetail } from '@/services/cache/word-detail-cache';
import { getWordDetailStream, searchJaToEn } from '@/services/api/search';
import { toQAPairs } from '@/utils/chat';
import { logger } from '@/utils/logger';
import type { SuggestionItem } from '@/types/search';

export default function SearchScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentLanguage } = useLearningLanguages();
  const { aiDetailLevel, setAIDetailLevel } = useAISettings();

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

  // queryまたは言語が変わったら再検索
  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    // 新しいqueryまたは言語の場合は、前の結果をクリア
    setSuggestions([]);
    setIsLoading(true);

    // キャッシュチェック
    const cached = getCachedSuggestions(query, currentLanguage.code);
    if (cached && cached.length > 0) {
      logger.debug('[Search] Using cached suggestions');
      setSuggestions(cached);
      setIsLoading(false);
      return;
    }

    // API呼び出し
    const fetchSuggestions = async () => {
      try {
        logger.info(`[Search] Fetching ${currentLanguage.code} suggestions for:`, query);
        const result = await searchJaToEn(query, currentLanguage.code);
        logger.info('[Search] Received suggestions:', result.items.length);
        setSuggestions(result.items);
      } catch (error) {
        logger.error('[Search] Failed to fetch suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [query, currentLanguage.code]); // currentLanguage.codeも監視

  // サブスクリプション（キャッシュ更新を受信）
  useEffect(() => {
    if (!query) {
      return;
    }

    const currentQuery = query; // クロージャで現在のクエリを保持

    const unsubscribe = subscribeSuggestions(query, (items) => {
      // 現在表示中のクエリと一致する場合のみ更新
      if (currentQuery === query) {
        logger.debug('[Search] Received updated suggestions from subscription');
        setSuggestions(items);
      }
    }, currentLanguage.code);

    return unsubscribe;
  }, [query, currentLanguage.code]);

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
    targetLanguage: currentLanguage.code,
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
    prefetchWordDetail(item.lemma, () => getWordDetailStream(item.lemma, currentLanguage.code));

    router.push({
      pathname: '/(tabs)/word-detail',
      params: {
        word: item.lemma,
        targetLanguage: currentLanguage.code, // 言語コードを渡す
        fromPage: 'search',
        searchQuery: query,
        searchResults: JSON.stringify(suggestions),
      },
    });
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
              <View style={styles.wordCardList}>
                <ShimmerSuggestions />
              </View>
            ) : suggestions.length > 0 ? (
              <View style={styles.wordCardList}>
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
                      description={item.usageHint || ''}
                    />
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>
                  「{query}」の検索結果が見つかりませんでした
                </Text>
              </View>
            )}
          </View>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>

      {/* Chat Section - Fixed at bottom */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={0}
      >
        <View pointerEvents="box-none" style={styles.chatContainerFixed}>
          <ChatSection
            placeholder="この単語について質問をする..."
            qaPairs={qaPairs}
            followUps={followUps}
            isStreaming={isChatStreaming}
            error={qaPairs.length === 0 ? chatError : null}
            detailLevel={aiDetailLevel}
            onSend={handleChatSubmit}
            onQuickQuestion={sendQuickQuestion}
            onRetryQuestion={handleQACardRetry}
            onDetailLevelChange={setAIDetailLevel}
            scope="search"
            identifier={query}
          />
        </View>
      </KeyboardAvoidingView>
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
    paddingBottom: 280, // ChatSection分のスペースを確保（高さ170 + 余裕110）
  },
  headerContainer: {
    marginBottom: 39,
  },
  searchResultView: {
    gap: 36,
  },
  wordCardList: {
    gap: 12,
  },
  wordCardPressable: {
    width: '100%',
  },
  keyboardAvoidingView: {
    position: 'absolute',
    top: 141,
    bottom: 0,
    left: 0,
    right: 0,
  },
  chatContainerFixed: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 26,
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
