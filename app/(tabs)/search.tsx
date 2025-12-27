import { useEffect, useMemo, useState, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { WordCard } from '@/components/ui/word-card';
import { ChatSection } from '@/components/ui/chat-section';
import { ShimmerSuggestions } from '@/components/ui/shimmer';
import { BookmarkToast } from '@/components/ui/bookmark-toast';
import { FolderSelectModal } from '@/components/modals/FolderSelectModal';
import { CreateFolderModal } from '@/components/modals/CreateFolderModal';
import { SubscriptionBottomSheet } from '@/components/ui/subscription-bottom-sheet';
import { QuotaExceededModal } from '@/components/ui/quota-exceeded-modal';
import { useChatSession } from '@/hooks/use-chat-session';
import { useBookmarkManagement } from '@/hooks/use-bookmark-management';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useAISettings } from '@/contexts/ai-settings-context';
import { useSubscription } from '@/contexts/subscription-context';
import { getCachedSuggestions, subscribeSuggestions } from '@/services/cache/suggestion-cache';
import { prefetchWordDetail } from '@/services/cache/word-detail-cache';
import { getWordDetailStream, searchJaToEn } from '@/services/api/search';
import { addSearchHistory } from '@/services/storage/search-history-storage';
import { toQAPairs } from '@/utils/chat';
import { logger } from '@/utils/logger';
import { parseQuotaError } from '@/utils/quota-error';
import { getNuanceType } from '@/utils/nuance';
import type { SuggestionItem } from '@/types/search';
import { generateId } from '@/utils/id';
import type { QAPair } from '@/types/chat';
import { detectLang } from '@/services/utils/language-detect';

// SuggestionItemのZodスキーマ定義
const SuggestionItemSchema = z.object({
  lemma: z.string(),
  pos: z.array(z.string()),
  gender: z.enum(['m', 'f', 'n', 'mf']).optional(),
  shortSense: z.array(z.string()),
  confidence: z.number(),
  usageHint: z.string().optional(),
  nuance: z.number().optional(),
});

const SuggestionListSchema = z.array(SuggestionItemSchema);

export default function SearchScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentLanguage, nativeLanguage } = useLearningLanguages();
  const { isPremium } = useSubscription();
  const safeAreaInsets = useSafeAreaInsets();

  const query = typeof params.query === 'string' ? params.query : '';
  const resultsParam = typeof params.results === 'string' ? params.results : '[]';

  // ヘッダーの高さを測定
  const [headerHeight, setHeaderHeight] = useState(52); // デフォルト値

  const initialResults = useMemo<SuggestionItem[]>(() => {
    if (!resultsParam || resultsParam === '[]') return [];

    try {
      // 1. JSONパース
      const parsed = JSON.parse(resultsParam);

      // 2. Zodによる厳密なバリデーション
      const result = SuggestionListSchema.safeParse(parsed);

      if (result.success) {
        return result.data;
      } else {
        logger.warn('[Search] Invalid search results schema:', result.error);
        return [];
      }
    } catch (error) {
      logger.warn('[Search] Failed to parse search results:', error);
      return [];
    }
  }, [resultsParam]);

  const [suggestions, setSuggestions] = useState<SuggestionItem[]>(initialResults);
  const [isLoading, setIsLoading] = useState(false);

  // ハイブリッド表示用: 完了したヒントを追跡
  // suggestionsが更新されたら、usageHintがあるものは完了とみなす
  const [completedHintIndices, setCompletedHintIndices] = useState<Set<number>>(new Set());

  // Quota exceeded modal state
  const [isQuotaModalVisible, setIsQuotaModalVisible] = useState(false);
  const [quotaErrorType, setQuotaErrorType] = useState<'translation_tokens' | 'question_count' | 'text_length' | undefined>();

  // 選択テキスト管理
  const [selectedText, setSelectedText] = useState<{ text: string; isSingleWord: boolean } | null>(null);

  // ブックマーク管理
  const {
    toastVisible,
    isFolderSelectModalOpen,
    folders,
    isCreateFolderModalOpen,
    newFolderName,
    isSubscriptionModalOpen,
    setNewFolderName,
    setIsSubscriptionModalOpen,
    handleBookmarkAdded,
    handleToastDismiss,
    handleOpenFolderSelect,
    handleAddToFolder,
    handleOpenCreateFolderModal,
    handleCreateFolder,
    handleCloseFolderSelectModal,
    handleCloseCreateFolderModal,
  } = useBookmarkManagement({ logPrefix: 'Search' });

  // suggestionsが更新されたらヒント完了インデックスを更新
  useEffect(() => {
    const newCompletedIndices = new Set<number>();
    suggestions.forEach((item, index) => {
      if (item.usageHint) {
        newCompletedIndices.add(index);
      }
    });
    setCompletedHintIndices(newCompletedIndices);
  }, [suggestions]);

  // queryまたは言語が変わったら再検索
  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      setCompletedHintIndices(new Set());
      return;
    }

    // initialResultsがある場合は先に設定（フォールバック用）
    if (initialResults.length > 0) {
      logger.debug('[Search] Using initialResults as fallback');
      setSuggestions(initialResults);
    } else {
      setSuggestions([]);
    }
    setCompletedHintIndices(new Set());
    setIsLoading(true);

    // キャッシュチェック + API呼び出し
    const fetchSuggestions = async () => {
      // まずキャッシュを確認
      const cached = await getCachedSuggestions(query, currentLanguage.code);
      if (cached && cached.length > 0) {
        logger.debug('[Search] Using cached suggestions');
        setSuggestions(cached);
        setIsLoading(false);
        return;
      }

      // キャッシュになければAPI呼び出し
      try {
        logger.info(`[Search] Fetching ${currentLanguage.code} suggestions for:`, query, `(native: ${nativeLanguage.code})`);
        const result = await searchJaToEn(query, currentLanguage.code, nativeLanguage.code);
        logger.info('[Search] Received suggestions:', result.items.length);
        setSuggestions(result.items);
      } catch (error) {
        logger.error('[Search] Failed to fetch suggestions:', error);
        // API失敗時、initialResultsがあればそれを保持（既に設定済み）
        // なければ空配列のまま
        if (initialResults.length === 0) {
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [query, currentLanguage.code, initialResults]); // initialResultsも依存配列に追加

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

  // インテリジェントプリフェッチ: サジェストの最初の1件を先読み
  useEffect(() => {
    // 検索結果ページでは即座にプリフェッチ（デバウンス不要）
    if (suggestions.length > 0) {
      const topSuggestion = suggestions[0];
      logger.info('[Search] 🚀 Pre-fetching top suggestion immediately:', topSuggestion.lemma);

      prefetchWordDetail(topSuggestion.lemma, (onProgress) =>
        getWordDetailStream(
          topSuggestion.lemma,
          currentLanguage.code,
          nativeLanguage.code,
          onProgress
        )
      );
    }
  }, [suggestions, currentLanguage.code, nativeLanguage.code]);

  const chatContext = useMemo(
    () => ({
      searchSuggestions: suggestions.map((item) => ({
        lemma: item.lemma,
        shortSense: item.shortSense,
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

  // チャット展開時の最大高さを計算（ヘッダーの12px下から画面下部まで）
  const chatExpandedMaxHeight = useMemo(() => {
    const screenHeight = Dimensions.get('window').height;

    // ChatSection内部の固定スペース（実測値より少し少なめに設定してより伸ばす）
    const containerPaddingTop = 8;
    const containerPaddingBottom = 10;
    const containerMarginBottom = 4;
    const chatMessagesMarginBottom = 8;
    const bottomSectionPaddingTop = 8;
    const questionScrollViewHeight = 32;
    const bottomSectionGap = 6;
    const whiteContainerHeight = 55; // paddingTop 9 + minHeight 34 + paddingBottom 12

    const fixedSpaces = containerPaddingTop + containerPaddingBottom + containerMarginBottom +
      chatMessagesMarginBottom + bottomSectionPaddingTop +
      questionScrollViewHeight + bottomSectionGap + whiteContainerHeight - 12; // -12でさらに伸ばす

    // 画面高さ - safeAreaTop - headerHeight - 固定スペース - bottomSafeArea
    return screenHeight - safeAreaInsets.top - headerHeight - fixedSpaces - safeAreaInsets.bottom;
  }, [safeAreaInsets.top, safeAreaInsets.bottom, headerHeight]);

  // QAPairsをstateとして管理（追加質問をサポートするため）
  const [qaPairs, setQAPairs] = useState<QAPair[]>([]);
  const [activeFollowUpPairId, setActiveFollowUpPairId] = useState<string | undefined>(undefined);

  // chatMessagesが変更されたときにqaPairsを更新
  useEffect(() => {
    const newPairs = toQAPairs(chatMessages, { fallbackError: chatError });

    // 既存のfollowUpQAsを保持しながらqaPairsを更新
    setQAPairs(prevPairs => {
      return newPairs.map(newPair => {
        const existingPair = prevPairs.find(p => p.id === newPair.id);
        if (existingPair?.followUpQAs) {
          // 既存のfollowUpQAsを保持
          return { ...newPair, followUpQAs: existingPair.followUpQAs };
        }
        return newPair;
      });
    });
  }, [chatMessages, chatError]);


  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleTextSelected = (text: string) => {
    const isSingleWord = !text.includes(' ') && text.split(/\s+/).length === 1;
    setSelectedText({ text, isSingleWord });

    if (isSingleWord && text.trim()) {
      const detectedLang = detectLang(text.trim());
      let targetLang: string;
      if (detectedLang === 'ja') {
        targetLang = 'ja';
      } else if (detectedLang === 'kanji-only') {
        targetLang = nativeLanguage.code;
      } else {
        targetLang = 'en';
      }
      logger.info('[Search] Pre-fetching word detail for selected text:', text, 'detected:', detectedLang, 'resolved:', targetLang);

      prefetchWordDetail(text.trim(), (onProgress) => {
        return getWordDetailStream(text.trim(), targetLang, nativeLanguage.code, onProgress);
      });
    }
  };

  const handleSelectionCleared = () => {
    setSelectedText(null);
  };

  const handleDictionaryLookup = () => {
    if (!selectedText) return;

    // 選択されたテキストの言語を検出
    const detectedLang = detectLang(selectedText.text);

    // 母国語かどうかを判定
    const isNativeLanguage = (
      (detectedLang === 'ja' || detectedLang === 'kanji-only') &&
      nativeLanguage.code === 'ja'
    );

    if (isNativeLanguage) {
      // 母国語の場合: searchページへ遷移（訳語を表示）
      logger.info('[Search] Dictionary lookup (native language):', selectedText.text, 'detected:', detectedLang, '-> navigating to search');
      router.push({
        pathname: '/(tabs)/search',
        params: {
          query: selectedText.text,
        },
      });
    } else {
      // 外国語の場合: word-detailページへ遷移（辞書を表示）
      let targetLang: string;
      if (detectedLang === 'ja') {
        targetLang = 'ja';
      } else if (detectedLang === 'kanji-only') {
        targetLang = nativeLanguage.code;
      } else {
        targetLang = 'en';
      }
      logger.info('[Search] Dictionary lookup (foreign language):', selectedText.text, 'detected:', detectedLang, 'resolved:', targetLang);

      router.push({
        pathname: '/word-detail',
        params: {
          word: selectedText.text,
          targetLanguage: targetLang,
        },
      });
    }

    // 辞書検索後に選択を解除
    setSelectedText(null);
  };

  const handleChatSubmit = async (text: string) => {
    if (selectedText?.text) {
      // API用: 部分選択した箇所に焦点を当てた質問形式
      const contextualQuestion = `文章全体の文脈を理解した上で、選択された部分「${selectedText.text}」に焦点を当てて回答してください。\n\n質問：${text}`;
      // UI表示用: シンプルな形式
      const displayQuestion = `「${selectedText.text}」について：${text}`;
      setSelectedText(null);
      await sendChatMessage(contextualQuestion, displayQuestion);
    } else {
      await sendChatMessage(text);
    }
  };

  const handleQuickQuestion = (question: string | import('@/constants/question-tags').QuestionTag) => {
    // QuestionTagオブジェクトの場合はpromptを取得
    const questionText = typeof question === 'string' ? question : question.prompt;
    const questionLabel = typeof question === 'string' ? question : question.label;

    let finalQuestion = questionText;
    let displayQuestion = questionText; // labelではなくprompt（質問文）を使用

    if (selectedText?.text) {
      // 部分選択時: 選択部分のみに焦点を当てる
      finalQuestion = `文章全体の文脈を理解した上で、選択された部分「${selectedText.text}」に焦点を当てて回答してください。\n\n質問：${questionText}`;
      displayQuestion = `「${selectedText.text}」について：${questionText}`;
      setSelectedText(null);
    } else {
      // 検索結果全体への質問時: 複数の単語を比較する指示を追加
      if (questionLabel.includes('違い')) {
        finalQuestion = `${questionText}\n\n※検索結果に表示されているこれらの単語について、それぞれの意味の違い、ニュアンスの違い（フォーマル・カジュアル、肯定的・否定的など）、使い分け、よく使われる文脈などを比較しながら説明してください。`;
      } else if (questionLabel.includes('使用場面')) {
        finalQuestion = `${questionText}\n\n※検索結果に表示されているこれらの単語について、それぞれがどのような場面や文脈で使われるか、具体例を交えて説明してください。`;
      }
    }

    void sendQuickQuestion(finalQuestion, displayQuestion);
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

  // 追加質問ハンドラ
  const handleFollowUpQuestion = async (pairId: string, question: string) => {
    logger.debug('[Search] handleFollowUpQuestion:', { pairId, question });

    // 1. 対象のQAPairを見つける
    const targetPair = qaPairs.find(p => p.id === pairId);
    if (!targetPair) {
      logger.error('[Search] Target pair not found:', pairId);
      return;
    }

    // 2. 新しい追加質問オブジェクトを作成（pending状態）
    const followUpId = generateId('followup');
    const newFollowUp = {
      id: followUpId,
      q: question,
      a: '',
      status: 'pending' as const,
    };

    // 3. QAPairのfollowUpQAs配列に追加
    setQAPairs(prev => prev.map(pair => {
      if (pair.id === pairId) {
        return {
          ...pair,
          followUpQAs: [...(pair.followUpQAs || []), newFollowUp],
        };
      }
      return pair;
    }));

    // 4. 文脈を含めたメッセージを作成
    let contextualQuestion = `[前回の質問]\n${targetPair.q}\n\n[前回の回答]\n${targetPair.a}`;

    // 以前の追加質問と回答があれば追加
    if (targetPair.followUpQAs && targetPair.followUpQAs.length > 0) {
      targetPair.followUpQAs.forEach((fu, index) => {
        if (fu.status === 'completed' && fu.a) {
          contextualQuestion += `\n\n[追加質問${index + 1}]\n${fu.q}\n\n[追加回答${index + 1}]\n${fu.a}`;
        }
      });
    }

    contextualQuestion += `\n\n[新しい追加質問]\n${question}`;

    // 5. チャットコンテキストを経由せずに直接APIを呼び出し
    const { sendFollowUpQuestionStream } = await import('@/services/api/chat');

    logger.info('[Search] Starting follow-up question API call:', {
      pairId,
      followUpId,
      contextLength: contextualQuestion.length,
    });

    try {
      const generator = sendFollowUpQuestionStream(
        {
          sessionId: generateId('session'),
          scope: 'search',
          identifier: query,
          messages: [{ id: generateId('msg'), role: 'user', content: contextualQuestion, createdAt: Date.now() }],
          context: chatContext,
          targetLanguage: currentLanguage.code,
        },
        // onContent: ストリーミング中の更新
        (content) => {
          logger.debug('[Search] Follow-up content received:', content.substring(0, 50));
          setQAPairs(prev => prev.map(pair => {
            if (pair.id === pairId) {
              return {
                ...pair,
                followUpQAs: pair.followUpQAs?.map(fu =>
                  fu.id === followUpId ? { ...fu, a: fu.a + content } : fu
                ),
              };
            }
            return pair;
          }));
        },
        // onComplete: 完了時
        (fullAnswer) => {
          logger.info('[Search] Follow-up question completed, answer length:', fullAnswer.length);
          setQAPairs(prev => prev.map(pair => {
            if (pair.id === pairId) {
              return {
                ...pair,
                followUpQAs: pair.followUpQAs?.map(fu =>
                  fu.id === followUpId ? { ...fu, a: fullAnswer, status: 'completed' as const } : fu
                ),
              };
            }
            return pair;
          }));
        },
        // onError: エラー時
        (error) => {
          logger.error('[Search] Follow-up question error:', error);

          // Check if this is a quota error
          const quotaError = parseQuotaError(error);

          let errorMessage: string;
          if (quotaError.isQuotaError) {
            // Show quota exceeded modal
            setQuotaErrorType(quotaError.quotaType);
            setIsQuotaModalVisible(true);
            errorMessage = quotaError.userFriendlyMessage;
          } else {
            errorMessage = error.message || '質問に失敗しました';
          }

          setQAPairs(prev => prev.map(pair => {
            if (pair.id === pairId) {
              return {
                ...pair,
                followUpQAs: pair.followUpQAs?.map(fu =>
                  fu.id === followUpId
                    ? { ...fu, status: 'error' as const, errorMessage }
                    : fu
                ),
              };
            }
            return pair;
          }));
        }
      );

      // ジェネレーターを開始（実際にはコールバックが処理する）
      logger.info('[Search] Starting generator loop');
      for await (const _ of generator) {
        // コールバックで処理されるため、ここでは何もしない
      }
      logger.info('[Search] Generator loop completed');
    } catch (error) {
      logger.error('[Search] Failed to send follow-up question:', error);

      // Check if this is a quota error
      const quotaError = parseQuotaError(error);

      if (quotaError.isQuotaError) {
        // Show quota exceeded modal
        setQuotaErrorType(quotaError.quotaType);
        setIsQuotaModalVisible(true);
      }
    }
  };

  const handleEnterFollowUpMode = (pairId: string, question: string) => {
    if (activeFollowUpPairId === pairId) {
      setActiveFollowUpPairId(undefined);
    } else {
      setActiveFollowUpPairId(pairId);
    }
  };

  // ハイブリッド表示用: 表示可能なヒントを計算
  // ルール: あるインデックスのヒントを表示するには、そのインデックスと
  // それより前のすべてのインデックスのヒントが完了している必要がある
  const displayItems = useMemo(() => {
    return suggestions.map((item, index) => {
      // このアイテムのヒントが完了しているか
      const isCompleted = completedHintIndices.has(index);

      // このアイテムより前のすべてのヒントが完了しているか
      const allPreviousCompleted = Array.from({ length: index }, (_, i) => i)
        .every(i => completedHintIndices.has(i));

      // 表示するヒント（完了していて、かつ前のアイテムもすべて完了している場合のみ）
      const shouldShowHint = isCompleted && allPreviousCompleted;

      return {
        ...item,
        usageHint: shouldShowHint ? item.usageHint : undefined,
      };
    });
  }, [suggestions, completedHintIndices]);

  const handleWordCardPress = async (item: SuggestionItem) => {
    // 単語詳細画面でデータ取得後にトークン数と一緒に検索履歴に保存されるため、
    // ここでは保存しない

    // 🚀 INSTANT DISPLAY: 基本情報を即座に渡してヘッダーとキーワードを一瞬で表示
    const basicData = {
      headword: {
        lemma: item.lemma,
        lang: currentLanguage.code,
        pos: item.pos,
        gender: item.gender,
      },
      senses: item.shortSense.map((meaning, index) => ({
        id: String(index + 1),
        glossShort: meaning,
      })),
      examples: [], // 例文は後でAI生成
      wordHint: item.usageHint || undefined, // 使い分けヒントがあれば表示
    };

    logger.info('[Search] Passing basicData to word-detail:', {
      lemma: item.lemma,
      dataLength: JSON.stringify(basicData).length,
      hasUsageHint: !!item.usageHint,
    });

    // バックグラウンドでAI詳細（例文など）をプリフェッチ
    logger.info('[Search] 🚀 Starting prefetch for:', item.lemma);
    prefetchWordDetail(item.lemma, (onProgress) => getWordDetailStream(item.lemma, currentLanguage.code, nativeLanguage.code, onProgress));

    router.push({
      pathname: '/(tabs)/word-detail',
      params: {
        word: item.lemma,
        targetLanguage: currentLanguage.code, // 言語コードを渡す
        data: JSON.stringify(basicData), // ✅ 基本情報を渡して即座に表示
      },
    });
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header - Fixed */}
        <View
          style={styles.headerContainer}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            setHeaderHeight(height);
          }}
        >
          <UnifiedHeaderBar
            pageType="jpSearch"
            title={query || '学習する'}
            selectedFlag="🇺🇸"
            onLanguagePress={handleLanguagePress}
            onBackPress={handleBackPress}
          />
        </View>

        {/* Word Cards - Scrollable */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.searchResultView}>
              {isLoading && displayItems.length === 0 ? (
                <View style={styles.wordCardList}>
                  <ShimmerSuggestions />
                </View>
              ) : displayItems.length > 0 ? (
                <View style={styles.wordCardList}>
                  {displayItems.map((item, index) => (
                    <Pressable
                      key={`${item.lemma}-${index}`}
                      style={styles.wordCardPressable}
                      accessibilityRole="button"
                      onPress={() => handleWordCardPress(suggestions[index])}
                    >
                      <WordCard
                        word={item.lemma}
                        posTags={item.pos}
                        gender={item.gender}
                        definitions={item.shortSense}
                        description={item.usageHint || ''}
                        nuance={getNuanceType(item.nuance)}
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
          </TouchableWithoutFeedback>
        </ScrollView>
      </View>

      {/* Chat Section - Fixed at bottom */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View pointerEvents="box-none" style={styles.chatContainerFixed}>
          <ChatSection
            placeholder="この単語について質問をする..."
            qaPairs={qaPairs}
            followUps={followUps}
            isStreaming={isChatStreaming}
            error={qaPairs.length === 0 ? chatError : null}
            onSend={handleChatSubmit}
            onQuickQuestion={handleQuickQuestion}
            onRetryQuestion={handleQACardRetry}
            expandedMaxHeight={chatExpandedMaxHeight}
            scope="search"
            identifier={query}
            onBookmarkAdded={handleBookmarkAdded}
            onFollowUpQuestion={handleFollowUpQuestion}
            onEnterFollowUpMode={handleEnterFollowUpMode}
            activeFollowUpPairId={activeFollowUpPairId}
            selectedText={selectedText}
            onDictionaryLookup={handleDictionaryLookup}
            onSelectionCleared={handleSelectionCleared}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Bookmark Toast */}
      <BookmarkToast
        visible={toastVisible}
        onAddToFolder={handleOpenFolderSelect}
        onDismiss={handleToastDismiss}
        showFolderButton={isPremium}
      />

      {/* Folder Select Modal */}
      <FolderSelectModal
        visible={isFolderSelectModalOpen}
        folders={folders}
        onSelectFolder={handleAddToFolder}
        onCreateNew={handleOpenCreateFolderModal}
        onClose={handleCloseFolderSelectModal}
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        visible={isCreateFolderModalOpen}
        folderName={newFolderName}
        onChangeFolderName={setNewFolderName}
        onCreate={handleCreateFolder}
        onClose={handleCloseCreateFolderModal}
      />

      {/* Quota Exceeded Modal */}
      <QuotaExceededModal
        visible={isQuotaModalVisible}
        onClose={() => setIsQuotaModalVisible(false)}
        remainingQuestions={0}
        isPremium={isPremium}
        quotaType={quotaErrorType}
        onUpgradePress={() => {
          setIsQuotaModalVisible(false);
          setIsSubscriptionModalOpen(true);
        }}
      />

      {/* Subscription Bottom Sheet */}
      <SubscriptionBottomSheet
        visible={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 62,
  },
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingBottom: 220, // ChatSection分のスペースを確保（高さ116 + 余裕104）
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
    left: 0,
    right: 0,
    bottom: 0,
  },
  chatContainerFixed: {
    flex: 1,
    paddingHorizontal: 8,
    paddingBottom: 0,
    marginBottom: 20,
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
  createFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#111111',
    borderStyle: 'dashed',
  },
  createFolderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    flex: 1,
  },
  createFolderModalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  folderNameInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#F5F5F5',
  },
  createFolderButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modalSecondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#686868',
  },
  modalPrimaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
