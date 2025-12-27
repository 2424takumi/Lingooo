import { StyleSheet, View, ScrollView, Dimensions, Platform, Pressable, KeyboardAvoidingView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { ChatSection, ChatSectionMode } from '@/components/ui/chat-section';
import { BookmarkToast } from '@/components/ui/bookmark-toast';
import { TranslateCard } from '@/components/ui/translate-card';
import { SelectionInfo } from '@/components/ui/selectable-text';
import { FolderSelectModal } from '@/components/modals/FolderSelectModal';
import { CreateFolderModal } from '@/components/modals/CreateFolderModal';
import { SubscriptionBottomSheet } from '@/components/ui/subscription-bottom-sheet';
import { QuotaExceededModal } from '@/components/ui/quota-exceeded-modal';
import { translateText, getWordContext, splitOriginalText, translateParagraph, translateParagraphStream, splitOriginalTextStream, splitOriginalTextStreamSSE } from '@/services/api/translate';
import { splitIntoParagraphs } from '@/services/api/paragraph-splitter';
import { getWordDetailStream } from '@/services/api/search';
import { sendQuestionTagQuery } from '@/services/api/chat';
import type { QuestionTag as QuestionTagType } from '@/constants/question-tags';
import { prefetchWordDetail } from '@/services/cache/word-detail-cache';
import { getWordContextCache, setWordContextCache } from '@/services/cache/word-context-cache';
import { addSearchHistory } from '@/services/storage/search-history-storage';
import { getAndClearImageTranslationData } from '@/services/storage/image-translation-storage';
import { detectLang, resolveLanguageCode } from '@/services/utils/language-detect';
import { languageDetectionEvents } from '@/services/events/language-detection-events';
import { useChatSession } from '@/hooks/use-chat-session';
import { useBookmarkManagement } from '@/hooks/use-bookmark-management';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAISettings } from '@/contexts/ai-settings-context';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useSubscription } from '@/contexts/subscription-context';
import { toQAPairs } from '@/utils/chat';
import { logger } from '@/utils/logger';
import { generateId } from '@/utils/id';
import { parseQuotaError } from '@/utils/quota-error';
import type { QAPair } from '@/types/chat';
import { useTranslation } from 'react-i18next';
import { TRANSLATION_CONFIG } from '@/constants/translation';

/**
 * 選択位置の周辺文脈を抽出し、選択箇所をマーカーで囲む（前後150文字程度）
 * 選択された単語を **[単語]** で囲んで、AIが識別できるようにする
 */
function extractSurroundingContext(
  fullText: string,
  selectionStart: number,
  selectionEnd: number,
  contextLength: number = 150
): string {
  const beforeStart = Math.max(0, selectionStart - contextLength);
  const afterEnd = Math.min(fullText.length, selectionEnd + contextLength);

  const before = fullText.substring(beforeStart, selectionStart);
  const selected = fullText.substring(selectionStart, selectionEnd);
  const after = fullText.substring(selectionEnd, afterEnd);

  // 選択箇所をマーカーで囲む
  return `${before}**[${selected}]**${after}`;
}

interface TranslatedParagraph {
  id: string;
  originalText: string;
  translatedText: string;
  index: number;
  isTranslating?: boolean;
}

export default function TranslateScreen() {
  const { t } = useTranslation();
  const pageBackground = useThemeColor({}, 'pageBackground');
  const router = useRouter();
  const params = useLocalSearchParams();
  const safeAreaInsets = useSafeAreaInsets();
  const { currentLanguage, nativeLanguage, setCurrentLanguage } = useLearningLanguages();
  const { isPremium } = useSubscription();

  // 画像翻訳から来た場合の全文テキストと翻訳を保持
  const [imageTranslationText, setImageTranslationText] = useState<string | null>(null);
  const [imageTranslatedText, setImageTranslatedText] = useState<string | null>(null);
  const [isLoadingImageData, setIsLoadingImageData] = useState(fromImageTranslation);

  // パラメータから文章と言語を取得
  // 画像翻訳の場合はimageTranslationTextを優先（AsyncStorageから読み込んだ全文）
  const text = useMemo(
    () => imageTranslationText || (params.word as string) || (params.initialText as string) || '',
    [imageTranslationText, params.word, params.initialText]
  );
  const initialSourceLang = (params.sourceLang as string) || 'en';
  const initialTargetLang = (params.targetLang as string) || 'ja';
  const needsAiDetection = (params.needsAiDetection as string) === 'true';
  const fromImageTranslation = (params.fromImageTranslation as string) === 'true';

  // 画像翻訳から来た場合の初期翻訳結果
  // AsyncStorageから読み込んだ翻訳を優先
  const initialTranslation = useMemo(
    () => imageTranslatedText || (params.initialTranslation as string) || '',
    [imageTranslatedText, params.initialTranslation]
  );

  // AI検出によって言語が変わる可能性があるため、sourceLangをstateで管理
  const [sourceLang, setSourceLang] = useState(initialSourceLang);

  // AI言語検出中の状態（needsAiDetectionがtrueなら最初から検出中）
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(needsAiDetection);

  // ヘッダーの高さを測定
  const [headerHeight, setHeaderHeight] = useState(52);

  // チャット展開時の最大高さを計算（searchページと同じロジック）
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

    const fixedSpaces = containerPaddingTop + containerPaddingBottom + containerMarginBottom +
      chatMessagesMarginBottom + bottomSectionPaddingTop +
      questionScrollViewHeight + bottomSectionGap + whiteContainerHeight - 12; // -12でさらに伸ばす

    // 画面高さ - safeAreaTop - headerHeight - 固定スペース - bottomSafeArea
    return screenHeight - safeAreaInsets.top - headerHeight - fixedSpaces - safeAreaInsets.bottom;
  }, [safeAreaInsets.top, safeAreaInsets.bottom, headerHeight]);

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
  } = useBookmarkManagement({ logPrefix: 'Translate' });

  // 翻訳データと状態
  const [translationData, setTranslationData] = useState<{ originalText: string; translatedText: string; sourceLang: string; targetLang: string } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedTranslateTargetLang, setSelectedTranslateTargetLang] = useState(initialTargetLang);
  const [error, setError] = useState<string | null>(null);

  // Quota exceeded modal state
  const [isQuotaModalVisible, setIsQuotaModalVisible] = useState(false);
  const [quotaErrorType, setQuotaErrorType] = useState<'translation_tokens' | 'question_count' | 'text_length' | undefined>();

  // 段落管理
  const [paragraphs, setParagraphs] = useState<TranslatedParagraph[]>([]);
  const paragraphsRef = useRef(paragraphs); // 常に最新のparagraphsを参照するためのRef
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);
  const [isSplittingParagraphs, setIsSplittingParagraphs] = useState(false);

  // paragraphsが更新されるたびにRefも更新
  useEffect(() => {
    paragraphsRef.current = paragraphs;
  }, [paragraphs]);

  // currentLanguage と nativeLanguage の最新値を保持するRef
  const currentLanguageRef = useRef(currentLanguage);
  const nativeLanguageRef = useRef(nativeLanguage);

  useEffect(() => {
    currentLanguageRef.current = currentLanguage;
    nativeLanguageRef.current = nativeLanguage;
  }, [currentLanguage, nativeLanguage]);

  // ページにフォーカスが戻った時に選択状態をクリア
  useFocusEffect(
    useCallback(() => {
      // ページにフォーカスが当たったとき（ページに戻ってきたとき）の処理
      logger.debug('[Translate] useFocusEffect - page focused, clearing selection state', {
        hadSelectedText: !!selectedText,
        selectedText: selectedText?.text,
      });
      setSelectedText(null);
      setWordContextInfo(null);
      setClearSelectionKey(prev => {
        const newKey = prev + 1;
        logger.debug('[Translate] useFocusEffect - clearSelectionKey incremented', {
          oldKey: prev,
          newKey,
        });
        return newKey;
      });
    }, [])  // 空の依存配列 - ページフォーカス時に必ず実行
  );

  // 画像翻訳から来た場合、AsyncStorageから全文データを読み込む
  useEffect(() => {
    if (fromImageTranslation) {
      logger.info('[Translate] Loading image translation data from AsyncStorage');

      getAndClearImageTranslationData().then((data) => {
        if (data) {
          logger.info('[Translate] Image translation data loaded', {
            extractedLength: data.extractedText.length,
            translatedLength: data.translatedText.length,
          });

          // stateに保存して、既存のinitialTranslationロジックで処理
          setImageTranslationText(data.extractedText);
          setImageTranslatedText(data.translatedText);
          setSourceLang(data.detectedLanguage);
          setSelectedTranslateTargetLang(data.targetLanguage);
        } else {
          logger.warn('[Translate] No image translation data found in AsyncStorage');
        }
        // データ読み込み完了（データがあってもなくても）
        setIsLoadingImageData(false);
      }).catch((error) => {
        logger.error('[Translate] Failed to load image translation data', error);
        setIsLoadingImageData(false);
      });
    }
  }, [fromImageTranslation]);

  // デバッグログ: text と initialTranslation の値を確認
  useEffect(() => {
    if (text || initialTranslation) {
      logger.info('[Translate] Current text and initialTranslation values:', {
        textLength: text.length,
        textPreview: text.substring(0, 100),
        initialTranslationLength: initialTranslation.length,
        initialTranslationPreview: initialTranslation.substring(0, 100),
        fromImageTranslation,
      });
    }
  }, [text, initialTranslation, fromImageTranslation]);

  // 短い段落を前の段落と結合するヘルパー関数
  const mergeShortParagraphs = (paragraphs: string[], minLength: number = 60): string[] => {
    if (paragraphs.length === 0) return [];
    if (paragraphs.length === 1) return paragraphs;

    const merged: string[] = [];
    let buffer = paragraphs[0];

    for (let i = 1; i < paragraphs.length; i++) {
      const current = paragraphs[i];

      // 現在のbufferまたは次の段落が短い場合は結合
      if (buffer.length < minLength || current.length < minLength) {
        buffer += '\n\n' + current;
      } else {
        merged.push(buffer);
        buffer = current;
      }
    }

    // 最後のbufferを追加
    merged.push(buffer);
    return merged;
  };

  // 画像翻訳から遷移した場合の初期データ設定
  useEffect(() => {
    if (initialTranslation && text && !translationData) {
      logger.info('[Translate] Setting translation data (initial from image):', {
        originalLength: text.length,
        translatedLength: initialTranslation.length,
        sourceLang: initialSourceLang,
        targetLang: initialTargetLang,
      });

      // 言語検出をスキップ（すでに検出済み）
      setIsDetectingLanguage(false);
      setSourceLang(initialSourceLang);

      // 段落分割処理を開始
      const processParagraphs = async () => {
        try {
          // テキストを段落に分割（簡易実装：改行で分割）
          const originalParagraphsSplit = text.split(/\n\n+/).filter(p => p.trim());
          const translatedParagraphsSplit = initialTranslation.split(/\n\n+/).filter(p => p.trim());

          logger.info('[Translate] Initial split:', {
            original: originalParagraphsSplit.length,
            translated: translatedParagraphsSplit.length,
          });

          // 短い段落を結合
          const originalParagraphs = mergeShortParagraphs(originalParagraphsSplit, 60);
          const translatedParagraphs = mergeShortParagraphs(translatedParagraphsSplit, 60);

          logger.info('[Translate] After merging short paragraphs:', {
            original: originalParagraphs.length,
            translated: translatedParagraphs.length,
          });

          // 段落が1つしかない場合や分割が合わない場合、1つの段落として扱う
          if (originalParagraphs.length !== translatedParagraphs.length || originalParagraphs.length === 0) {
            logger.info('[Translate] Using single paragraph for image translation');
            setParagraphs([{
              id: generateId('paragraph'),
              originalText: text,
              translatedText: initialTranslation,
              index: 0,
              isTranslating: false,
            }]);
          } else {
            // 複数段落に分割
            logger.info('[Translate] Split image translation into paragraphs:', originalParagraphs.length);
            const newParagraphs = originalParagraphs.map((origText, index) => ({
              id: generateId('paragraph'),
              originalText: origText.trim(),
              translatedText: translatedParagraphs[index]?.trim() || '',
              index,
              isTranslating: false,
            }));
            setParagraphs(newParagraphs);
          }

          // 翻訳データを設定
          setTranslationData({
            originalText: text,
            translatedText: initialTranslation,
            sourceLang: initialSourceLang,
            targetLang: initialTargetLang,
          });

          // 検索履歴に追加
          addSearchHistory(text, initialSourceLang, 'translation');
        } catch (error) {
          logger.error('[Translate] Error processing image translation paragraphs:', error);
          // エラー時は1つの段落として扱う
          setParagraphs([{
            id: generateId('paragraph'),
            originalText: text,
            translatedText: initialTranslation,
            index: 0,
            isTranslating: false,
          }]);
        }
      };

      processParagraphs();
    }
  }, [initialTranslation, text, initialSourceLang, initialTargetLang, translationData]);

  // 選択テキスト管理
  const [selectedText, setSelectedText] = useState<{
    text: string;
    isSingleWord: boolean;
    type: 'original' | 'translated';
    canReturnToWordCard?: boolean; // 単語カードに戻れるかどうか
  } | null>(null);

  // 選択クリア用のキー（値が変わると選択がクリアされる）
  const [clearSelectionKey, setClearSelectionKey] = useState(0);

  // 単語の文脈情報（API取得）
  const [wordContextInfo, setWordContextInfo] = useState<{
    translation: string;
    partOfSpeech: string[];
    nuance: string;
    sourceLang: string; // 選択された単語の言語
    targetLang: string; // 翻訳先の言語
  } | null>(null);
  const [isLoadingWordContext, setIsLoadingWordContext] = useState(false);

  // ChatSectionのモードを決定
  const chatSectionMode: ChatSectionMode = useMemo(() => {
    const mode = !selectedText ? 'default' : (selectedText.isSingleWord ? 'word' : 'text');
    logger.debug('[Translate] chatSectionMode calculated', {
      mode,
      hasSelectedText: !!selectedText,
      selectedText: selectedText?.text,
      isSingleWord: selectedText?.isSingleWord,
    });
    return mode;
  }, [selectedText]);

  // wordモード用の単語詳細データ
  const wordDetail = useMemo(() => {
    if (!selectedText || !selectedText.isSingleWord) return null;

    // APIから取得した文脈情報がある場合はそれを使用
    if (wordContextInfo) {
      // 選択された単語は表示せず、翻訳結果のみを見出し語として表示
      // 選択された単語が母国語の場合 → 学習言語の訳を見出し語に
      // 選択された単語が学習言語の場合 → 母国語の訳を見出し語に
      return {
        headword: wordContextInfo.translation, // 翻訳結果を見出し語に
        reading: '', // キーワードは非表示
        meanings: [],
        partOfSpeech: wordContextInfo.partOfSpeech,
        nuance: wordContextInfo.nuance,
        isBookmarked: false,
      };
    }

    // ローディング中またはまだ取得していない場合
    return {
      headword: selectedText.text,
      reading: '',
      meanings: [],
      partOfSpeech: [],
      nuance: isLoadingWordContext ? '情報を取得中...' : '単語を選択しました。',
      isBookmarked: false,
    };
  }, [selectedText, wordContextInfo, isLoadingWordContext]);

  // クリップボードからの質問入力
  // 注: クリップボード監視は _layout.tsx で一元管理されているため、ここでは不要
  const [prefilledChatText, setPrefilledChatText] = useState<string | null>(null);

  // QAペア管理（チャットメッセージから生成）
  const [qaPairs, setQAPairs] = useState<QAPair[]>([]);
  const [activeFollowUpPairId, setActiveFollowUpPairId] = useState<string | undefined>();

  // チャットコンテキスト
  const chatContext = useMemo(() => {
    if (!translationData) {
      return undefined;
    }
    return {
      originalText: translationData.originalText,
      translatedText: translationData.translatedText,
      sourceLang: translationData.sourceLang,
      targetLang: translationData.targetLang,
    };
  }, [translationData]);

  // チャットセッション
  const {
    messages: chatMessages,
    followUps,
    isStreaming: isChatStreaming,
    error: chatError,
    sendMessage: sendChatMessage,
    sendQuickQuestion,
  } = useChatSession({
    scope: 'translate',
    identifier: translationData?.originalText || text,
    context: chatContext,
    targetLanguage: currentLanguage.code,
  });

  // デバッグログ
  useEffect(() => {
    logger.info('[Translate] isDetectingLanguage state changed:', isDetectingLanguage);
  }, [isDetectingLanguage]);

  useEffect(() => {
    logger.info('[Translate] isTranslating state changed:', isTranslating);
  }, [isTranslating]);

  // デバッグ: 状態監視
  useEffect(() => {
    const pressablePointerEvents = chatSectionMode === 'word' ? 'none' : 'auto';
    logger.debug('[Translate] State snapshot', {
      selectedText: selectedText?.text || null,
      chatSectionMode,
      pressablePointerEvents,
    });
  }, [selectedText, chatSectionMode]);

  // chatMessagesをQA Pairsに変換
  useEffect(() => {
    logger.info('[Translate] Converting chat messages to QA pairs', {
      messageCount: chatMessages.length,
      hasError: !!chatError,
    });
    const pairs = toQAPairs(chatMessages, {
      fallbackError: chatError,
      context: chatContext,
    });
    setQAPairs(pairs);
  }, [chatMessages, chatError, chatContext]);

  // 翻訳先言語を決定（メモ化して不要な再計算を防止）
  const determineTranslateTargetLang = useCallback((srcLang: string): string => {
    if (srcLang !== nativeLanguage.code) {
      return nativeLanguage.code;
    }
    return currentLanguage.code;
  }, [nativeLanguage.code, currentLanguage.code]);

  // AI言語検出イベントリスナー（バックグラウンド検出結果を受信）
  useEffect(() => {
    const unsubscribe = languageDetectionEvents.subscribe((event) => {
      logger.info('[Translate] Received language detection event:', {
        language: event.language,
        confidence: event.confidence,
        currentText: text.substring(0, 30),
        eventText: event.text.substring(0, 30),
      });

      // このページのテキストと一致する場合のみ処理
      if (event.text.trim() === text.trim()) {
        setIsDetectingLanguage(false);

        // 言語を更新（検出された言語がsourceLangと違う場合）
        if (event.language !== sourceLang) {
          logger.info('[Translate] Updating source language from', sourceLang, 'to', event.language);
          setSourceLang(event.language);

          // 翻訳先言語を再計算
          const newTargetLang = determineTranslateTargetLang(event.language);
          setSelectedTranslateTargetLang(newTargetLang);
          logger.info('[Translate] Updated target lang to:', newTargetLang);
        }

        // ヘッダーの言語タブを自動切り替え（検出された言語が現在のタブと違い、かつ母語でない場合）
        const currentLang = currentLanguageRef.current;
        const nativeLang = nativeLanguageRef.current;
        if (event.language !== nativeLang.code && event.language !== currentLang.code) {
          logger.info('[Translate] Auto-switching language tab from', currentLang.code, 'to', event.language);
          setCurrentLanguage(event.language);
        } else {
          logger.info('[Translate] Language tab unchanged:', currentLang.code);
        }
      }
    });

    return unsubscribe;
  }, [text, sourceLang, setCurrentLanguage]);

  // AI言語検出は use-search.ts で既に実行されているため、ここでは不要
  // イベントリスナー（上記のuseEffect）で検出結果を受け取る
  // 検出開始のマーキングだけを行う
  useEffect(() => {
    if (needsAiDetection && text) {
      logger.info('[Translate] AI detection is running in background (from use-search.ts)');
      setIsDetectingLanguage(true);

      // タイムアウト設定 - イベントが来ない場合のフォールバック
      const detectionTimeout = setTimeout(() => {
        // Refを使って常に最新のparagraphsを参照
        const currentParagraphs = paragraphsRef.current;

        // 段落が既に存在する場合はタイムアウト処理をスキップ（翻訳実行中）
        logger.info('[Translate] AI language detection timeout check:', {
          paragraphCount: currentParagraphs.length,
          willProceed: currentParagraphs.length === 0,
        });

        if (currentParagraphs.length === 0) {
          logger.warn('[Translate] AI language detection timeout - proceeding with translation');
          setIsDetectingLanguage(false);
        } else {
          logger.info('[Translate] AI language detection timeout, but translation already in progress - ignoring');
        }
      }, TRANSLATION_CONFIG.LANGUAGE_DETECTION_TIMEOUT);

      return () => {
        clearTimeout(detectionTimeout);
      };
    }
  }, [needsAiDetection, text]);

  // 言語切り替えを監視して再翻訳
  useEffect(() => {
    if (currentLanguage) {
      const newTargetLang = determineTranslateTargetLang(sourceLang);
      if (newTargetLang !== selectedTranslateTargetLang) {
        setSelectedTranslateTargetLang(newTargetLang);
      }
    }
  }, [currentLanguage, sourceLang, selectedTranslateTargetLang, determineTranslateTargetLang]);

  // 翻訳実行（プログレッシブアプローチ: 段落分割→順次翻訳）
  useEffect(() => {
    let isActive = true; // この翻訳リクエストがまだアクティブか

    const performProgressiveTranslation = async () => {
      logger.info('[Translate] performProgressiveTranslation called with:', {
        text: text?.substring(0, 50),
        sourceLang,
        targetLang: selectedTranslateTargetLang,
        paragraphsExist: paragraphs.length > 0,
      });

      // 既に段落が存在する場合（タイムアウト後の再実行など）はスキップ
      if (paragraphs.length > 0) {
        logger.info('[Translate] Paragraphs already exist, skipping re-translation');
        return;
      }

      setIsTranslating(true);
      setError(null);
      setParagraphs([]);
      setCurrentParagraphIndex(0);

      logger.info('[Translate] Starting progressive translation flow:', {
        sourceLang,
        targetLang: selectedTranslateTargetLang,
        textLength: text.length
      });

      try {
        // Step 1: AI段落分割をストリーミングで実行し、段落ごとに即座に翻訳開始
        logger.info('[Translate] Step 1: Starting streaming AI paragraph split with parallel translation');

        const translatedParagraphs: TranslatedParagraph[] = [];
        const translationPromises: Promise<void>[] = [];
        let completedCount = 0;
        let totalParagraphs = 0;
        let isSplitComplete = false;

        // 翻訳キュー管理（並列実行で高速化）
        const PARALLEL_LIMIT = TRANSLATION_CONFIG.PARALLEL_LIMIT;
        let currentlyTranslating = 0;
        const translationQueue: Array<() => Promise<void>> = [];

        // 翻訳タスクを実行するヘルパー関数
        const executeTranslationTask = async (task: () => Promise<void>) => {
          currentlyTranslating++;
          try {
            await task();
          } finally {
            currentlyTranslating--;
            completedCount++;

            // キューに次のタスクがあれば実行
            if (translationQueue.length > 0 && currentlyTranslating < PARALLEL_LIMIT) {
              const nextTask = translationQueue.shift();
              if (nextTask) {
                executeTranslationTask(nextTask);
              }
            }

            // すべて完了したかチェック
            if (isSplitComplete && completedCount === totalParagraphs) {
              logger.info('[Translate] All translations complete');
              logger.info('[Translate] Final state:', {
                paragraphCount: translatedParagraphs.length,
                paragraphs: translatedParagraphs.map(p => ({
                  index: p.index,
                  hasOriginal: !!p.originalText,
                  hasTranslation: !!p.translatedText,
                  translationLength: p.translatedText?.length || 0,
                  isTranslating: p.isTranslating,
                })),
              });
              setIsTranslating(false);

              // 翻訳データを更新（チャット文脈用）
              const fullTranslatedText = translatedParagraphs.map(p => p.translatedText).join('\n\n');
              const newTranslationData = {
                originalText: text,
                translatedText: fullTranslatedText,
                sourceLang,
                targetLang: selectedTranslateTargetLang,
              };
              logger.info('[Translate] Setting translation data (initial):', {
                originalLength: text.length,
                translatedLength: fullTranslatedText.length,
                sourceLang,
                targetLang: selectedTranslateTargetLang,
              });
              setTranslationData(newTranslationData);

              // 翻訳履歴に保存
              try {
                await addSearchHistory(
                  text,
                  sourceLang,
                  undefined,
                  undefined,
                  'translation'
                );
                logger.info('[Translate] Added to history:', {
                  text: text.substring(0, 50),
                  language: sourceLang,
                  searchType: 'translation',
                });
              } catch (historyError) {
                logger.error('[Translate] Failed to save translation history:', historyError);
              }
            }
          }
        };

        // SSEストリーミング分割を開始（段落が来るたびに即座に翻訳開始）
        // エラー時は自動的にバッチAPIにフォールバック
        const useSplitFn = async (
          text: string,
          sourceLang: string,
          onParagraph: (paragraph: any) => void,
          onComplete: (count: number) => void,
          onError: (error: Error) => void
        ) => {
          try {
            logger.info('[Translate] Trying SSE streaming API');
            await splitOriginalTextStreamSSE(text, sourceLang, onParagraph, onComplete, onError);
          } catch (sseError) {
            logger.warn('[Translate] SSE failed, falling back to batch API:', sseError);
            await splitOriginalTextStream(text, sourceLang, onParagraph, onComplete, onError);
          }
        };

        await useSplitFn(
          text,
          sourceLang,
          // onParagraph: 各段落が到着したら即座に表示して翻訳キューに追加
          (paragraph) => {
            if (!isActive) {
              logger.warn('[Translate] Translation cancelled, ignoring paragraph:', paragraph.index);
              return;
            }

            logger.info('[Translate] Paragraph arrived, displaying and queuing translation:', {
              index: paragraph.index,
              textLength: paragraph.originalText.length,
            });

            // 段落を即座に表示（translatedTextは空）
            const newParagraph: TranslatedParagraph = {
              id: generateId(),
              originalText: paragraph.originalText,
              translatedText: '',
              index: paragraph.index,
              isTranslating: true,
            };

            translatedParagraphs[paragraph.index] = newParagraph;
            // 配列全体のコピーを避けるため、setStateのコールバック形式を使用
            setParagraphs(prev => {
              const updated = [...prev];
              updated[paragraph.index] = newParagraph;
              return updated;
            });

            // 翻訳タスクを作成（ストリーミング対応）
            const translationTask = async () => {
              if (!isActive) {
                logger.warn('[Translate] Translation cancelled for paragraph', paragraph.index);
                return;
              }

              try {
                const previousParagraph = paragraph.index > 0
                  ? translatedParagraphs[paragraph.index - 1]?.originalText
                  : undefined;
                const nextParagraph = paragraph.index < translatedParagraphs.length - 1
                  ? translatedParagraphs[paragraph.index + 1]?.originalText
                  : undefined;

                logger.info('[Translate] Starting streaming translation for paragraph', paragraph.index);

                // ストリーミング翻訳を使用
                await translateParagraphStream(
                  paragraph.originalText,
                  sourceLang,
                  selectedTranslateTargetLang,
                  paragraph.index,
                  // onChunk: チャンクごとにリアルタイム更新
                  (chunk) => {
                    if (isActive) {
                      translatedParagraphs[paragraph.index] = {
                        ...translatedParagraphs[paragraph.index],
                        translatedText: translatedParagraphs[paragraph.index].translatedText + chunk,
                        isTranslating: true,
                      };
                      setParagraphs(prev => {
                        const updated = [...prev];
                        updated[paragraph.index] = translatedParagraphs[paragraph.index];
                        return updated;
                      });
                    }
                  },
                  // onComplete: 翻訳完了
                  (translatedText) => {
                    if (isActive) {
                      translatedParagraphs[paragraph.index] = {
                        ...translatedParagraphs[paragraph.index],
                        translatedText,
                        isTranslating: false,
                      };
                      setParagraphs(prev => {
                        const updated = [...prev];
                        updated[paragraph.index] = translatedParagraphs[paragraph.index];
                        return updated;
                      });
                      logger.info('[Translate] Paragraph streaming translation complete:', paragraph.index);
                    } else {
                      logger.warn('[Translate] Translation result discarded (cancelled):', paragraph.index);
                    }
                  },
                  // onError: エラー処理
                  (error) => {
                    logger.error('[Translate] Paragraph translation failed:', error);

                    // Check if this is a quota error
                    const quotaError = parseQuotaError(error);

                    let errorText: string;
                    if (quotaError.isQuotaError) {
                      // Show quota exceeded modal
                      setQuotaErrorType(quotaError.quotaType);
                      setIsQuotaModalVisible(true);
                      errorText = quotaError.userFriendlyMessage;
                    } else {
                      const errorMessage = error.message;
                      errorText = errorMessage.includes('503')
                        ? '翻訳サービスが混雑しています。しばらく待ってから再試行してください。'
                        : '翻訳に失敗しました';
                    }

                    translatedParagraphs[paragraph.index] = {
                      ...translatedParagraphs[paragraph.index],
                      translatedText: `❌ ${errorText}`,
                      isTranslating: false,
                    };
                    setParagraphs(prev => {
                      const updated = [...prev];
                      updated[paragraph.index] = translatedParagraphs[paragraph.index];
                      return updated;
                    });
                  },
                  previousParagraph,
                  nextParagraph
                );
              } catch (error) {
                logger.error('[Translate] Paragraph translation setup failed:', error);

                // Check if this is a quota error
                const quotaError = parseQuotaError(error);

                let errorText: string;
                if (quotaError.isQuotaError) {
                  // Show quota exceeded modal
                  setQuotaErrorType(quotaError.quotaType);
                  setIsQuotaModalVisible(true);
                  errorText = quotaError.userFriendlyMessage;
                } else {
                  const errorMessage = error instanceof Error ? error.message : String(error);
                  errorText = errorMessage.includes('503')
                    ? '翻訳サービスが混雑しています。しばらく待ってから再試行してください。'
                    : '翻訳に失敗しました';
                }

                translatedParagraphs[paragraph.index] = {
                  ...translatedParagraphs[paragraph.index],
                  translatedText: `❌ ${errorText}`,
                  isTranslating: false,
                };
                setParagraphs(prev => {
                  const updated = [...prev];
                  updated[paragraph.index] = translatedParagraphs[paragraph.index];
                  return updated;
                });
              }
            };

            // キューに追加または即実行
            if (currentlyTranslating < PARALLEL_LIMIT) {
              executeTranslationTask(translationTask);
            } else {
              translationQueue.push(translationTask);
            }
          },
          // onComplete: すべての段落分割が完了
          async (paragraphCount) => {
            if (!isActive) {
              logger.warn('[Translate] Translation cancelled, skipping completion');
              return;
            }

            logger.info('[Translate] All paragraphs split, total:', paragraphCount);
            totalParagraphs = paragraphCount;
            isSplitComplete = true;

            // 段落分割完了時点で翻訳が全て完了していればフラグ更新
            if (completedCount === totalParagraphs) {
              logger.info('[Translate] All translations already complete');
              setIsTranslating(false);
            }
          },
          // onError: エラー処理
          (error) => {
            logger.error('[Translate] Split stream error:', error);
            setError(error.message);
            setIsTranslating(false);
          }
        );

        logger.info('[Translate] Split stream finished, translations may still be in progress');
      } catch (err) {
        logger.error('[Translate] Progressive translation failed:', err);
        setError(t('translate.error'));
        setIsTranslating(false);
      }
    };

    // 画像翻訳データの読み込み中は待機
    if (isLoadingImageData) {
      logger.info('[Translate] Waiting for image data to load from AsyncStorage...');
      return;
    }

    // 画像翻訳からの遷移で、既に翻訳済みデータがある場合はスキップ
    if (initialTranslation && fromImageTranslation) {
      logger.info('[Translate] Skipping auto-translation (using initialTranslation from AsyncStorage):', {
        initialTranslationLength: initialTranslation.length,
        textLength: text.length,
      });
      return;
    }

    if (text && !isDetectingLanguage) {
      performProgressiveTranslation();
    } else if (isDetectingLanguage) {
      logger.info('[Translate] Waiting for language detection to complete...');
    }

    // クリーンアップ: 依存関係が変わったら古い翻訳をキャンセル
    return () => {
      logger.info('[Translate] Translation cancelled due to dependency change');
      isActive = false;
    };
  }, [text, sourceLang, selectedTranslateTargetLang, isDetectingLanguage, initialTranslation, fromImageTranslation, isLoadingImageData]); // initialTranslation と fromImageTranslation、isLoadingImageData も追加してスキップロジックが動作するように

  // 言語検出完了時に翻訳を開始するuseEffectは削除
  // 代わりに、メインuseEffect内で isDetectingLanguage を直接チェック

  // 学習言語変更時の再翻訳（段落はそのまま、翻訳だけやり直す）
  const retranslateParagraphs = useCallback(async () => {
    if (paragraphs.length === 0 || isTranslating) {
      return;
    }

    logger.info('[Translate] Re-translating paragraphs to new target language:', selectedTranslateTargetLang);
    setIsTranslating(true);
    setError(null);

    // 各段落の翻訳をリセット
    const updatedParagraphs = paragraphs.map(p => ({
      ...p,
      translatedText: '',
      isTranslating: true,
    }));
    setParagraphs(updatedParagraphs);

    // 翻訳された段落を保持する配列
    const translatedParagraphs = [...updatedParagraphs];

    try {
      // 各段落を順次翻訳
      for (const paragraph of paragraphs) {
        await translateParagraphStream(
          paragraph.originalText,
          sourceLang,
          selectedTranslateTargetLang,
          paragraph.index,
          // onChunk: チャンクごとにリアルタイム更新
          (chunk) => {
            translatedParagraphs[paragraph.index] = {
              ...translatedParagraphs[paragraph.index],
              translatedText: translatedParagraphs[paragraph.index].translatedText + chunk,
              isTranslating: true,
            };
            setParagraphs(prev => {
              const updated = [...prev];
              updated[paragraph.index] = translatedParagraphs[paragraph.index];
              return updated;
            });
          },
          // onComplete: 翻訳完了
          (translatedText) => {
            translatedParagraphs[paragraph.index] = {
              ...translatedParagraphs[paragraph.index],
              translatedText,
              isTranslating: false,
            };
            setParagraphs(prev => {
              const updated = [...prev];
              updated[paragraph.index] = translatedParagraphs[paragraph.index];
              return updated;
            });
          },
          // onError: エラー処理
          (error) => {
            logger.error('[Translate] Re-translation error for paragraph', paragraph.index, error);

            // Check if this is a quota error
            const quotaError = parseQuotaError(error);

            let errorText: string;
            if (quotaError.isQuotaError) {
              // Show quota exceeded modal
              setQuotaErrorType(quotaError.quotaType);
              setIsQuotaModalVisible(true);
              errorText = quotaError.userFriendlyMessage;
            } else {
              const errorMessage = error instanceof Error ? error.message : String(error);
              errorText = errorMessage.includes('503')
                ? '翻訳サービスが混雑しています。しばらく待ってから再試行してください。'
                : '翻訳に失敗しました';
            }

            translatedParagraphs[paragraph.index] = {
              ...translatedParagraphs[paragraph.index],
              translatedText: `❌ ${errorText}`,
              isTranslating: false,
            };
            setParagraphs(prev => {
              const updated = [...prev];
              updated[paragraph.index] = translatedParagraphs[paragraph.index];
              return updated;
            });
          }
        );
      }

      // 翻訳データを更新
      const fullTranslatedText = translatedParagraphs.map(p => p.translatedText).join('\n\n');
      const newTranslationData = {
        originalText: text,
        translatedText: fullTranslatedText,
        sourceLang,
        targetLang: selectedTranslateTargetLang,
      };
      logger.info('[Translate] Setting translation data:', {
        originalLength: text.length,
        translatedLength: fullTranslatedText.length,
        sourceLang,
        targetLang: selectedTranslateTargetLang,
      });
      setTranslationData(newTranslationData);

      logger.info('[Translate] Re-translation completed successfully');
    } catch (error) {
      logger.error('[Translate] Re-translation failed:', error);

      // Check if this is a quota error
      const quotaError = parseQuotaError(error);

      if (quotaError.isQuotaError) {
        // Show quota exceeded modal
        setQuotaErrorType(quotaError.quotaType);
        setIsQuotaModalVisible(true);
        setError(quotaError.userFriendlyMessage);
      } else {
        setError('再翻訳に失敗しました。もう一度お試しください。');
      }
    } finally {
      setIsTranslating(false);
    }
  }, [paragraphs, sourceLang, selectedTranslateTargetLang, isTranslating, text]);

  // 学習言語変更時の再翻訳トリガー
  const prevTargetLangRef = useRef(selectedTranslateTargetLang);

  useEffect(() => {
    // 初回ロードを除外 & 翻訳済みデータがある場合のみ
    if (prevTargetLangRef.current !== selectedTranslateTargetLang && paragraphs.length > 0 && !isTranslating) {
      logger.info('[Translate] Target language changed from', prevTargetLangRef.current, 'to', selectedTranslateTargetLang);
      retranslateParagraphs();
    }
    prevTargetLangRef.current = selectedTranslateTargetLang;
  }, [selectedTranslateTargetLang, paragraphs.length, isTranslating, retranslateParagraphs]);

  // 追加質問のハンドラー
  const handleFollowUpQuestion = async (pairId: string, question: string) => {
    logger.debug('[Translate] handleFollowUpQuestion:', { pairId, question });

    // 1. 対象のQAPairを見つける
    const targetPair = qaPairs.find(p => p.id === pairId);
    if (!targetPair) {
      logger.error('[Translate] Target pair not found:', pairId);
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
    let contextualQuestion = `[元の文章]\n${translationData?.originalText || ''}\n\n[翻訳]\n${translationData?.translatedText || ''}`;

    contextualQuestion += `\n\n[前回の質問]\n${targetPair.q}\n\n[前回の回答]\n${targetPair.a}`;

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
          scope: 'translate',
          identifier: translationData?.originalText || text,
          messages: [{ id: generateId('msg'), role: 'user', content: contextualQuestion, createdAt: Date.now() }],
          context: chatContext,
          targetLanguage: currentLanguage.code,
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
          logger.info('[Translate] Follow-up question completed');
        },
        // onError: エラー時
        (error) => {
          logger.error('[Translate] Follow-up question error:', error);
          setQAPairs(prev => prev.map(pair => {
            if (pair.id === pairId) {
              return {
                ...pair,
                followUpQAs: pair.followUpQAs?.map(fu =>
                  fu.id === followUpId ? { ...fu, status: 'error' as const, errorMessage: error.message } : fu
                ),
              };
            }
            return pair;
          }));
        }
      );

      // ジェネレーターを実行（必要に応じて）
      for await (const _chunk of generator) {
        // ストリーミング中は何もしない（onContentで処理済み）
      }
    } catch (error) {
      logger.error('[Translate] Failed to send follow-up question:', error);
      setQAPairs(prev => prev.map(pair => {
        if (pair.id === pairId) {
          return {
            ...pair,
            followUpQAs: pair.followUpQAs?.map(fu =>
              fu.id === followUpId ? { ...fu, status: 'error' as const, errorMessage: 'Failed to send question' } : fu
            ),
          };
        }
        return pair;
      }));
    }
  };

  const handleEnterFollowUpMode = (pairId: string, question: string) => {
    if (activeFollowUpPairId === pairId) {
      setActiveFollowUpPairId(undefined);
    } else {
      setActiveFollowUpPairId(pairId);
    }
  };

  const handleChatSubmit = async (question: string) => {
    let finalQuestion = question;
    let displayQuestion = question;

    logger.info('[Translate] handleChatSubmit called:', {
      question,
      hasSelectedText: !!selectedText,
      hasTranslationData: !!translationData,
      chatContext,
    });

    if (selectedText?.text) {
      // API用: 部分選択した箇所に焦点を当てた質問形式
      finalQuestion = `文章全体の文脈を理解した上で、選択された部分「${selectedText.text}」に焦点を当てて回答してください。\n\n質問：${question}`;
      // UI表示用: シンプルな形式
      displayQuestion = `「${selectedText.text}」について：${question}`;
      // 選択を維持（ユーザーが同じ単語について複数質問できるように）
    }

    await sendChatMessage(finalQuestion, displayQuestion);
  };

  const handleQuickQuestion = async (questionOrTag: string | QuestionTagType) => {
    // QuestionTagの場合は新しいAPI経由で送信
    if (typeof questionOrTag === 'object' && questionOrTag.promptId) {
      const tag = questionOrTag;

      logger.info('[Translate] handleQuickQuestion with tag:', {
        tagId: tag.id,
        promptId: tag.promptId,
        isCustom: tag.isCustom,
        hasSelectedText: !!selectedText,
        hasTranslationData: !!translationData,
      });

      // Save selectedText value for display
      const selectedTextValue = selectedText?.text;

      // Display question and loading state immediately
      const displayQuestion = selectedTextValue
        ? `「${selectedTextValue}」について：${tag.prompt}`
        : tag.prompt;

      const pairId = generateId();
      const loadingPair: QAPair = {
        id: pairId,
        q: displayQuestion,
        a: '', // Empty answer, will be filled when response arrives
        status: 'pending', // Show loading state
      };

      setQAPairs(prev => [...prev, loadingPair]);

      try {
        // Build request payload
        const request = {
          questionTagId: tag.id,
          isCustom: tag.isCustom ?? false,
          nativeLanguage: nativeLanguage.code,
          targetLanguage: currentLanguage.code, // 常に学習言語で言い換え
          scope: 'translate',
          identifier: translationData?.originalText || text,
          // Word-based prompts need word and meaning fields
          word: selectedText?.isSingleWord ? selectedText.text : undefined,
          meaning: wordDetail?.headword, // Translation result from wordContextInfo
          // Text selection mode - use saved value
          selectedText: selectedTextValue,
          fullContext: translationData?.originalText || text,
          // Custom question (if applicable)
          customQuestion: tag.isCustom ? tag.prompt : undefined,
        };

        logger.info('[Translate] Sending question tag query:', request);

        const response = await sendQuestionTagQuery(request);

        logger.info('[Translate] Question tag response received:', {
          answerLength: response.answer.length,
          promptId: response.promptId,
        });

        // Update the pair with the actual response
        setQAPairs(prev => prev.map(pair =>
          pair.id === pairId
            ? {
              ...pair,
              a: response.answer,
              status: 'completed',
              promptId: response.promptId,
              metadata: response.metadata,
            }
            : pair
        ));

        // Don't clear selection - keep word context visible
        // User can manually clear selection if needed

      } catch (error) {
        logger.error('[Translate] Error sending question tag query:', error);

        // Check if this is a quota error
        const quotaError = parseQuotaError(error);

        if (quotaError.isQuotaError) {
          // Show quota exceeded modal
          setQuotaErrorType(quotaError.quotaType);
          setIsQuotaModalVisible(true);

          // Update QA pair with quota-specific error
          setQAPairs(prev => prev.map(pair =>
            pair.id === pairId
              ? {
                ...pair,
                a: '',
                status: 'error',
                errorMessage: quotaError.userFriendlyMessage,
              }
              : pair
          ));
        } else {
          // Regular error handling
          setQAPairs(prev => prev.map(pair =>
            pair.id === pairId
              ? {
                ...pair,
                a: '',
                status: 'error',
                errorMessage: error instanceof Error ? error.message : 'エラーが発生しました',
              }
              : pair
          ));

          // Fallback to old system for non-quota errors
          await handleQuickQuestionLegacy(tag.prompt);
        }
      }

      return;
    }

    // Legacy string-based question handling
    await handleQuickQuestionLegacy(typeof questionOrTag === 'string' ? questionOrTag : questionOrTag.prompt);
  };

  const handleQuickQuestionLegacy = async (question: string) => {
    let finalQuestion = question;
    let displayQuestion = question;

    // 部分選択の有無で指示を切り分け
    if (selectedText?.text) {
      // 部分選択時: 選択部分のみに焦点を当てる
      // 質問内容に応じた詳細な指示を追加
      if (question.includes('ニュアンス')) {
        finalQuestion = `文章全体の文脈を理解した上で、選択された部分「${selectedText.text}」のトーンや雰囲気（フォーマル・カジュアル、公的・私的、丁寧・くだけた表現など）を具体的に説明してください。`;
      } else if (question.includes('要約')) {
        finalQuestion = `文章全体の文脈を理解した上で、選択された部分「${selectedText.text}」の要点を簡潔に、箇条書きでまとめてください。`;
      } else if (question.includes('文法')) {
        finalQuestion = `文章全体の文脈を理解した上で、選択された部分「${selectedText.text}」の中で特に注目すべき文法事項や、学習者が気をつけるべき文法ポイント（時制、態、構文、語順、慣用表現など）のみを詳しく、わかりやすく説明してください。意味の説明や言語の説明は不要です。`;
      } else if (question.includes('チェック')) {
        finalQuestion = `文章全体の文脈を理解した上で、選択された部分「${selectedText.text}」の文法ミスや不自然な表現があれば指摘し、改善案を提示してください。`;
      } else if (question.includes('言い換え')) {
        finalQuestion = `文章全体の文脈を理解した上で、選択された部分「${selectedText.text}」の別の表現方法を複数提示してください。`;
      } else {
        finalQuestion = `文章全体の文脈を理解した上で、選択された部分「${selectedText.text}」に焦点を当てて回答してください。\n\n質問：${question}`;
      }
      // UI表示用: シンプルな形式
      displayQuestion = `「${selectedText.text}」について：${question}`;
      // 選択を維持（ユーザーが同じ単語について複数質問できるように）
    } else {
      // 文章全体への質問時: 文章全体を対象とする
      // 質問内容に応じた詳細な指示を追加
      if (question.includes('ニュアンス')) {
        finalQuestion = `${question}\n\n※「この文章は」という形で、文章全体のトーンや雰囲気（フォーマル・カジュアル、公的・私的、ニュース記事風・会話風、丁寧・くだけた表現など）を具体的に説明してください。`;
      } else if (question.includes('要約')) {
        finalQuestion = `${question}\n\n※文章全体の要点を簡潔に、箇条書きでまとめてください。`;
      } else if (question.includes('文法')) {
        finalQuestion = `${question}\n\n※文章全体の中で特に注目すべき文法事項や、学習者が気をつけるべき文法ポイント（時制、態、構文、語順、慣用表現など）のみを詳しく、わかりやすく説明してください。意味の説明や言語の説明は不要です。`;
      } else if (question.includes('チェック')) {
        finalQuestion = `${question}\n\n※文章全体の文法ミスや不自然な表現があれば指摘し、改善案を提示してください。`;
      } else if (question.includes('言い換え')) {
        finalQuestion = `${question}\n\n※文章全体を別の表現方法で複数提示してください。`;
      }
    }

    await sendQuickQuestion(finalQuestion, displayQuestion);
  };

  const handleQACardRetry = (question: string) => {
    void sendChatMessage(question);
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleTextSelectionWithInfo = async (selectionInfo: SelectionInfo, type: 'original' | 'translated') => {
    setSelectedText({ ...selectionInfo, type });
    setWordContextInfo(null); // 前回の情報をクリア

    logger.info('[Translate] Text selected:', {
      text: selectionInfo.text.substring(0, 30),
      isSingleWord: selectionInfo.isSingleWord,
      type,
      currentParagraphIndex,
      selectionStartInParagraph: selectionInfo.startIndex,
      selectionEndInParagraph: selectionInfo.endIndex,
      hasParagraphs: paragraphs.length > 0,
      hasTranslationData: !!translationData,
    });

    // 単語の場合、プリフェッチを開始（辞書で調べるボタンを押す前に準備）
    if (selectionInfo.isSingleWord && selectionInfo.text.trim()) {
      // 原文で選択 → sourceLang、訳文で選択 → selectedTranslateTargetLang を使う
      const targetLang = type === 'original' ? sourceLang : selectedTranslateTargetLang;
      logger.info('[Translate] Pre-fetching word detail for selected text:', selectionInfo.text, 'type:', type, 'resolved targetLang:', targetLang);

      prefetchWordDetail(selectionInfo.text.trim(), (onProgress) => {
        return getWordDetailStream(selectionInfo.text.trim(), targetLang, nativeLanguage.code, onProgress);
      });

      // 文脈情報を取得 - 段落データまたは翻訳データが存在する場合
      const hasContext = paragraphs.length > 0 || translationData;
      logger.info('[Translate] Word context check:', {
        hasContext,
        paragraphCount: paragraphs.length,
        hasTranslationData: !!translationData,
      });

      if (hasContext) {
        setIsLoadingWordContext(true);
        try {
          // 選択されたテキストが原文か訳文かによって、sourceLangとtargetLangを決定
          let wordSourceLang: string;
          let wordTargetLang: string;
          let fullText: string;

          if (translationData) {
            // translationDataが存在する場合はそれを使用
            wordSourceLang = type === 'original' ? translationData.sourceLang : translationData.targetLang;
            wordTargetLang = type === 'original' ? translationData.targetLang : translationData.sourceLang;
            fullText = type === 'original'
              ? translationData.originalText
              : translationData.translatedText;
          } else {
            // paragraphsから文脈を構築
            wordSourceLang = type === 'original' ? sourceLang : selectedTranslateTargetLang;
            wordTargetLang = type === 'original' ? selectedTranslateTargetLang : sourceLang;

            if (type === 'original') {
              fullText = paragraphs.map(p => p.originalText).filter(t => t).join('\n\n');
            } else {
              fullText = paragraphs.map(p => p.translatedText).filter(t => t).join('\n\n');
            }
          }

          // 段落内の位置を全体位置に変換
          let globalStartIndex = selectionInfo.startIndex;
          let globalEndIndex = selectionInfo.endIndex;

          // paragraphsが複数ある場合、現在の段落より前の段落の文字数を加算
          if (paragraphs.length > 1) {
            const relevantParagraphs = type === 'original'
              ? paragraphs.map(p => p.originalText).filter(t => t)
              : paragraphs.map(p => p.translatedText).filter(t => t);

            // 現在の段落より前の段落の文字数を計算（区切り文字 '\n\n' も含める）
            let offsetBeforeCurrentParagraph = 0;
            for (let i = 0; i < currentParagraphIndex; i++) {
              offsetBeforeCurrentParagraph += relevantParagraphs[i].length + 2; // 段落 + '\n\n'
            }

            globalStartIndex = offsetBeforeCurrentParagraph + selectionInfo.startIndex;
            globalEndIndex = offsetBeforeCurrentParagraph + selectionInfo.endIndex;

            logger.info('[Translate] Position conversion:', {
              paragraphIndex: currentParagraphIndex,
              offsetBeforeCurrentParagraph,
              localStart: selectionInfo.startIndex,
              localEnd: selectionInfo.endIndex,
              globalStart: globalStartIndex,
              globalEnd: globalEndIndex,
            });
          }

          // 選択位置の周辺文脈のみを抽出（前後150文字）
          const context = extractSurroundingContext(
            fullText,
            globalStartIndex,
            globalEndIndex,
            150
          );

          // キャッシュをチェック
          const cachedContext = await getWordContextCache(
            selectionInfo.text.trim(),
            context,
            wordSourceLang,
            wordTargetLang
          );

          if (cachedContext) {
            // キャッシュヒット - 即座に表示
            logger.info('[Translate] Using cached word context:', selectionInfo.text);
            setWordContextInfo(cachedContext);
            setIsLoadingWordContext(false);
            return;
          }

          // キャッシュミス - API呼び出し
          logger.info('[Translate] Fetching word context from API:', {
            word: selectionInfo.text,
            wordSourceLang,
            wordTargetLang,
            selectionStart: selectionInfo.startIndex,
            selectionEnd: selectionInfo.endIndex,
            fullTextLength: fullText.length,
            contextLength: context.length,
            context: context, // 抽出された文脈全体をログに出力
          });

          const contextInfo = await getWordContext(
            selectionInfo.text.trim(),
            context,
            wordSourceLang,
            wordTargetLang
          );

          logger.info('[Translate] Word context received:', contextInfo);

          // キャッシュに保存
          await setWordContextCache(
            selectionInfo.text.trim(),
            context,
            wordSourceLang,
            wordTargetLang,
            contextInfo
          );

          setWordContextInfo({
            ...contextInfo,
            sourceLang: wordSourceLang,
            targetLang: wordTargetLang,
          });
        } catch (error) {
          logger.error('[Translate] Failed to fetch word context:', error);
          // エラーが発生しても、辞書機能は使えるようにする
          const errorMessage = error instanceof Error ? error.message : '文脈情報の取得に失敗しました';
          logger.error('[Translate] Word context error details:', errorMessage);

          // エラー情報を設定（ユーザーに表示）
          setWordContextInfo({
            translation: selectionInfo.text,
            partOfSpeech: [],
            nuance: `文脈情報を取得できませんでした: ${errorMessage}`,
            sourceLang: type === 'original' ? sourceLang : selectedTranslateTargetLang,
            targetLang: type === 'original' ? selectedTranslateTargetLang : sourceLang,
          });
        } finally {
          setIsLoadingWordContext(false);
        }
      } else {
        logger.warn('[Translate] No context available for word context fetch');
      }
    }
  };

  const handleDictionaryLookup = () => {
    logger.info('[Translate] handleDictionaryLookup called, selectedText:', selectedText);

    if (!selectedText) {
      logger.warn('[Translate] handleDictionaryLookup: No selectedText, returning early');
      return;
    }

    // 選択されたテキストの言語を検出
    const detectedLang = detectLang(selectedText.text);

    // 母国語かどうかを判定
    const isNativeLanguage = (
      (detectedLang === 'ja' || detectedLang === 'kanji-only') &&
      nativeLanguage.code === 'ja'
    );

    if (isNativeLanguage) {
      // 母国語の場合: searchページへ遷移（訳語を表示）
      logger.info('[Translate] Dictionary lookup (native language):', selectedText.text, 'detected:', detectedLang, '-> navigating to search');
      router.push({
        pathname: '/(tabs)/search',
        params: {
          query: selectedText.text,
        },
      });
    } else {
      // 外国語の場合: word-detailページへ遷移（辞書を表示）
      // 原文で選択 → sourceLang、訳文で選択 → selectedTranslateTargetLang を使う
      const targetLang = selectedText.type === 'original' ? sourceLang : selectedTranslateTargetLang;

      logger.info('[Translate] Dictionary lookup (foreign language):', selectedText.text, 'type:', selectedText.type, 'resolved targetLang:', targetLang);

      router.push({
        pathname: '/(tabs)/word-detail',
        params: {
          word: selectedText.text,
          targetLanguage: targetLang,
          skipLanguageDetection: 'true', // 翻訳ページは既に正しい言語を知っているため
        },
      });
    }

    // 検索実行後に選択を解除
    setSelectedText(null);
  };

  const handleWordAskQuestion = () => {
    if (selectedText && selectedText.isSingleWord) {
      // isSingleWordはtrueのまま維持して単語モードの質問タグを表示
      // ChatSectionにフォーカスを当てて入力を促す
      logger.info('[Translate] Opening chat for word questions (keeping word mode)');
    }
  };

  const handleSwitchToWordCard = () => {
    if (selectedText && !selectedText.isSingleWord) {
      // isSingleWordをtrueに変更して単語カードモードに切り替え
      // canReturnToWordCardをfalseに設定
      setSelectedText({ ...selectedText, isSingleWord: true, canReturnToWordCard: false });
      logger.info('[Translate] Switched from text input mode back to word card mode');
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        {/* Header */}
        <View
          style={styles.headerContainer}
          onLayout={(e) => {
            const { height } = e.nativeEvent.layout;
            if (height > 0 && height !== headerHeight) {
              setHeaderHeight(height);
            }
          }}
        >
          <UnifiedHeaderBar pageType="translate" onBackPress={handleBackPress} isDetectingLanguage={isDetectingLanguage} />
        </View>

        {/* Translation Card - Scrollable */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
          <View style={styles.translateCardContainer}>
            <Pressable
              onPress={() => {
                logger.debug('[Translate] Pressable onPress', {
                  selectedText: selectedText?.text || null,
                  chatSectionMode,
                });
                if (selectedText) {
                  setSelectedText(null);
                  setWordContextInfo(null);
                  setClearSelectionKey(prev => prev + 1);
                  setQAPairs([]); // チャットセクションをリセット
                }
              }}
              onTouchStart={() => {
                logger.debug('[Translate] Pressable onTouchStart', {
                  chatSectionMode,
                  pointerEvents: chatSectionMode === 'word' ? 'none' : 'auto',
                });
              }}
              onPressIn={() => {
                logger.debug('[Translate] Pressable onPressIn', {
                  chatSectionMode,
                  disabled: chatSectionMode === 'word',
                });
              }}
            >
              <TranslateCard
                key={`translate-card-${currentParagraphIndex}`}
                paragraphs={paragraphs.length > 0 ? paragraphs : [{
                  id: 'loading',
                  originalText: '',
                  translatedText: '',
                  index: 0,
                }]}
                currentIndex={currentParagraphIndex}
                onIndexChange={(newIndex) => {
                  setSelectedText(null);
                  setWordContextInfo(null);
                  setClearSelectionKey(prev => prev + 1);
                  setCurrentParagraphIndex(newIndex);
                }}
                sourceLang={translationData?.sourceLang || sourceLang}
                targetLang={translationData?.targetLang || selectedTranslateTargetLang}
                isTranslating={isDetectingLanguage || isTranslating || isSplittingParagraphs}
                onTextSelectionWithInfo={handleTextSelectionWithInfo}
                onSelectionCleared={() => {
                  setSelectedText(null);
                  setWordContextInfo(null);
                  setQAPairs([]); // チャットセクションをリセット
                }}
                clearSelectionKey={clearSelectionKey}
              />
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {/* Chat Section - Fixed at bottom */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View
          pointerEvents="box-none"
          style={styles.chatContainerFixed}
          collapsable={false}
        >
          <ChatSection
            key={`${translationData?.originalText}-${selectedText?.text || 'default'}`}
            placeholder={t('translate.chatPlaceholder')}
            qaPairs={qaPairs}
            followUps={followUps}
            isStreaming={isChatStreaming}
            error={chatError}
            onSend={handleChatSubmit}
            onQuickQuestion={handleQuickQuestion}
            onRetryQuestion={handleQACardRetry}
            expandedMaxHeight={chatExpandedMaxHeight}
            scope="translate"
            identifier={translationData?.originalText || text}
            onBookmarkAdded={handleBookmarkAdded}
            onFollowUpQuestion={handleFollowUpQuestion}
            onEnterFollowUpMode={handleEnterFollowUpMode}
            prefilledInputText={prefilledChatText}
            onPrefillConsumed={() => setPrefilledChatText(null)}
            selectedText={selectedText}
            onDictionaryLookup={handleDictionaryLookup}
            onSelectionCleared={() => {
              setSelectedText(null);
              setWordContextInfo(null);
              setClearSelectionKey(prev => prev + 1);
              setQAPairs([]); // チャットセクションをリセット
            }}
            mode={chatSectionMode}
            wordDetail={wordDetail}
            isLoadingWordDetail={isLoadingWordContext}
            onWordBookmarkToggle={() => {
              // TODO: ブックマーク機能を実装
              logger.info('[Translate] Word bookmark toggled');
            }}
            onWordViewDetails={handleDictionaryLookup}
            onWordAskQuestion={handleWordAskQuestion}
            onSwitchToWordCard={handleSwitchToWordCard}
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

      {/* Subscription Bottom Sheet */}
      <SubscriptionBottomSheet
        visible={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
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
    marginBottom: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingBottom: 16, // コンテンツのパディングのみ（ChatSection分はtranslateCardContainerで確保）
  },
  translateCardContainer: {
    paddingTop: 0,
    paddingBottom: 220, // Pressableな領域を広げるためにここにパディングを追加
  },
  keyboardAvoidingView: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end', // コンテンツを下部に配置
  },
  chatContainerFixed: {
    paddingHorizontal: 8,
    paddingBottom: 0,
    marginBottom: 20,
    justifyContent: 'flex-end',
  },
});
