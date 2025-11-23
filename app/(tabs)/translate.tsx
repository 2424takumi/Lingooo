import { StyleSheet, View, ScrollView, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { ChatSection } from '@/components/ui/chat-section';
import { BookmarkToast } from '@/components/ui/bookmark-toast';
import { TranslateCard } from '@/components/ui/translate-card';
import { FolderSelectModal } from '@/components/modals/FolderSelectModal';
import { CreateFolderModal } from '@/components/modals/CreateFolderModal';
import { SubscriptionBottomSheet } from '@/components/ui/subscription-bottom-sheet';
import { translateText } from '@/services/api/translate';
import { getWordDetailStream } from '@/services/api/search';
import { prefetchWordDetail } from '@/services/cache/word-detail-cache';
import { addSearchHistory } from '@/services/storage/search-history-storage';
import { detectLang, resolveLanguageCode } from '@/services/utils/language-detect';
import { detectWordLanguage } from '@/services/ai/dictionary-generator';
import { useChatSession } from '@/hooks/use-chat-session';
import { useBookmarkManagement } from '@/hooks/use-bookmark-management';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAISettings } from '@/contexts/ai-settings-context';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useSubscription } from '@/contexts/subscription-context';
import { useClipboardSearch } from '@/hooks/use-clipboard-search';
import { toQAPairs } from '@/utils/chat';
import { logger } from '@/utils/logger';
import { generateId } from '@/utils/id';
import type { QAPair } from '@/types/chat';

export default function TranslateScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const router = useRouter();
  const params = useLocalSearchParams();
  const safeAreaInsets = useSafeAreaInsets();
  const { aiDetailLevel, setAIDetailLevel } = useAISettings();
  const { currentLanguage, nativeLanguage, setCurrentLanguage } = useLearningLanguages();
  const { isPremium } = useSubscription();

  // パラメータから文章と言語を取得
  const text = (params.word as string) || '';
  const initialSourceLang = (params.sourceLang as string) || 'en';
  const initialTargetLang = (params.targetLang as string) || 'ja';
  const needsAiDetection = (params.needsAiDetection as string) === 'true';

  // AI検出によって言語が変わる可能性があるため、sourceLangをstateで管理
  const [sourceLang, setSourceLang] = useState(initialSourceLang);

  // AI言語検出中の状態（needsAiDetectionがtrueなら最初から検出中）
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(needsAiDetection);

  // デバッグログ
  useEffect(() => {
    logger.info('[Translate] isDetectingLanguage state changed:', isDetectingLanguage);
  }, [isDetectingLanguage]);

  // ヘッダーの高さを測定
  const [headerHeight, setHeaderHeight] = useState(52);

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

  // 選択テキスト管理
  const [selectedText, setSelectedText] = useState<{ text: string; isSingleWord: boolean } | null>(null);

  // クリップボードからの質問入力
  const [prefilledChatText, setPrefilledChatText] = useState<string | null>(null);
  useClipboardSearch({
    enabled: true,
    onPaste: (clipboardText) => {
      setPrefilledChatText(clipboardText);
      logger.info('[Translate] Clipboard text set to chat input');
    },
  });

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

  // チャット展開時の最大高さを計算
  const chatExpandedMaxHeight = useMemo(() => {
    const screenHeight = Dimensions.get('window').height;
    const containerPaddingTop = 8;
    const containerPaddingBottom = 10;
    const containerMarginBottom = 4;
    const chatMessagesMarginBottom = 8;
    const bottomSectionPaddingTop = 8;
    const questionScrollViewHeight = 0; // 翻訳モードでは質問タグなし
    const bottomSectionGap = 6;
    const whiteContainerHeight = 55;
    const topMargin = 10;

    const fixedSpaces = containerPaddingTop + containerPaddingBottom + containerMarginBottom +
      chatMessagesMarginBottom + bottomSectionPaddingTop +
      questionScrollViewHeight + bottomSectionGap + whiteContainerHeight + topMargin;

    return screenHeight - safeAreaInsets.top - headerHeight - fixedSpaces;
  }, [safeAreaInsets.top, headerHeight]);

  // QAPairsをstateとして管理
  const [qaPairs, setQAPairs] = useState<QAPair[]>([]);
  const [activeFollowUpPairId, setActiveFollowUpPairId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const newPairs = toQAPairs(chatMessages, { fallbackError: chatError });
    setQAPairs(prevPairs => {
      return newPairs.map(newPair => {
        const existingPair = prevPairs.find(p => p.id === newPair.id);
        if (existingPair?.followUpQAs) {
          return { ...newPair, followUpQAs: existingPair.followUpQAs };
        }
        return newPair;
      });
    });
  }, [chatMessages, chatError]);

  // 翻訳先言語を決定
  const determineTranslateTargetLang = (srcLang: string): string => {
    if (srcLang !== nativeLanguage.code) {
      return nativeLanguage.code;
    }
    return currentLanguage.code;
  };

  // AI言語検出（バックグラウンド）
  useEffect(() => {
    if (needsAiDetection && text) {
      logger.info('[Translate] Starting AI language detection for:', text.substring(0, 50));
      setIsDetectingLanguage(true);

      detectWordLanguage(text.trim(), [
        'en', 'pt', 'es', 'fr', 'de', 'it', 'zh', 'ko', 'vi', 'id'
      ]).then(async (aiDetectedLang) => {
        logger.info('[Translate] AI detection completed:', aiDetectedLang, 'initial sourceLang:', sourceLang, 'current tab:', currentLanguage.code);

        if (aiDetectedLang) {
          // 言語を更新（検出された言語がsourceLangと違う場合）
          if (aiDetectedLang !== sourceLang) {
            logger.info('[Translate] Updating source language from', sourceLang, 'to', aiDetectedLang);
            setSourceLang(aiDetectedLang);

            // 翻訳先言語を再計算
            const newTargetLang = determineTranslateTargetLang(aiDetectedLang);
            setSelectedTranslateTargetLang(newTargetLang);
            logger.info('[Translate] Updated target lang to:', newTargetLang);
          }

          // ヘッダーの言語タブを自動切り替え（検出された言語が現在のタブと違い、かつ母語でない場合）
          if (aiDetectedLang !== nativeLanguage.code && aiDetectedLang !== currentLanguage.code) {
            logger.info('[Translate] Auto-switching language tab from', currentLanguage.code, 'to', aiDetectedLang);
            await setCurrentLanguage(aiDetectedLang);
          } else {
            logger.info('[Translate] Language tab unchanged:', currentLanguage.code);
          }
        } else {
          logger.info('[Translate] AI detection returned no result');
        }

        // 検出完了（言語が変わっても変わらなくても）
        setIsDetectingLanguage(false);
        logger.info('[Translate] Detection shimmer stopped');
      }).catch((error) => {
        logger.error('[Translate] AI language detection failed:', error);
        setIsDetectingLanguage(false);
      });
    }
  }, [needsAiDetection, text]); // 初回のみ実行

  // 言語切り替えを監視して再翻訳
  useEffect(() => {
    if (currentLanguage) {
      const newTargetLang = determineTranslateTargetLang(sourceLang);
      if (newTargetLang !== selectedTranslateTargetLang) {
        setSelectedTranslateTargetLang(newTargetLang);
      }
    }
  }, [currentLanguage, sourceLang, nativeLanguage.code]);

  // 翻訳実行
  useEffect(() => {
    const performTranslation = async () => {
      // AI検出中は翻訳を開始しない（トークン節約）
      if (isDetectingLanguage) {
        logger.info('[Translate] Waiting for AI detection before translating');
        setIsTranslating(true);
        // 原文だけ先に表示
        setTranslationData({
          originalText: text,
          translatedText: '',
          sourceLang: sourceLang,
          targetLang: selectedTranslateTargetLang,
        });
        return;
      }

      setIsTranslating(true);
      setError(null);

      // 原文だけ先に表示
      setTranslationData({
        originalText: text,
        translatedText: '',
        sourceLang: sourceLang,
        targetLang: selectedTranslateTargetLang,
      });

      logger.info('[Translate] Translating text:', {
        sourceLang,
        targetLang: selectedTranslateTargetLang,
        textLength: text.length
      });

      try {
        const result = await translateText(text, sourceLang, selectedTranslateTargetLang);
        setTranslationData(result);

        // 翻訳履歴を保存
        try {
          // sourceLangとtargetLangのうち、母語でない方（学習言語）を履歴の言語として使用
          // これにより、英日・日英どちらの翻訳も学習中の言語タブに表示される
          const historyLanguage = sourceLang === nativeLanguage.code ? selectedTranslateTargetLang : sourceLang;

          logger.info('[Translate] Saving translation history:', {
            text: text.substring(0, 50),
            language: historyLanguage,
            sourceLang,
            targetLang: selectedTranslateTargetLang,
            textLength: text.length
          });
          await addSearchHistory(text, historyLanguage, result, undefined, 'translation');
          logger.info('[Translate] Translation history saved successfully');
        } catch (historyError) {
          logger.error('[Translate] Failed to save translation history:', historyError);
        }
      } catch (err) {
        logger.error('[Translate] Translation failed:', err);
        setError('翻訳に失敗しました');
      } finally {
        setIsTranslating(false);
      }
    };

    if (text) {
      performTranslation();
    }
  }, [text, sourceLang, selectedTranslateTargetLang, isDetectingLanguage]);

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
          detailLevel: aiDetailLevel,
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

    if (selectedText?.text) {
      // API用: 部分選択した箇所に焦点を当てた質問形式
      finalQuestion = `文章全体の文脈を理解した上で、選択された部分「${selectedText.text}」に焦点を当てて回答してください。\n\n質問：${question}`;
      // UI表示用: シンプルな形式
      displayQuestion = `「${selectedText.text}」について：${question}`;
      setSelectedText(null);
    }

    await sendChatMessage(finalQuestion, displayQuestion);
  };

  const handleQuickQuestion = async (question: string) => {
    let finalQuestion = question;
    let displayQuestion = question;

    if (selectedText?.text) {
      // API用: 部分選択した箇所に焦点を当てた質問形式
      finalQuestion = `文章全体の文脈を理解した上で、選択された部分「${selectedText.text}」に焦点を当てて回答してください。\n\n質問：${question}`;
      // UI表示用: シンプルな形式
      displayQuestion = `「${selectedText.text}」について：${question}`;
      setSelectedText(null);
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

  const handleTextSelected = (text: string, type: 'original' | 'translated') => {
    // Determine if it's a single word (simple heuristic: no spaces)
    const isSingleWord = !text.includes(' ') && text.split(/\s+/).length === 1;
    setSelectedText({ text, isSingleWord });

    // 単語の場合、プリフェッチを開始（辞書で調べるボタンを押す前に準備）
    if (isSingleWord && text.trim()) {
      // 選択されたテキストの言語を検出（翻訳用のロジック）
      const detectedLang = detectLang(text.trim());
      let targetLang: string;
      if (detectedLang === 'ja') {
        targetLang = 'ja';
      } else if (detectedLang === 'kanji-only') {
        targetLang = nativeLanguage.code; // 母語を優先
      } else {
        // alphabet or mixed の場合、英語をデフォルトとする
        targetLang = 'en';
      }
      logger.info('[Translate] Pre-fetching word detail for selected text:', text, 'detected:', detectedLang, 'resolved:', targetLang);

      prefetchWordDetail(text.trim(), (onProgress) => {
        return getWordDetailStream(text.trim(), targetLang, nativeLanguage.code, 'concise', onProgress);
      });
    }
  };

  const handleDictionaryLookup = () => {
    if (!selectedText) return;

    // 選択されたテキストの言語を検出（翻訳用のロジック）
    const detectedLang = detectLang(selectedText.text);
    let targetLang: string;
    if (detectedLang === 'ja') {
      targetLang = 'ja';
    } else if (detectedLang === 'kanji-only') {
      targetLang = nativeLanguage.code; // 母語を優先
    } else {
      // alphabet or mixed の場合、英語をデフォルトとする
      targetLang = 'en';
    }
    logger.info('[Translate] Dictionary lookup for:', selectedText.text, 'detected:', detectedLang, 'resolved:', targetLang);

    router.push({
      pathname: '/(tabs)/word-detail',
      params: {
        word: selectedText.text,
        targetLanguage: targetLang,
      },
    });

    // 検索実行後に選択を解除
    setSelectedText(null);
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
          {translationData && (
            <View style={styles.translateCardContainer}>
              <TranslateCard
                originalText={translationData.originalText}
                translatedText={translationData.translatedText}
                sourceLang={translationData.sourceLang}
                targetLang={translationData.targetLang}
                isTranslating={isTranslating}
                onTextSelected={handleTextSelected}
              />
            </View>
          )}
        </ScrollView>
      </View>

      {/* Chat Section - Fixed at bottom */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={0}
      >
        <View pointerEvents="box-none" style={styles.chatContainerFixed}>
          <ChatSection
            key={translationData?.originalText}
            placeholder="この文章について質問をする..."
            qaPairs={qaPairs}
            followUps={followUps}
            isStreaming={isChatStreaming}
            error={chatError}
            detailLevel={aiDetailLevel}
            onSend={handleChatSubmit}
            onQuickQuestion={handleQuickQuestion}
            onRetryQuestion={handleQACardRetry}
            onDetailLevelChange={setAIDetailLevel}
            scope="translate"
            identifier={translationData?.originalText || text}
            onBookmarkAdded={handleBookmarkAdded}
            expandedMaxHeight={chatExpandedMaxHeight}
            onFollowUpQuestion={handleFollowUpQuestion}
            onEnterFollowUpMode={handleEnterFollowUpMode}
            activeFollowUpPairId={activeFollowUpPairId}
            prefilledInputText={prefilledChatText}
            onPrefillConsumed={() => setPrefilledChatText(null)}
            selectedText={selectedText}
            onDictionaryLookup={handleDictionaryLookup}
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
    paddingBottom: 220, // ChatSection分のスペースを確保
  },
  translateCardContainer: {
    paddingTop: 0,
    paddingBottom: 8,
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
    marginBottom: 16,
    justifyContent: 'flex-end',
  },
});
