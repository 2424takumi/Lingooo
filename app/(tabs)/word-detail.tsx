import { StyleSheet, View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import * as Speech from 'expo-speech';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { DefinitionList } from '@/components/ui/definition-list';
import { WordMetaMetrics } from '@/components/ui/word-meta-metrics';
import { ExampleCard } from '@/components/ui/example-card';
import { ChatSection } from '@/components/ui/chat-section';
import { ShimmerHeader, ShimmerDefinitions, ShimmerMetrics, ShimmerExamples } from '@/components/ui/shimmer';
import { useChatSession } from '@/hooks/use-chat-session';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getWordDetailStream } from '@/services/api/search';
import type { WordDetailResponse } from '@/types/search';
import { getCachedWordDetail, getPendingPromise } from '@/services/cache/word-detail-cache';
import { toQAPairs } from '@/utils/chat';
import { logger } from '@/utils/logger';

export default function WordDetailScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const router = useRouter();
  const params = useLocalSearchParams();

  const [wordData, setWordData] = useState<Partial<WordDetailResponse> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // パラメータから単語を取得
  const word = params.word as string || '';
  const dataParam = params.data as string;
  const fromPage = params.fromPage as string;
  const searchQuery = params.searchQuery as string;
  const searchResults = params.searchResults as string;

  const chatContext = useMemo(() => {
    if (!wordData?.headword) {
      return undefined;
    }

    return {
      headword: wordData.headword.lemma,
      senses: wordData.senses?.map((sense) => sense.glossShort) ?? [],
      examples:
        wordData.examples?.map((example) => ({
          english: example.textSrc,
          japanese: example.textDst,
        })) ?? [],
    };
  }, [wordData]);

  const {
    messages: chatMessages,
    followUps,
    isStreaming: isChatStreaming,
    error: chatError,
    sendMessage: sendChatMessage,
    sendQuickQuestion,
  } = useChatSession({
    scope: 'word',
    identifier: word,
    context: chatContext,
  });

  const qaPairs = useMemo(
    () => toQAPairs(chatMessages, { fallbackError: chatError }),
    [chatMessages, chatError]
  );

  useEffect(() => {
    const loadWordData = async () => {
      try {
        setIsLoading(true);
        setLoadingProgress(0);

        // パラメータでデータが渡されている場合はそれを使用
        if (dataParam) {
          const data = JSON.parse(dataParam);
          setWordData(data);
          setLoadingProgress(100);
          setIsLoading(false);
        } else if (word) {
          // キャッシュをチェック
          const cachedData = getCachedWordDetail(word);
          if (cachedData) {
            // キャッシュヒット：即座に表示
            logger.debug('[WordDetail] USING CACHED DATA');
            setWordData(cachedData);
            setLoadingProgress(100);
            setIsLoading(false);
            return;
          }

          // 実行中のPre-flight requestをチェック
          const pendingPromise = getPendingPromise(word);
          if (pendingPromise) {
            // Pre-flight requestが実行中：それを待つ
            logger.debug('[WordDetail] WAITING FOR PRE-FLIGHT');
            try {
              const data = await pendingPromise;
              logger.debug('[WordDetail] PRE-FLIGHT DATA RECEIVED');
              setWordData(data);
              setLoadingProgress(100);
              setIsLoading(false);
              return;
            } catch (err) {
              logger.warn('[WordDetail] Pre-flight failed, using normal fetch');
            }
          }

          // キャッシュなし：通常のAPI呼び出し（ストリーミング）
          logger.debug('[WordDetail] Starting STREAMING API call');
          let data;
          try {
            data = await getWordDetailStream(word, (progress, partialData) => {
              logger.debug(`[WordDetail] Progress: ${progress}%`, {
                hasPartialData: !!partialData,
                sections: partialData ? Object.keys(partialData) : []
              });
              setLoadingProgress(progress);

              // 部分データが来たらすぐに表示（段階的レンダリング）
              if (partialData) {
                logger.debug('[WordDetail] Partial data received, updating UI');
                setWordData(partialData);

                // 完了したらローディング状態を解除
                if (progress === 100) {
                  logger.debug('[WordDetail] Data complete, disabling loading');
                  setIsLoading(false);
                }
              }
            });
          } catch (streamError) {
            logger.error('[WordDetail] getWordDetailStream error:', streamError);
            throw streamError;
          }

          // 最終データをセット（念のため）
          logger.debug('[WordDetail] Final data received');
          setWordData(data);
          setLoadingProgress(100);
          setIsLoading(false);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '単語の読み込みに失敗しました';
        setError(message);
        setIsLoading(false);
      }
    };

    loadWordData();
  }, [word, dataParam]);

  const handleBackPress = () => {
    // searchページから来た場合は、searchページに戻る
    if (fromPage === 'search' && searchQuery && searchResults) {
      router.push({
        pathname: '/(tabs)/search',
        params: {
          query: searchQuery,
          results: searchResults,
        },
      });
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handlePronouncePress = async () => {
    if (!wordData?.headword) return;

    try {
      // 現在の音声を停止
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        await Speech.stop();
        return;
      }

      // 単語を発音
      Speech.speak(wordData.headword.lemma, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.75, // 少しゆっくり発音
      });
    } catch (error) {
      logger.error('Failed to pronounce word:', error);
    }
  };

  const handleQuestionPress = (question: string) => {
    void sendQuickQuestion(question);
  };

  const handleChatSubmit = async (text: string) => {
    await sendChatMessage(text);
  };

  const handleChatRetry = () => {
    const lastUserMessage = [...chatMessages].reverse().find((msg) => msg.role === 'user');
    if (lastUserMessage) {
      void sendChatMessage(lastUserMessage.content);
    }
  };

  const handleQACardRetry = (question: string) => {
    if (!question.trim()) {
      return;
    }
    void sendChatMessage(question);
  };

  if (error) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
        <StatusBar style="auto" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || '単語が見つかりませんでした'}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Text style={styles.backButtonText}>戻る</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header - 最初に表示 */}
          {wordData?.headword ? (
            <View style={styles.headerContainer}>
              <UnifiedHeaderBar
                pageType="wordDetail"
                word={wordData.headword.lemma}
                posTags={wordData.headword.pos || []}
                onBackPress={handleBackPress}
                onPronouncePress={handlePronouncePress}
              />
            </View>
          ) : isLoading ? (
            <View style={styles.headerContainer}>
              <ShimmerHeader />
            </View>
          ) : null}

          {/* Definitions - 2番目に表示 */}
          {wordData?.senses && wordData.senses.length > 0 ? (
            <View style={styles.definitionsContainer}>
              <DefinitionList
                definitions={wordData.senses.map(s => s.glossShort)}
              />
            </View>
          ) : isLoading ? (
            <View style={styles.definitionsContainer}>
              <ShimmerDefinitions />
            </View>
          ) : null}

          {/* Word Metrics - 3番目に表示 */}
          {wordData?.metrics ? (
            <View style={styles.metricsContainer}>
              <WordMetaMetrics
                frequency={wordData.metrics.frequency}
                difficulty={wordData.metrics.difficulty}
                nuance={wordData.metrics.nuance}
              />
            </View>
          ) : isLoading ? (
            <View style={styles.metricsContainer}>
              <ShimmerMetrics />
            </View>
          ) : null}

          {/* Examples Section - 最後に表示 */}
          {wordData?.examples && wordData.examples.length > 0 ? (
            <View style={styles.examplesSection}>
              <Text style={styles.sectionTitle}>例文</Text>
              <View style={styles.examplesList}>
                {wordData.examples.map((example, index) => (
                  <ExampleCard
                    key={index}
                    english={example.textSrc}
                    japanese={example.textDst}
                  />
                ))}
              </View>
            </View>
          ) : isLoading ? (
            <View style={styles.examplesSection}>
              <Text style={styles.sectionTitle}>例文</Text>
              <ShimmerExamples />
            </View>
          ) : null}

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
          onQuickQuestion={handleQuestionPress}
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
    paddingTop: 62,
    paddingHorizontal: 16,
    paddingBottom: 220, // ChatSection分のスペースを確保
  },
  headerContainer: {
    marginBottom: 24,
  },
  definitionsContainer: {
    marginBottom: 24,
  },
  metricsContainer: {
    marginBottom: 24,
  },
  examplesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#686868',
    letterSpacing: 4,
    marginBottom: 12,
    marginLeft: 2,
  },
  examplesList: {
    gap: 12,
  },
  chatContainerFixed: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 50,
    justifyContent: 'flex-end',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#CC0000',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#00AA69',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 11,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
