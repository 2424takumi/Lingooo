import { StyleSheet, View, ScrollView, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Modal, Dimensions, Alert, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import Svg, { Path } from 'react-native-svg';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { DefinitionList } from '@/components/ui/definition-list';
import { WordHint } from '@/components/ui/word-hint';
import { ExampleCard } from '@/components/ui/example-card';
import { ChatSection } from '@/components/ui/chat-section';
import { ShimmerHeader, ShimmerDefinitions, ShimmerMetrics, ShimmerExamples, ShimmerHint } from '@/components/ui/shimmer';
import { BookmarkToast } from '@/components/ui/bookmark-toast';
import { TranslateCard } from '@/components/ui/translate-card';
import { loadFolders, updateBookmarkFolder, addFolder, type BookmarkFolder } from '@/services/storage/bookmark-storage';
import { translateText } from '@/services/api/translate';
import { useChatSession } from '@/hooks/use-chat-session';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAISettings } from '@/contexts/ai-settings-context';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useClipboardSearch } from '@/hooks/use-clipboard-search';
import { getWordDetailStream } from '@/services/api/search';
import type { WordDetailResponse } from '@/types/search';
import { getCachedWordDetail, getPendingPromise } from '@/services/cache/word-detail-cache';
import { toQAPairs } from '@/utils/chat';
import { logger } from '@/utils/logger';
import { addSearchHistory, removeSearchHistoryItem, getSearchHistory } from '@/services/storage/search-history-storage';
import { generateId } from '@/utils/id';
import type { QAPair } from '@/types/chat';
import { AVAILABLE_LANGUAGES } from '@/types/language';

export default function WordDetailScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const router = useRouter();
  const params = useLocalSearchParams();
  const { aiDetailLevel, setAIDetailLevel } = useAISettings();
  const { currentLanguage, nativeLanguage, learningLanguages } = useLearningLanguages();
  const safeAreaInsets = useSafeAreaInsets();

  const [wordData, setWordData] = useState<Partial<WordDetailResponse> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null); // 実際に見つかった言語
  const [showLanguageNotification, setShowLanguageNotification] = useState(false); // 通知表示フラグ

  // ヘッダーの高さを測定
  const [headerHeight, setHeaderHeight] = useState(88); // デフォルト値(wordDetailの最低高さ)

  // ブックマークトースト & フォルダ選択
  const [toastVisible, setToastVisible] = useState(false);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null);
  const [isFolderSelectModalOpen, setIsFolderSelectModalOpen] = useState(false);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // パラメータから単語を取得
  const word = params.word as string || '';
  const targetLanguage = (params.targetLanguage as string) || 'en'; // 学習言語コード
  const dataParam = params.data as string;
  const fromPage = params.fromPage as string;
  const searchQuery = params.searchQuery as string;
  const searchResults = params.searchResults as string;

  // 翻訳モード用のパラメータ
  const mode = (params.mode as string) || 'word';
  const initialSourceLang = (params.sourceLang as string) || 'en';
  const initialTargetLang = (params.targetLang as string) || 'ja';

  // 翻訳データと選択された翻訳先言語
  const [translationData, setTranslationData] = useState<{ originalText: string; translatedText: string; sourceLang: string; targetLang: string } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedTranslateTargetLang, setSelectedTranslateTargetLang] = useState(initialTargetLang);

  const chatContext = useMemo(() => {
    // 翻訳モードの場合
    if (mode === 'translate') {
      if (!translationData) {
        return undefined;
      }

      return {
        originalText: translationData.originalText,
        translatedText: translationData.translatedText,
        sourceLang: translationData.sourceLang,
        targetLang: translationData.targetLang,
        selectedText: selectedText?.text, // 選択されたテキストを追加
      };
    }

    // 単語モードの場合
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
  }, [mode, translationData, wordData, selectedText]);

  // チャット識別子：翻訳モードの場合は原文を使用、単語モードの場合は正しい単語（headword.lemma）を使用
  const chatIdentifier = mode === 'translate'
    ? translationData?.originalText || word
    : wordData?.headword?.lemma || word;

  // チャットスコープ：翻訳モードか単語モードか
  const chatScope = mode === 'translate' ? 'translate' : 'word';

  const {
    messages: chatMessages,
    followUps,
    isStreaming: isChatStreaming,
    error: chatError,
    sendMessage: sendChatMessage,
    sendQuickQuestion,
  } = useChatSession({
    scope: chatScope,
    identifier: chatIdentifier,
    context: chatContext,
    targetLanguage,
  });

  // QAPairsをstateとして管理（追加質問をサポートするため）
  const [qaPairs, setQAPairs] = useState<QAPair[]>([]);

  // 選択テキスト管理（翻訳モード用）
  const [selectedText, setSelectedText] = useState<{ text: string; isSingleWord: boolean } | null>(null);

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

  // クリップボード監視 - word-detailではチャット入力に貼り付け
  const [prefilledChatText, setPrefilledChatText] = useState<string | null>(null);
  const { isChecking } = useClipboardSearch({
    enabled: true,
    onPaste: (text) => {
      setPrefilledChatText(text);
      logger.info('[WordDetail] Clipboard text set to chat input');
    },
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

  // 検出された言語の情報を取得（選択中の言語と異なる場合のみ）
  const detectedLanguageInfo = useMemo(() => {
    if (!detectedLanguage || detectedLanguage === targetLanguage || mode === 'translate') {
      return null;
    }

    const language = AVAILABLE_LANGUAGES.find(lang => lang.code === detectedLanguage);
    return language;
  }, [detectedLanguage, targetLanguage, mode]);

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

  // 翻訳先言語を決定するロジック
  const determineTranslateTargetLang = (sourceLang: string): string => {
    // 母国語以外の文章 → 母国語に翻訳
    if (sourceLang !== nativeLanguage.code) {
      return nativeLanguage.code;
    }
    // 母国語の文章 → 選択された学習言語に翻訳
    return currentLanguage.code;
  };

  // 言語切り替えを監視して再翻訳
  useEffect(() => {
    if (mode === 'translate' && currentLanguage) {
      const newTargetLang = determineTranslateTargetLang(initialSourceLang);
      if (newTargetLang !== selectedTranslateTargetLang) {
        setSelectedTranslateTargetLang(newTargetLang);
      }
    }
  }, [currentLanguage, mode, initialSourceLang, nativeLanguage.code]);

  useEffect(() => {
    const loadWordData = async () => {
      try {
        // 翻訳モードの場合は翻訳APIを呼び出す
        if (mode === 'translate') {
          // 状態をリセット
          setWordData(null);
          setIsLoading(true);
          setLoadingProgress(0);
          setError(null);
          setDetectedLanguage(null);
          setShowLanguageNotification(false);

          setIsTranslating(true);

          // 原文だけ先に表示するため、空の翻訳文でカードを表示
          setTranslationData({
            originalText: word,
            translatedText: '',
            sourceLang: initialSourceLang,
            targetLang: selectedTranslateTargetLang,
          });
          setIsLoading(false);

          try {
            const result = await translateText(word, initialSourceLang, selectedTranslateTargetLang);
            setTranslationData(result);
            setLoadingProgress(100);
          } catch (error) {
            logger.error('[WordDetail] Translation failed:', error);
            setError('翻訳に失敗しました');
          } finally {
            setIsTranslating(false);
          }
          return;
        }

        // パラメータでデータが渡されている場合はそれを使用
        if (dataParam) {
          const data = JSON.parse(dataParam);
          setWordData(data);
          setLoadingProgress(100);
          setIsLoading(false);
          setError(null);
          setDetectedLanguage(null);
          setShowLanguageNotification(false);
        } else if (word) {
          // キャッシュをチェック（状態リセット前に）
          const cachedData = getCachedWordDetail(word);
          if (cachedData) {
            // キャッシュヒット：即座に表示（状態をリセットせずに）
            logger.debug('[WordDetail] USING CACHED DATA');
            setWordData(cachedData);
            setLoadingProgress(100);
            setIsLoading(false);
            setError(null);
            setDetectedLanguage(null);
            setShowLanguageNotification(false);
            return;
          }

          // キャッシュなし：状態をリセット
          setWordData(null);
          setIsLoading(true);
          setLoadingProgress(0);
          setError(null);
          setDetectedLanguage(null);
          setShowLanguageNotification(false);

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

          // まず言語を検出（Gemini APIが設定されている場合のみ）
          let detectedLang: string | null = null;
          try {
            const { isGeminiConfigured } = await import('@/services/ai/gemini-client');
            const isConfigured = await isGeminiConfigured();

            if (isConfigured) {
              const { detectWordLanguage } = await import('@/services/ai/dictionary-generator');
              logger.info('[WordDetail] Detecting language for word:', word);
              detectedLang = await detectWordLanguage(word, languagesToTry);
              logger.info('[WordDetail] Language detection result:', detectedLang);
            } else {
              logger.info('[WordDetail] Skipping language detection (Gemini not configured)');
            }
          } catch (detectionError) {
            logger.warn('[WordDetail] Language detection failed:', detectionError);
            // 検出失敗時は元の順番で試す
          }

          // 検出された言語があれば、それを最優先にする
          const orderedLanguages = detectedLang
            ? [detectedLang, ...languagesToTry.filter(lang => lang !== detectedLang)]
            : languagesToTry;

          logger.info('[WordDetail] Ordered languages:', orderedLanguages);

          // 各言語を順番に試す
          for (const langCode of orderedLanguages) {
            try {
              logger.info(`[WordDetail] Trying language: ${langCode}`);

              result = await getWordDetailStream(
                word,
                langCode,
                nativeLanguage.code,
                aiDetailLevel,
                (progress, partialData) => {
                  logger.debug(`[WordDetail] Progress: ${progress}% (${langCode})`, {
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
                }
              );

              // 成功した場合
              successLanguage = langCode;
              setDetectedLanguage(langCode);
              logger.info(`[WordDetail] Successfully found word in language: ${langCode}`);
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
            throw lastError;
          }

          // 最終データをセット（念のため）
          logger.debug('[WordDetail] Final data received');
          setWordData(result.data);
          setLoadingProgress(100);
          setIsLoading(false);

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
          setError('単語の読み込みに失敗しました');
        }
        setIsLoading(false);
      }
    };

    loadWordData();
  }, [word, dataParam, targetLanguage, mode, initialSourceLang, selectedTranslateTargetLang]);

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

  // フォルダを読み込む
  const fetchFolders = async () => {
    try {
      const data = await loadFolders();
      setFolders(data);
    } catch (error) {
      logger.error('[WordDetail] Failed to load folders:', error);
    }
  };

  useEffect(() => {
    void fetchFolders();
  }, []);

  // ブックマーク追加時のハンドラー
  const handleBookmarkAdded = (bookmarkId: string) => {
    setSelectedBookmarkId(bookmarkId);
    setToastVisible(true);
  };

  // トースト終了時（selectedBookmarkIdはモーダルキャンセル時またはフォルダ追加完了時にクリア）
  const handleToastDismiss = () => {
    setToastVisible(false);
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
      setToastVisible(false);
      setSelectedBookmarkId(null);
      logger.debug('[WordDetail] Bookmark added to folder:', folderId);
    } catch (error) {
      logger.error('[WordDetail] Failed to add bookmark to folder:', error);
    }
  };

  // 新規フォルダ作成モーダルを開く
  const handleOpenCreateFolderModal = () => {
    setIsFolderSelectModalOpen(false);
    setIsCreateFolderModalOpen(true);
  };

  // 新規フォルダを作成してブックマークを追加
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('エラー', 'フォルダ名を入力してください');
      return;
    }

    if (!selectedBookmarkId) {
      Alert.alert('エラー', 'ブックマークが選択されていません');
      return;
    }

    try {
      // 1. 新しいフォルダを作成
      const newFolder = await addFolder(newFolderName.trim());
      logger.debug('[WordDetail] Created new folder:', newFolder.id, newFolder.name);

      // 2. ブックマークを新しいフォルダに追加
      await updateBookmarkFolder(selectedBookmarkId, newFolder.id);
      logger.debug('[WordDetail] Bookmark added to new folder:', selectedBookmarkId, newFolder.id);

      // 3. フォルダリストを再読み込み
      await fetchFolders();

      // 4. モーダルを閉じてステートをリセット
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
      setToastVisible(false);
      setSelectedBookmarkId(null);
    } catch (error) {
      logger.error('[WordDetail] Failed to create folder:', error);
      Alert.alert('エラー', 'フォルダの作成に失敗しました');
    }
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
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
    // 翻訳モードで選択テキストがある場合は、質問文に選択テキストを含める
    let finalQuestion = question;
    if (mode === 'translate' && selectedText?.text) {
      finalQuestion = `「${selectedText.text}」について：${question}`;
      // 質問送信後、選択を解除
      setSelectedText(null);
    }
    void sendQuickQuestion(finalQuestion);
  };

  const handleChatSubmit = async (text: string) => {
    // 翻訳モードで選択テキストがある場合は、質問文に選択テキストを含める
    let finalQuestion = text;
    if (mode === 'translate' && selectedText?.text) {
      finalQuestion = `「${selectedText.text}」について：${text}`;
      // 質問送信後、選択を解除
      setSelectedText(null);
    }
    await sendChatMessage(finalQuestion);
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
          detailLevel: aiDetailLevel,
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
          setQAPairs(prev => prev.map(pair => {
            if (pair.id === pairId) {
              return {
                ...pair,
                followUpQAs: pair.followUpQAs?.map(fu =>
                  fu.id === followUpId
                    ? { ...fu, status: 'error' as const, errorMessage: error.message }
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
    }
  };

  // テキスト選択ハンドラ
  const handleTextSelected = (text: string, type: 'original' | 'translated') => {
    logger.debug('[WordDetail] Text selected:', { text, type });

    // 単語かどうかを判定（スペースや句読点が含まれていない場合は単語とみなす）
    const isSingleWord = /^[^\s.,!?;:。、！？；：]+$/.test(text.trim());

    setSelectedText({ text: text.trim(), isSingleWord });
  };

  // 選択解除ハンドラ
  const handleSelectionCleared = () => {
    logger.debug('[WordDetail] Selection cleared');
    setSelectedText(null);
  };

  // 辞書検索ハンドラ
  const handleDictionaryLookup = () => {
    if (!selectedText) return;

    logger.info('[WordDetail] Dictionary lookup:', selectedText.text);

    // 選択された単語で新しい単語検索を実行
    router.push({
      pathname: '/(tabs)/word-detail',
      params: {
        word: selectedText.text,
        targetLanguage: mode === 'translate'
          ? (translationData?.sourceLang || currentLanguage.code)
          : targetLanguage,
        mode: 'word',
      },
    });

    // 選択状態をクリア
    setSelectedText(null);
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
          {/* 翻訳モードの場合 */}
          {mode === 'translate' ? (
            <>
              {/* Header - シンプルなバックボタンのみ */}
              <View
                style={styles.headerContainer}
                onLayout={(event) => {
                  const { height } = event.nativeEvent.layout;
                  setHeaderHeight(height);
                }}
              >
                <UnifiedHeaderBar
                  pageType="translate"
                  title="翻訳"
                  onBackPress={handleBackPress}
                />
              </View>

              {/* Translation Card */}
              {translationData ? (
                <View style={styles.translateCardContainer}>
                  <TranslateCard
                    originalText={translationData.originalText}
                    translatedText={translationData.translatedText}
                    sourceLang={translationData.sourceLang}
                    targetLang={translationData.targetLang}
                    isTranslating={isTranslating}
                    onTextSelected={handleTextSelected}
                    onSelectionCleared={handleSelectionCleared}
                  />
                </View>
              ) : isTranslating ? (
                <View style={styles.translateCardContainer}>
                  <Text style={styles.loadingText}>翻訳中...</Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              {/* Header - 最初に表示 */}
              {wordData?.headword ? (
                <View
                  style={styles.headerContainer}
                  onLayout={(event) => {
                    const { height } = event.nativeEvent.layout;
                    setHeaderHeight(height);
                  }}
                >
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

              {/* 言語検出通知 */}
              {detectedLanguageInfo && showLanguageNotification && (
                <View style={styles.languageNotificationContainer}>
                  <View style={styles.languageNotificationContent}>
                    <Text style={styles.languageNotificationText}>
                      {detectedLanguageInfo.name}で見つかりました
                    </Text>
                  </View>
                </View>
              )}

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

          {/* Word Hint - 3番目に表示 */}
          {wordData?.hint?.text ? (
            <View style={styles.hintContainer}>
              <WordHint hint={wordData.hint.text} />
            </View>
          ) : isLoading ? (
            <View style={styles.hintContainer}>
              <ShimmerHint />
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
            </>
          )}

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
            key={chatIdentifier} // Reset chat state when navigating to a different word
            placeholder={mode === 'translate' ? 'この文章について質問をする...' : 'この単語について質問をする...'}
            qaPairs={qaPairs}
            followUps={followUps}
            isStreaming={isChatStreaming}
            error={qaPairs.length === 0 ? chatError : null}
            detailLevel={aiDetailLevel}
            onSend={handleChatSubmit}
            onQuickQuestion={handleQuestionPress}
            onRetryQuestion={handleQACardRetry}
            onDetailLevelChange={setAIDetailLevel}
            scope={mode === 'translate' ? 'translate' : 'word'}
            identifier={chatIdentifier}
            onBookmarkAdded={handleBookmarkAdded}
            expandedMaxHeight={chatExpandedMaxHeight}
            onFollowUpQuestion={handleFollowUpQuestion}
            prefilledInputText={prefilledChatText}
            onPrefillConsumed={() => setPrefilledChatText(null)}
            selectedText={mode === 'translate' ? selectedText : null}
            onDictionaryLookup={mode === 'translate' ? handleDictionaryLookup : undefined}
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
          setSelectedBookmarkId(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setIsFolderSelectModalOpen(false);
            setSelectedBookmarkId(null);
          }}
        >
          <View style={styles.folderSelectModalContainer} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>フォルダに追加</Text>

            <ScrollView style={styles.folderSelectList} showsVerticalScrollIndicator={false}>
              {/* No folder option - only show if folders exist */}
              {folders.length > 0 && (
                <TouchableOpacity
                  style={styles.folderSelectItem}
                  onPress={() => handleAddToFolder(undefined)}
                >
                  <Text style={styles.folderSelectItemText}>フォルダなし</Text>
                </TouchableOpacity>
              )}

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
                      stroke="#111111"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={styles.folderSelectItemText}>{folder.name}</Text>
                </TouchableOpacity>
              ))}

              {/* Create new folder button */}
              <TouchableOpacity
                style={styles.createFolderButton}
                onPress={handleOpenCreateFolderModal}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 5v14M5 12h14"
                    stroke="#111111"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={styles.createFolderButtonText}>新しくフォルダを作る</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setIsFolderSelectModalOpen(false);
                setSelectedBookmarkId(null);
              }}
            >
              <Text style={styles.modalCancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Folder Modal */}
      <Modal
        visible={isCreateFolderModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsCreateFolderModalOpen(false);
          setNewFolderName('');
          setSelectedBookmarkId(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setIsCreateFolderModalOpen(false);
            setNewFolderName('');
            setSelectedBookmarkId(null);
          }}
        >
          <View style={styles.createFolderModalContainer} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>新しいフォルダを作成</Text>

            <TextInput
              style={styles.folderNameInput}
              placeholder="フォルダ名"
              placeholderTextColor="#999999"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              maxLength={50}
            />

            <View style={styles.createFolderButtonContainer}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setIsCreateFolderModalOpen(false);
                  setNewFolderName('');
                  setSelectedBookmarkId(null);
                }}
              >
                <Text style={styles.modalSecondaryButtonText}>キャンセル</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={handleCreateFolder}
              >
                <Text style={styles.modalPrimaryButtonText}>作成</Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: 12,
  },
  languageNotificationContainer: {
    marginBottom: 12,
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
    marginBottom: 12,
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
