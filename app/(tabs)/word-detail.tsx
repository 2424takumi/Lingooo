import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Speech from 'expo-speech';
import { setAudioModeAsync, AudioMode } from 'expo-audio';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { DefinitionList } from '@/components/ui/definition-list';
import { WordHint } from '@/components/ui/word-hint';
import { ExampleCard } from '@/components/ui/example-card';
import { ChatSection, type ChatSectionMode } from '@/components/ui/chat-section';
import { KeyboardAnimatedView } from '@/components/ui/keyboard-animated-view';
import type { WordDetail } from '@/components/ui/word-detail-card';
import { ShimmerHeader, ShimmerDefinitions, ShimmerMetrics, ShimmerExamples, ShimmerHint } from '@/components/ui/shimmer';
import { BookmarkToast } from '@/components/ui/bookmark-toast';
import { FolderSelectModal } from '@/components/modals/FolderSelectModal';
import { CreateFolderModal } from '@/components/modals/CreateFolderModal';
import { SubscriptionBottomSheet } from '@/components/ui/subscription-bottom-sheet';
import { QuotaExceededModal } from '@/components/ui/quota-exceeded-modal';
import { useChatSession } from '@/hooks/use-chat-session';
import { useBookmarkManagement } from '@/hooks/use-bookmark-management';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAISettings } from '@/contexts/ai-settings-context';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useSubscription } from '@/contexts/subscription-context';
import { getWordDetailStream } from '@/services/api/search';
import type { WordDetailResponse } from '@/types/search';
import { getCachedWordDetail, getCachedWordDetailAsync, getPendingPromise, prefetchWordDetail, setCachedWordDetail } from '@/services/cache/word-detail-cache';
import { toQAPairs } from '@/utils/chat';
import { logger } from '@/utils/logger';
import { parseQuotaError } from '@/utils/quota-error';
import { addSearchHistory, removeSearchHistoryItem, getSearchHistory } from '@/services/storage/search-history-storage';
import { generateId } from '@/utils/id';
import type { QAPair } from '@/types/chat';
import { AVAILABLE_LANGUAGES } from '@/types/language';
import { detectLang } from '@/services/utils/language-detect';
import { getCachedLanguage } from '@/services/cache/language-detection-cache';

export default function WordDetailScreen() {
  const { t } = useTranslation();
  const pageBackground = useThemeColor({}, 'pageBackground');
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentLanguage, nativeLanguage, learningLanguages } = useLearningLanguages();
  const { isPremium } = useSubscription();
  const safeAreaInsets = useSafeAreaInsets();

  const [wordData, setWordData] = useState<Partial<WordDetailResponse> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null); // 実際に見つかった言語
  const [showLanguageNotification, setShowLanguageNotification] = useState(false); // 通知表示フラグ
  const [isLoadingAdditional, setIsLoadingAdditional] = useState(false); // 追加データ（例文など）の読み込み中

  // Hint streaming state
  const [streamingHintText, setStreamingHintText] = useState<string>(''); // ストリーミング中のHintテキスト
  const [isHintStreaming, setIsHintStreaming] = useState(false); // Hintストリーミング中かどうか

  // Quota exceeded modal state
  const [isQuotaModalVisible, setIsQuotaModalVisible] = useState(false);
  const [quotaErrorType, setQuotaErrorType] = useState<'translation_tokens' | 'question_count' | undefined>();


  // 選択テキスト管理
  const [selectedText, setSelectedText] = useState<{ text: string; isSingleWord: boolean } | null>(null);

  // 選択クリア用のキー（値が変わると選択がクリアされる）
  const [clearSelectionKey, setClearSelectionKey] = useState(0);

  // ヘッダーの高さを測定
  const [headerHeight, setHeaderHeight] = useState(88); // デフォルト値(wordDetailの最低高さ)

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
  } = useBookmarkManagement({ logPrefix: 'WordDetail' });

  // パラメータから単語を取得
  const word = params.word as string || '';
  const targetLanguage = (params.targetLanguage as string) || 'en-US'; // 学習言語コード
  const skipLanguageDetection = (params.skipLanguageDetection as string) === 'true'; // 翻訳ページから遷移時はtrue
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

  // チャット識別子：正しい単語（headword.lemma）を使用
  const chatIdentifier = wordData?.headword?.lemma || word;

  // ChatSectionのモードを決定
  const chatSectionMode: ChatSectionMode = useMemo(() => {
    if (!selectedText) return 'default';
    return selectedText.isSingleWord ? 'word' : 'text';
  }, [selectedText]);

  // 単語カード用のwordDetail（単語選択時のみ）
  const wordDetail: WordDetail | null = useMemo(() => {
    if (!selectedText || !selectedText.isSingleWord) return null;

    // 単語詳細ページで単語を選択した場合、現在のwordDataを使って簡易版を作成
    if (wordData?.headword) {
      return {
        headword: selectedText.text,
        reading: wordData.headword.reading || '',
        meanings: wordData.senses?.map(s => s.glossShort) || [],
        partOfSpeech: wordData.senses?.flatMap(s => s.pos) || [],
        nuance: '', // 単語詳細ページでは文脈ニュアンスはない
        isBookmarked: false,
      };
    }

    return null;
  }, [selectedText, wordData]);

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

  // QAPairsをstateとして管理（追加質問をサポートするため）
  const [qaPairs, setQAPairs] = useState<QAPair[]>([]);
  const [activeFollowUpPairId, setActiveFollowUpPairId] = useState<string | undefined>(undefined);

  // chatMessagesが変更されたときにqaPairsを更新
  useEffect(() => {
    const newPairs = toQAPairs(chatMessages, { fallbackError: chatError });

    // 既存のfollowUpQAsを保持しながらqaPairsを更新
    setQAPairs(prevPairs => {
      // 空→空の場合はbail out（無限ループ防止）
      if (newPairs.length === 0 && prevPairs.length === 0) return prevPairs;
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

  // チュートリアルStep 3: 質問タグ回答完了検出
  const prevIsChatStreamingRef = useRef<boolean>(false);


  // クリップボードからの質問入力
  // 注: クリップボード監視は _layout.tsx で一元管理されているため、ここでは不要
  const [prefilledChatText, setPrefilledChatText] = useState<string | null>(null);

  // チャット展開時の最大高さを計算（ヘッダーの12px下から画面下部まで）
  const chatExpandedMaxHeight = useMemo(() => {
    const screenHeight = Dimensions.get('window').height;

    // ChatSection内部の固定スペース
    const containerPaddingTop = 8;
    const containerPaddingBottom = 10;
    const containerMarginBottom = 4;
    const chatMessagesMarginBottom = 8;
    const bottomSectionPaddingTop = 8;
    const questionScrollViewHeight = 32;
    const bottomSectionGap = 6;
    const whiteContainerHeight = 55; // paddingTop 9 + minHeight 34 + paddingBottom 12
    const topMargin = 10; // ヘッダーとの間隔

    const fixedSpaces = containerPaddingTop + containerPaddingBottom + containerMarginBottom +
      chatMessagesMarginBottom + bottomSectionPaddingTop +
      questionScrollViewHeight + bottomSectionGap + whiteContainerHeight + topMargin;

    // 画面高さ - safeAreaTop - headerHeight - 固定スペース
    // bottomSafeAreaは引かない（キーボードとの間隔を狭めるため）
    return screenHeight - safeAreaInsets.top - headerHeight - fixedSpaces;
  }, [safeAreaInsets.top, safeAreaInsets.bottom, headerHeight]);

  // 検出された言語の情報を取得（選択中の言語と異なる場合のみ）
  const detectedLanguageInfo = useMemo(() => {
    if (!detectedLanguage || detectedLanguage === targetLanguage || detectedLanguage === currentLanguage.code) {
      return null;
    }

    const language = AVAILABLE_LANGUAGES.find(lang => lang.code === detectedLanguage);
    return language;
  }, [detectedLanguage, targetLanguage, currentLanguage.code]);

  // 検出言語が変更されたときに通知を表示し、3秒後に自動的に隠す
  useEffect(() => {
    if (detectedLanguageInfo) {
      setShowLanguageNotification(true);
      const timer = setTimeout(() => {
        setShowLanguageNotification(false);
      }, 3000); // 3秒後に消える

      return () => clearTimeout(timer);
    } else {
      setShowLanguageNotification(false);
    }
  }, [detectedLanguageInfo]);

  // オーディオモードを設定（サイレントモードでも音声再生を可能に）
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentModeIOS: true, // iOSのサイレントモードでも再生
          shouldPlayInBackground: false,
          shouldReduceOtherAudioVolume: true,
        } as Partial<AudioMode>);
        logger.info('[Audio] Audio mode configured successfully');
      } catch (error) {
        logger.error('[Audio] Failed to configure audio mode:', error);
      }
    };

    configureAudio();
  }, []);

  /**
   * Check if WordDetailResponse has complete data (all sections)
   */
  const isWordDetailComplete = (data: Partial<WordDetailResponse> | null): boolean => {
    if (!data) return false;

    // Must have basic info
    if (!data.headword || !data.senses || data.senses.length === 0) {
      return false;
    }

    // Must have additional info
    if (!data.hint || !data.metrics || !data.examples || data.examples.length === 0) {
      return false;
    }

    return true;
  };

  useEffect(() => {
    logger.info('[WordDetail] useEffect triggered:', {
      word,
      hasDataParam: !!dataParam,
      dataParamLength: dataParam?.length || 0,
      targetLanguage,
    });

    const loadWordData = async () => {
      try {
        // パラメータでデータが渡されている場合はそれを使用
        if (dataParam) {
          const data = JSON.parse(dataParam);
          setWordData(data);
          setLoadingProgress(100);
          setIsLoading(false);
          setError(null);
          setDetectedLanguage(null);
          setShowLanguageNotification(false);
          setIsLoadingAdditional(true); // 🚀 追加データを読み込み中
          logger.info('[WordDetail] Using dataParam for instant display (basic info only)');

          // 🚀 バックグラウンドでフルデータ（例文など）を取得
          (async () => {
            // まずプリフェッチの完了を待つ
            const pendingPromise = getPendingPromise(word);
            if (pendingPromise) {
              try {
                logger.info('[WordDetail] Waiting for prefetch to complete...');
                const fullData = await pendingPromise;
                // DEBUG: プリフェッチデータの examples 状態
                logger.info('[WordDetail] Prefetch data examples:', fullData.examples?.map((ex: any, i: number) => ({
                  i, hasSrc: !!ex.textSrc, hasDst: !!ex.textDst,
                  dstLen: ex.textDst?.length || 0,
                })));
                if (fullData.examples && fullData.examples.length > 0) {
                  logger.info('[WordDetail] Enriching with prefetched full data');
                  // 🚀 基本データのsensesを保持してマージ（検索結果の意味を優先）
                  setWordData(prev => ({
                    ...fullData,
                    senses: prev?.senses || fullData.senses, // 基本データの意味を保持
                  }));
                  setIsLoadingAdditional(false); // 完了
                }
                return;
              } catch (err) {
                logger.warn('[WordDetail] Prefetch failed, checking cache');
              }
            }

            // プリフェッチがない場合はキャッシュをチェック
            const cachedData = getCachedWordDetail(word);
            if (cachedData && isWordDetailComplete(cachedData)) {
              logger.info('[WordDetail] Enriching with cached full data');
              // 🚀 基本データのsensesを保持してマージ
              setWordData(prev => ({
                ...cachedData,
                senses: prev?.senses || cachedData.senses, // 基本データの意味を保持
              }));
              setIsLoadingAdditional(false);
            } else {
              // 不完全またはキャッシュなし: Additional情報を生成
              logger.info('[WordDetail] Incomplete/no cached data, generating additional info');

              try {
                // Hintストリーミング開始
                setIsHintStreaming(true);
                setStreamingHintText('');

                const result = await getWordDetailStream(
                  word,
                  targetLanguage,
                  nativeLanguage.code,
                  (progress, partialData) => {
                    if (partialData && progress >= 50) {
                      // Additional情報が到着したらマージ
                      setWordData(prev => ({
                        ...prev,
                        ...partialData,
                        senses: prev?.senses || partialData.senses,
                      }));
                    }
                  },
                  false, // isOffline
                  (chunk: string) => {
                    // Hintテキストチャンクを受信
                    setStreamingHintText(prev => prev + chunk);
                  }
                );

                logger.info('[WordDetail] Additional info generation complete');
                setWordData(prev => ({
                  ...result.data,
                  senses: prev?.senses || result.data.senses,
                }));

                // Hintストリーミング完了
                setIsHintStreaming(false);
              } catch (err) {
                logger.error('[WordDetail] Failed to generate additional info:', err);
                // Hintストリーミング停止（エラー時）
                setIsHintStreaming(false);
              }

              setIsLoadingAdditional(false);
            }
          })();

          return; // 基本情報は即座に表示完了
        } else if (word) {
          // キャッシュをチェック（メモリ → AsyncStorage の順）
          let cachedData = getCachedWordDetail(word);
          if (!cachedData) {
            cachedData = await getCachedWordDetailAsync(word) || undefined;
          }
          if (cachedData && isWordDetailComplete(cachedData)) {
            // 完全なキャッシュヒット：即座に表示
            logger.debug('[WordDetail] USING CACHED DATA (complete)');
            setWordData(cachedData);
            setLoadingProgress(100);
            setIsLoading(false);
            setError(null);
            setDetectedLanguage(null);
            setShowLanguageNotification(false);
            return;
          } else if (cachedData && !isWordDetailComplete(cachedData)) {
            // 不完全なキャッシュ：Basic情報を表示してAdditional情報を取得継続
            logger.debug('[WordDetail] Partial cached data detected, waiting for additional info');
            setWordData(cachedData);
            setLoadingProgress(30);
            setIsLoading(true); // ローディング状態を維持
            setIsLoadingAdditional(true);
            setError(null);
            setDetectedLanguage(null);
            setShowLanguageNotification(false);
            // returnしない - Additional情報の取得に進む
          } else {
            // キャッシュなし：状態をリセット
            setWordData(null);
            setIsLoading(true);
            setLoadingProgress(0);
            setError(null);
            setDetectedLanguage(null);
            setShowLanguageNotification(false);
          }

          // 実行中のPre-flight requestをチェック
          const pendingPromise = getPendingPromise(word);
          if (pendingPromise) {
            // Pre-flight requestが実行中：まずキャッシュから部分データを取得
            logger.debug('[WordDetail] WAITING FOR PRE-FLIGHT');

            // 既に基本情報が来ているかチェック
            let cachedPartialData = getCachedWordDetail(word);
            if (cachedPartialData && cachedPartialData.headword) {
              // 基本情報が既にある場合は即座に表示
              logger.info('[WordDetail] Showing partial data from prefetch immediately');
              setWordData(cachedPartialData);
              setLoadingProgress(30);
              setIsLoading(true); // まだ完全には完了していない
            }

            // キャッシュをポーリングして、部分データ・完全データが来たら即座に表示
            const pollInterval = setInterval(() => {
              const updatedData = getCachedWordDetail(word);
              if (updatedData && updatedData.headword) {
                // 新しい部分データまたは完全データが来た場合
                if (!cachedPartialData) {
                  logger.info('[WordDetail] Partial data arrived during polling');
                  setWordData(updatedData);
                  setLoadingProgress(30);
                  setIsLoading(true);
                  cachedPartialData = updatedData;
                } else if (updatedData.examples && updatedData.examples.length > 0 &&
                           (!cachedPartialData.examples || cachedPartialData.examples.length === 0)) {
                  // 完全データ（例文あり）が来た場合
                  logger.info('[WordDetail] Full data arrived during polling, examples:', updatedData.examples.map((ex: any, i: number) => ({
                    i, hasSrc: !!ex.textSrc, hasDst: !!ex.textDst, dstLen: ex.textDst?.length || 0,
                  })));
                  setWordData(updatedData);
                  setLoadingProgress(100);
                  setIsLoading(false);
                  clearInterval(pollInterval);
                }
              }
            }, 100); // 100msごとにチェック

            try {
              // 完全なデータを待つ（バックグラウンド）
              const fullData = await pendingPromise;
              clearInterval(pollInterval);
              logger.info('[WordDetail] PRE-FLIGHT DATA RECEIVED, examples:', fullData.examples?.map((ex: any, i: number) => ({
                i, hasSrc: !!ex.textSrc, hasDst: !!ex.textDst, dstLen: ex.textDst?.length || 0,
              })));
              setWordData(fullData);
              setLoadingProgress(100);
              setIsLoading(false);
              return; // プリフェッチ成功したので早期リターン
            } catch (err) {
              clearInterval(pollInterval);
              logger.warn('[WordDetail] Pre-flight failed, using normal fetch');
              // プリフェッチ失敗時は通常のフローに進む（言語検出含む）
            }
          }

          // キャッシュなし：通常のAPI呼び出し（ストリーミング）
          logger.debug('[WordDetail] Starting STREAMING API call');
          let result;
          let lastError: any = null;
          let successLanguage: string | null = null;

          // 試す言語のリストを作成（選択中の言語を最初に、その後他の学習言語）
          const languagesToTry = [
            targetLanguage,
            ...learningLanguages
              .map(lang => lang.code)
              .filter(code => code !== targetLanguage && code !== nativeLanguage.code)
          ];

          logger.info('[WordDetail] Languages to try:', languagesToTry);

          // まず言語を検出（キャッシュ → API の順）
          let detectedLang: string | null = null;
          if (!skipLanguageDetection) {
            // B3: キャッシュを先に確認（200-500ms節約）
            const cachedLang = await getCachedLanguage(word);
            if (cachedLang) {
              detectedLang = cachedLang;
              logger.info('[WordDetail] Language from cache:', cachedLang);
            } else {
              try {
                const { isGeminiConfigured } = await import('@/services/ai/gemini-client');
                const isConfigured = await isGeminiConfigured();

                if (isConfigured) {
                  const { detectWordLanguage } = await import('@/services/ai/dictionary-generator');
                  logger.info('[WordDetail] Detecting language for word:', word);
                  const detectionResult = await detectWordLanguage(word, languagesToTry);
                  detectedLang = detectionResult?.language || null;
                  logger.info('[WordDetail] Language detection result:', detectionResult);
                } else {
                  logger.info('[WordDetail] Skipping language detection (Gemini not configured)');
                }
              } catch (detectionError) {
                logger.warn('[WordDetail] Language detection failed:', detectionError);
              }
            }
          } else {
            logger.info('[WordDetail] Skipping language detection (skipLanguageDetection=true)');
          }

          // 検出された言語があれば、それを最優先にする
          const orderedLanguages = detectedLang
            ? [detectedLang, ...languagesToTry.filter(lang => lang !== detectedLang)]
            : languagesToTry;

          logger.info('[WordDetail] Ordered languages:', orderedLanguages);

          // Hintストリーミング開始
          setIsHintStreaming(true);
          setStreamingHintText('');

          // 各言語を順番に試す
          for (const langCode of orderedLanguages) {
            try {
              logger.info(`[WordDetail] Trying language: ${langCode}`);

              result = await getWordDetailStream(
                word,
                langCode,
                nativeLanguage.code,
                (progress, partialData) => {
                  logger.debug(`[WordDetail] Progress: ${progress}% (${langCode})`, {
                    hasPartialData: !!partialData,
                    sections: partialData ? Object.keys(partialData) : []
                  });
                  setLoadingProgress(progress);

                  // 部分データが来たらすぐに表示（段階的レンダリング）
                  if (partialData) {
                    logger.debug('[WordDetail] Partial data received, updating UI');

                    // DEBUG: examples の textDst 状態をログ
                    if (partialData.examples && partialData.examples.length > 0) {
                      logger.info(`[WordDetail] Examples at ${progress}%:`, partialData.examples.map((ex: any, i: number) => ({
                        i,
                        hasSrc: !!ex.textSrc,
                        hasDst: !!ex.textDst,
                        srcLen: ex.textSrc?.length || 0,
                        dstLen: ex.textDst?.length || 0,
                      })));
                    }

                    // 🚀 データをマージして蓄積（一度受信したデータは削除しない）
                    setWordData(prev => {
                      if (!prev) return partialData;

                      // 既存データと新規データをマージ
                      return {
                        ...prev,
                        ...partialData,
                        // 配列フィールドは既存のものを保持（新規データがある場合は上書き）
                        senses: partialData.senses && partialData.senses.length > 0
                          ? partialData.senses
                          : prev.senses,
                        examples: partialData.examples && partialData.examples.length > 0
                          ? partialData.examples
                          : prev.examples,
                      };
                    });

                    // 完了したらローディング状態を解除
                    if (progress === 100) {
                      logger.debug('[WordDetail] Data complete, disabling loading');
                      setIsLoading(false);
                    }
                  }
                },
                false, // isOffline
                (chunk: string) => {
                  // Hintテキストチャンクを受信
                  setStreamingHintText(prev => prev + chunk);
                }
              );

              // 成功した場合
              successLanguage = langCode;
              setDetectedLanguage(langCode);
              logger.info(`[WordDetail] Successfully found word in language: ${langCode}`);
              // Hintストリーミング完了
              setIsHintStreaming(false);
              break; // ループを抜ける
            } catch (streamError) {
              // エラーを保存して次の言語を試す
              lastError = streamError;

              // SearchError（not_foundなど）の場合は警告レベル
              if (streamError && typeof streamError === 'object' && 'type' in streamError) {
                logger.warn(`[WordDetail] Word not found in ${langCode}:`, streamError);
              } else {
                logger.error(`[WordDetail] Error in ${langCode}:`, streamError);
              }

              // 最後の言語でなければ次を試す
              if (langCode !== languagesToTry[languagesToTry.length - 1]) {
                logger.info(`[WordDetail] Trying next language...`);
                continue;
              }
            }
          }

          // すべての言語で失敗した場合
          if (!successLanguage || !result) {
            logger.error('[WordDetail] Failed in all languages');
            // Hintストリーミング停止（エラー時）
            setIsHintStreaming(false);
            throw lastError;
          }

          // 最終データをセット（念のため）
          logger.debug('[WordDetail] Final data received');
          setWordData(result.data);
          setLoadingProgress(100);
          setIsLoading(false);
          setIsHintStreaming(false);

          // B4: 完了データをAsyncStorageに永続化
          setCachedWordDetail(word, result.data);

          // 検索履歴にトークン数を含めて保存（実際に見つかった言語で保存）
          try {
            await addSearchHistory(word, successLanguage, result.data, result.tokensUsed);
            logger.info('[WordDetail] Updated search history with token count:', {
              word,
              language: successLanguage,
              tokensUsed: result.tokensUsed,
            });
          } catch (historyError) {
            logger.error('[WordDetail] Failed to update search history:', historyError);
          }
        }
      } catch (err) {
        // SearchError型（{type: 'not_found', message: '...'}）の場合
        if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(t('wordDetail.loadingFailed'));
        }
        setIsLoading(false);
      }
    };

    loadWordData();
  }, [word, dataParam, targetLanguage, retryKey]);

  // 検索履歴を正しい単語で更新（誤字の場合）
  useEffect(() => {
    const updateSearchHistoryWithCorrectWord = async () => {
      // wordDataが読み込まれ、headwordが存在する場合のみ
      if (!wordData?.headword?.lemma || !word || isLoading || !detectedLanguage) {
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
            language: detectedLanguage,
          });

          // 既存の検索履歴を取得
          const history = await getSearchHistory();

          // 誤字のエントリを探して削除
          const typoEntry = history.find(
            (item) => item.query.trim().toLowerCase() === inputWord && item.language === detectedLanguage
          );

          if (typoEntry) {
            await removeSearchHistoryItem(typoEntry.id);
            logger.info('[WordDetail] Removed typo entry from search history:', typoEntry.query);
          }

          // 正しい単語を検索履歴に追加（実際に見つかった言語で保存）
          await addSearchHistory(correctWord, detectedLanguage);
          logger.info('[WordDetail] Added correct word to search history:', correctWord);
        } catch (error) {
          logger.error('[WordDetail] Failed to update search history:', error);
          // エラーが起きても続行（検索履歴の更新は重要ではない）
        }
      }
    };

    void updateSearchHistoryWithCorrectWord();
  }, [wordData, word, detectedLanguage, isLoading]);


  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleTextSelected = (text: string) => {
    // Determine if it's a single word (simple heuristic: no spaces)
    const isSingleWord = !text.includes(' ') && text.split(/\s+/).length === 1;
    setSelectedText({ text, isSingleWord });

    // 単語の場合、プリフェッチを開始（辞書で調べるボタンを押す前に準備）
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
      logger.info('[WordDetail] Pre-fetching word detail for selected text:', text, 'detected:', detectedLang, 'resolved:', targetLang);

      prefetchWordDetail(text.trim(), (onProgress) => {
        return getWordDetailStream(text.trim(), targetLang, nativeLanguage.code, onProgress);
      });
    }
  };

  const handleSelectionCleared = () => {
    setSelectedText(null);
    setClearSelectionKey(prev => prev + 1);
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
      logger.info('[WordDetail] Dictionary lookup (native language):', selectedText.text, 'detected:', detectedLang, '-> navigating to search');
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
      logger.info('[WordDetail] Dictionary lookup (foreign language):', selectedText.text, 'detected:', detectedLang, 'resolved:', targetLang);

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

  const handleWordAskQuestion = () => {
    if (selectedText && selectedText.isSingleWord) {
      // isSingleWordはtrueのまま維持して単語モードの質問タグを表示
      // ChatSectionにフォーカスを当てて入力を促す
      logger.info('[WordDetail] Opening chat for word questions (keeping word mode)');
    }
  };

  const handleSwitchToWordCard = () => {
    if (selectedText && !selectedText.isSingleWord) {
      // isSingleWordをtrueに変更して単語カードモードに切り替え
      setSelectedText({ ...selectedText, isSingleWord: true });
      logger.info('[WordDetail] Switched from text input mode back to word card mode');
    }
  };

  const handlePronouncePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!wordData?.headword) {
      logger.warn('[Pronounce] No headword data');
      return;
    }

    try {
      logger.info('[Pronounce] Starting pronunciation for:', wordData.headword.lemma);

      // オーディオモードを再確認（念のため）
      try {
        await setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldPlayInBackground: false,
          shouldReduceOtherAudioVolume: true,
        } as Partial<AudioMode>);
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
      // BCP 47コード（'en-US', 'pt-BR'等）はそのまま使用
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

      const speechLanguage = targetLanguage.includes('-')
        ? targetLanguage
        : (languageMap[targetLanguage] || 'en-US');
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

  const handleQuestionPress = async (question: string | import('@/constants/question-tags').QuestionTag) => {
    // QuestionTagオブジェクトの場合はpromptを取得
    const questionText = typeof question === 'string' ? question : question.prompt;
    const questionLabel = typeof question === 'string' ? question : question.label;

    let finalQuestion = questionText;
    let displayQuestion = questionText; // labelではなくprompt（質問文）を使用

    if (selectedText?.text) {
      // 部分選択時: 選択部分のみに焦点を当てる
      finalQuestion = `文章全体の文脈を理解した上で、選択された部分「${selectedText.text}」に焦点を当てて回答してください。\n\n質問：${questionText}`;
      displayQuestion = `「${selectedText.text}」について：${questionText}`;
      // 選択を維持（ユーザーが同じ単語について複数質問できるように）
    } else {
      // 単語全体への質問時: 質問内容に応じた詳細な指示を追加
      if (questionLabel.includes('ニュアンス')) {
        finalQuestion = `${questionText}\n\n※この単語が持つニュアンスや語感（フォーマル・カジュアル、肯定的・否定的、古風・現代的など）を具体的に説明してください。`;
      } else if (questionLabel.includes('語源')) {
        finalQuestion = `${questionText}\n\n※この単語の意味や用法ではなく、語源（etymology）・由来・歴史的な背景のみを詳しく説明してください。どの言語から来たか、どのように形成されたかなどを教えてください。`;
      } else if (questionLabel.includes('類義語')) {
        finalQuestion = `${questionText}\n\n※この単語の類義語をいくつか挙げて、それぞれの違いや使い分けも簡潔に説明してください。`;
      }
    }

    void sendQuickQuestion(finalQuestion, displayQuestion);
  };

  const handleChatSubmit = async (text: string) => {
    if (selectedText?.text) {
      // API用: 部分選択した箇所に焦点を当てた質問形式
      const contextualQuestion = `文章全体の文脈を理解した上で、選択された部分「${selectedText.text}」に焦点を当てて回答してください。\n\n質問：${text}`;
      // UI表示用: シンプルな形式
      const displayQuestion = `「${selectedText.text}」について：${text}`;
      // 選択を維持（ユーザーが同じ単語について複数質問できるように）
      await sendChatMessage(contextualQuestion, displayQuestion);
    } else {
      await sendChatMessage(text);
    }
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

  // 追加質問ハンドラ
  const handleFollowUpQuestion = async (pairId: string, question: string) => {
    logger.debug('[WordDetail] handleFollowUpQuestion:', { pairId, question });

    // 1. 対象のQAPairを見つける
    const targetPair = qaPairs.find(p => p.id === pairId);
    if (!targetPair) {
      logger.error('[WordDetail] Target pair not found:', pairId);
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

    try {
      const generator = sendFollowUpQuestionStream(
        {
          sessionId: generateId('session'),
          scope: 'word',
          identifier: word,
          messages: [{ id: generateId('msg'), role: 'user', content: contextualQuestion, createdAt: Date.now() }],
          context: wordData ? {
            headword: wordData.headword?.lemma || word,
            senses: wordData.senses?.map(s => s.glossShort) || [],
            examples: wordData.examples?.map(e => ({
              english: e.textSrc,
              japanese: e.textDst,
            })) || [],
          } : undefined,
          targetLanguage: targetLanguage,
        },
        // onContent: ストリーミング中の更新
        (content) => {
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
          logger.error('[WordDetail] Follow-up question error:', error);

          // Check if this is a quota error
          const quotaError = parseQuotaError(error);

          let errorMessage: string;
          if (quotaError.isQuotaError) {
            // Show quota exceeded modal
            setQuotaErrorType(quotaError.quotaType);
            setIsQuotaModalVisible(true);
            errorMessage = quotaError.userFriendlyMessage;
          } else {
            errorMessage = error.message || t('common.unknownError');
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
      for await (const _ of generator) {
        // コールバックで処理されるため、ここでは何もしない
      }
    } catch (error) {
      logger.error('[WordDetail] Failed to send follow-up question:', error);

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


  if (error) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
        <StatusBar style="auto" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || t('wordDetail.notFound')}</Text>
          <View style={styles.errorButtonRow}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                setIsLoading(true);
                setRetryKey(prev => prev + 1);
              }}
            >
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
            >
              <Text style={styles.backButtonText}>{t('wordDetail.backButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={[styles.content, { paddingTop: safeAreaInsets.top }]}>
        {/* Header - Fixed */}
        {(word || wordData?.headword) ? (
          <View
            style={styles.headerContainer}
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              setHeaderHeight(height);
            }}
          >
            <UnifiedHeaderBar
              pageType="wordDetail"
              word={wordData?.headword?.lemma || word}
              posTags={wordData?.headword?.pos || []}
              gender={wordData?.headword?.gender}
              onBackPress={handleBackPress}
              onPronouncePress={handlePronouncePress}
            />
          </View>
        ) : isLoading ? (
          <View
            style={styles.headerContainer}
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              setHeaderHeight(height);
            }}
          >
            <ShimmerHeader />
          </View>
        ) : null}

        {/* 言語検出通知 - Fixed */}
        {detectedLanguageInfo && showLanguageNotification && (
          <View style={styles.languageNotificationContainer}>
            <View style={styles.languageNotificationContent}>
              <Text style={styles.languageNotificationText}>
                {t('wordDetail.foundInLanguage', { language: detectedLanguageInfo.name })}
              </Text>
            </View>
          </View>
        )}

        {/* Content - Scrollable */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
          {/* Definitions - 2番目に表示 */}
          {wordData?.senses && wordData.senses.length > 0 ? (
            <View style={styles.definitionsContainer}>
              <DefinitionList
                definitions={wordData.senses.map(s => s.glossShort)}
                onTextSelected={handleTextSelected}
                onSelectionCleared={handleSelectionCleared}
              />
            </View>
          ) : isLoading ? (
            <View style={styles.definitionsContainer}>
              <ShimmerDefinitions />
            </View>
          ) : null}

          {/* Word Hint - 3番目に表示 */}
          {wordData?.hint?.text || isHintStreaming ? (
            <View style={styles.hintContainer}>
              <WordHint
                hint={wordData?.hint?.text || ''}
                onTextSelected={handleTextSelected}
                onSelectionCleared={handleSelectionCleared}
                isStreaming={isHintStreaming}
                streamingText={streamingHintText}
              />
            </View>
          ) : (isLoading || isLoadingAdditional) ? (
            <View style={styles.hintContainer}>
              <ShimmerHint />
            </View>
          ) : null}

          {/* Examples Section - 最後に表示 */}
          {wordData?.examples && wordData.examples.length > 0 ? (
            <View style={styles.examplesSection}>
              <Text style={styles.sectionTitle}>{t('wordDetail.examples')}</Text>
              <View style={styles.examplesList}>
                {wordData.examples.map((example, index) => (
                  <ExampleCard
                    key={index}
                    english={example.textSrc}
                    japanese={example.textDst}
                    onTextSelected={handleTextSelected}
                    onSelectionCleared={handleSelectionCleared}
                  />
                ))}
              </View>
            </View>
          ) : (isLoading || isLoadingAdditional) ? (
            <View style={styles.examplesSection}>
              <Text style={styles.sectionTitle}>{t('wordDetail.examples')}</Text>
              <ShimmerExamples />
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* Chat Section - Fixed at bottom */}
      <KeyboardAnimatedView
        style={styles.keyboardAvoidingView}
      >
        <View pointerEvents="box-none" style={styles.chatContainerFixed}>
          <ChatSection
            key={chatIdentifier} // Reset chat state when navigating to a different word
            placeholder={t('wordDetail.chatPlaceholder')}
            qaPairs={qaPairs}
            followUps={followUps}
            isStreaming={isChatStreaming}
            error={qaPairs.length === 0 ? chatError : null}
            onSend={handleChatSubmit}
            onQuickQuestion={handleQuestionPress}
            onRetryQuestion={handleQACardRetry}
            scope="word"
            identifier={chatIdentifier}
            onBookmarkAdded={handleBookmarkAdded}
            expandedMaxHeight={chatExpandedMaxHeight}
            onFollowUpQuestion={handleFollowUpQuestion}
            onEnterFollowUpMode={handleEnterFollowUpMode}
            activeFollowUpPairId={activeFollowUpPairId}
            prefilledInputText={prefilledChatText}
            onPrefillConsumed={() => setPrefilledChatText(null)}
            selectedText={selectedText}
            onDictionaryLookup={handleDictionaryLookup}
            onSelectionCleared={handleSelectionCleared}
            mode={chatSectionMode}
            wordDetail={wordDetail}
            isLoadingWordDetail={false}
            onWordBookmarkToggle={() => {
              // TODO: ブックマーク機能を実装
              logger.info('[WordDetail] Word bookmark toggled');
            }}
            onWordViewDetails={handleDictionaryLookup}
            onWordAskQuestion={handleWordAskQuestion}
            onSwitchToWordCard={handleSwitchToWordCard}
          />
        </View>
      </KeyboardAnimatedView>

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
  },
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  languageNotificationContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingBottom: 220, // ChatSection分のスペースを確保（高さ116 + 余裕104）
  },
  languageNotificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF4',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  languageNotificationText: {
    fontSize: 14,
    color: '#686868',
    fontWeight: '500',
  },
  definitionsContainer: {
    marginBottom: 24,
  },
  hintContainer: {
    marginBottom: 24,
  },
  examplesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#686868',
    letterSpacing: 4,
    marginBottom: 12,
    marginLeft: 2,
  },
  examplesList: {
    gap: 16,
  },
  translateCardContainer: {
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#686868',
    textAlign: 'center',
    paddingVertical: 40,
  },
  keyboardAvoidingView: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  chatContainerFixed: {
    paddingHorizontal: 8,
    paddingBottom: 0,
    marginBottom: 20,
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
  errorButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#00AA69',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 11,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#111111',
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
