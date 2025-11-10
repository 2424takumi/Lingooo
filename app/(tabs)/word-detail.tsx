import { StyleSheet, View, ScrollView, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import Svg, { Path } from 'react-native-svg';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { DefinitionList } from '@/components/ui/definition-list';
import { WordMetaMetrics } from '@/components/ui/word-meta-metrics';
import { ExampleCard } from '@/components/ui/example-card';
import { ChatSection } from '@/components/ui/chat-section';
import { ShimmerHeader, ShimmerDefinitions, ShimmerMetrics, ShimmerExamples } from '@/components/ui/shimmer';
import { BookmarkToast } from '@/components/ui/bookmark-toast';
import { loadFolders, updateBookmarkFolder, type BookmarkFolder } from '@/services/storage/bookmark-storage';
import { useChatSession } from '@/hooks/use-chat-session';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAISettings } from '@/contexts/ai-settings-context';
import { getWordDetailStream } from '@/services/api/search';
import type { WordDetailResponse } from '@/types/search';
import { getCachedWordDetail, getPendingPromise } from '@/services/cache/word-detail-cache';
import { toQAPairs } from '@/utils/chat';
import { logger } from '@/utils/logger';
import { addSearchHistory, removeSearchHistoryItem, getSearchHistory } from '@/services/storage/search-history-storage';

export default function WordDetailScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const router = useRouter();
  const params = useLocalSearchParams();
  const { aiDetailLevel, setAIDetailLevel } = useAISettings();
  const safeAreaInsets = useSafeAreaInsets();

  const [wordData, setWordData] = useState<Partial<WordDetailResponse> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ブックマークトースト & フォルダ選択
  const [toastVisible, setToastVisible] = useState(false);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null);
  const [isFolderSelectModalOpen, setIsFolderSelectModalOpen] = useState(false);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);

  // パラメータから単語を取得
  const word = params.word as string || '';
  const targetLanguage = (params.targetLanguage as string) || 'en'; // 学習言語コード
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

  // チャット識別子：正しい単語（headword.lemma）を使用、ロード前はパラメータの単語を使用
  const chatIdentifier = wordData?.headword?.lemma || word;

  const {
    messages: chatMessages,
    followUps,
    isStreaming: isChatStreaming,
    error: chatError,
    sendMessage: sendChatMessage,
    sendQuickQuestion,
  } = useChatSession({
    scope: 'word',
    identifier: chatIdentifier,
    context: chatContext,
    targetLanguage,
  });

  const qaPairs = useMemo(
    () => toQAPairs(chatMessages, { fallbackError: chatError }),
    [chatMessages, chatError]
  );

  // オーディオモードを設定（サイレントモードでも音声再生を可能に）
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true, // iOSのサイレントモードでも再生
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          // Playbackカテゴリを使用（YouTubeと同じ）
          allowsRecordingIOS: false,
          interruptionModeIOS: 1, // DoNotMix
          interruptionModeAndroid: 1, // DoNotMix
        });
        logger.info('[Audio] Audio mode configured successfully');
      } catch (error) {
        logger.error('[Audio] Failed to configure audio mode:', error);
      }
    };

    configureAudio();
  }, []);

  useEffect(() => {
    const loadWordData = async () => {
      try {
        // wordが変わった瞬間に前のデータをクリア
        setWordData(null);
        setIsLoading(true);
        setLoadingProgress(0);
        setError(null);

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
            data = await getWordDetailStream(word, targetLanguage, (progress, partialData) => {
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
  }, [word, dataParam, targetLanguage]);

  // 検索履歴を正しい単語で更新（誤字の場合）
  useEffect(() => {
    const updateSearchHistoryWithCorrectWord = async () => {
      // wordDataが読み込まれ、headwordが存在する場合のみ
      if (!wordData?.headword?.lemma || !word || isLoading) {
        return;
      }

      const correctWord = wordData.headword.lemma;
      const inputWord = word.trim().toLowerCase();
      const normalizedCorrectWord = correctWord.trim().toLowerCase();

      // 入力された単語と正しい単語が異なる場合（誤字があった場合）
      if (inputWord !== normalizedCorrectWord) {
        try {
          logger.info('[WordDetail] Fixing search history: replacing typo with correct word', {
            input: inputWord,
            correct: correctWord,
          });

          // 既存の検索履歴を取得
          const history = await getSearchHistory();

          // 誤字のエントリを探して削除
          const typoEntry = history.find(
            (item) => item.query.trim().toLowerCase() === inputWord && item.language === targetLanguage
          );

          if (typoEntry) {
            await removeSearchHistoryItem(typoEntry.id);
            logger.info('[WordDetail] Removed typo entry from search history:', typoEntry.query);
          }

          // 正しい単語を検索履歴に追加
          await addSearchHistory(correctWord, targetLanguage);
          logger.info('[WordDetail] Added correct word to search history:', correctWord);
        } catch (error) {
          logger.error('[WordDetail] Failed to update search history:', error);
          // エラーが起きても続行（検索履歴の更新は重要ではない）
        }
      }
    };

    void updateSearchHistoryWithCorrectWord();
  }, [wordData, word, targetLanguage, isLoading]);

  // フォルダを読み込む
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const data = await loadFolders();
        setFolders(data);
      } catch (error) {
        logger.error('[WordDetail] Failed to load folders:', error);
      }
    };
    void fetchFolders();
  }, []);

  // ブックマーク追加時のハンドラー
  const handleBookmarkAdded = (bookmarkId: string) => {
    setSelectedBookmarkId(bookmarkId);
    setToastVisible(true);
  };

  // トースト終了時
  const handleToastDismiss = () => {
    setToastVisible(false);
    setSelectedBookmarkId(null);
  };

  // フォルダ選択モーダルを開く
  const handleOpenFolderSelect = () => {
    setIsFolderSelectModalOpen(true);
  };

  // フォルダにブックマークを追加
  const handleAddToFolder = async (folderId?: string) => {
    if (!selectedBookmarkId) return;

    try {
      await updateBookmarkFolder(selectedBookmarkId, folderId);
      setIsFolderSelectModalOpen(false);
      setSelectedBookmarkId(null);
      logger.debug('[WordDetail] Bookmark added to folder:', folderId);
    } catch (error) {
      logger.error('[WordDetail] Failed to add bookmark to folder:', error);
    }
  };

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
    if (!wordData?.headword) {
      logger.warn('[Pronounce] No headword data');
      return;
    }

    try {
      logger.info('[Pronounce] Starting pronunciation for:', wordData.headword.lemma);

      // オーディオモードを再確認（念のため）
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          allowsRecordingIOS: false,
          interruptionModeIOS: 1, // DoNotMix
          interruptionModeAndroid: 1, // DoNotMix
        });
        logger.info('[Pronounce] Audio mode reconfigured');
      } catch (audioError) {
        logger.warn('[Pronounce] Failed to reconfigure audio mode:', audioError);
      }

      // 現在の音声を停止
      const isSpeaking = await Speech.isSpeakingAsync();
      logger.info('[Pronounce] Is currently speaking:', isSpeaking);

      if (isSpeaking) {
        logger.info('[Pronounce] Stopping current speech');
        await Speech.stop();
        return;
      }

      // 言語コードから音声言語コードへのマッピング
      const languageMap: Record<string, string> = {
        en: 'en-US',
        es: 'es-ES',
        pt: 'pt-BR',
        zh: 'zh-CN',
        fr: 'fr-FR',
        de: 'de-DE',
        ko: 'ko-KR',
        it: 'it-IT',
        ru: 'ru-RU',
        ar: 'ar-SA',
        hi: 'hi-IN',
      };

      const speechLanguage = languageMap[targetLanguage] || 'en-US';
      logger.info('[Pronounce] Using language:', speechLanguage, 'for target:', targetLanguage);

      // 単語を発音
      Speech.speak(wordData.headword.lemma, {
        language: speechLanguage,
        pitch: 1.0,
        rate: 0.75, // 少しゆっくり発音
        onStart: () => {
          logger.info('[Pronounce] Speech started');
        },
        onDone: () => {
          logger.info('[Pronounce] Speech completed');
        },
        onError: (error) => {
          logger.error('[Pronounce] Speech error:', error);
        },
      });

      logger.info('[Pronounce] Speech.speak() called successfully');
    } catch (error) {
      logger.error('[Pronounce] Failed to pronounce word:', error);
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
                gender={wordData.headword.gender}
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={safeAreaInsets.bottom}
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
            onQuickQuestion={handleQuestionPress}
            onRetryQuestion={handleQACardRetry}
            onDetailLevelChange={setAIDetailLevel}
            scope="word"
            identifier={chatIdentifier}
            onBookmarkAdded={handleBookmarkAdded}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Bookmark Toast */}
      <BookmarkToast
        visible={toastVisible}
        onAddToFolder={handleOpenFolderSelect}
        onDismiss={handleToastDismiss}
      />

      {/* Folder Select Modal */}
      <Modal
        visible={isFolderSelectModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsFolderSelectModalOpen(false);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setIsFolderSelectModalOpen(false);
          }}
        >
          <View style={styles.folderSelectModalContainer} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>フォルダに追加</Text>

            <ScrollView style={styles.folderSelectList} showsVerticalScrollIndicator={false}>
              {/* No folder option */}
              <TouchableOpacity
                style={styles.folderSelectItem}
                onPress={() => handleAddToFolder(undefined)}
              >
                <Text style={styles.folderSelectItemText}>フォルダなし</Text>
              </TouchableOpacity>

              {/* Existing folders */}
              {folders.map((folder) => (
                <TouchableOpacity
                  key={folder.id}
                  style={styles.folderSelectItem}
                  onPress={() => handleAddToFolder(folder.id)}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z"
                      stroke="#00AA69"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={styles.folderSelectItemText}>{folder.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setIsFolderSelectModalOpen(false);
              }}
            >
              <Text style={styles.modalCancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingBottom: 220, // ChatSection分のスペースを確保（高さ116 + 余裕104）
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
  keyboardAvoidingView: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  chatContainerFixed: {
    paddingHorizontal: 16,
    paddingBottom: 14,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  folderSelectModalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  folderSelectList: {
    maxHeight: 300,
  },
  folderSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
  },
  folderSelectItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
  },
  modalCancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#686868',
  },
});
