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
import { translateText } from '@/services/api/translate';
import { useChatSession } from '@/hooks/use-chat-session';
import { useBookmarkManagement } from '@/hooks/use-bookmark-management';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAISettings } from '@/contexts/ai-settings-context';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
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
  const { currentLanguage, nativeLanguage } = useLearningLanguages();

  // パラメータから文章と言語を取得
  const text = (params.word as string) || '';
  const sourceLang = (params.sourceLang as string) || 'en';
  const initialTargetLang = (params.targetLang as string) || 'ja';

  // ヘッダーの高さを測定
  const [headerHeight, setHeaderHeight] = useState(52);

  // ブックマーク管理
  const {
    toastVisible,
    isFolderSelectModalOpen,
    folders,
    isCreateFolderModalOpen,
    newFolderName,
    setNewFolderName,
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
      setIsTranslating(true);
      setError(null);

      // 原文だけ先に表示
      setTranslationData({
        originalText: text,
        translatedText: '',
        sourceLang: sourceLang,
        targetLang: selectedTranslateTargetLang,
      });

      try {
        const result = await translateText(text, sourceLang, selectedTranslateTargetLang);
        setTranslationData(result);
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
  }, [text, sourceLang, selectedTranslateTargetLang]);

  // 追加質問のハンドラー
  const handleFollowUpQuestion = async (pairId: string, question: string) => {
    const pair = qaPairs.find(p => p.id === pairId);
    if (!pair || pair.status !== 'completed') return;

    const newFollowUpId = generateId();
    const newFollowUp = {
      id: newFollowUpId,
      q: question,
      a: '',
      status: 'pending' as const,
    };

    setQAPairs(prevPairs => {
      return prevPairs.map(p => {
        if (p.id === pairId) {
          const updatedFollowUps = [...(p.followUpQAs || []), newFollowUp];
          return { ...p, followUpQAs: updatedFollowUps };
        }
        return p;
      });
    });

    await sendChatMessage(question);
  };

  const handleChatSubmit = async (question: string) => {
    let finalQuestion = question;
    if (selectedText?.text) {
      finalQuestion = `「${selectedText.text}」について：${question}`;
      setSelectedText(null);
    }
    await sendChatMessage(finalQuestion);
  };

  const handleQuickQuestion = async (question: string) => {
    let finalQuestion = question;
    if (selectedText?.text) {
      finalQuestion = `「${selectedText.text}」について：${question}`;
      setSelectedText(null);
    }
    await sendQuickQuestion(finalQuestion);
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
  };

  const handleDictionaryLookup = () => {
    if (!selectedText) return;

    router.push({
      pathname: '/(tabs)/word-detail',
      params: {
        word: selectedText.text,
        targetLanguage: translationData?.sourceLang || currentLanguage.code,
      },
    });
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
          <UnifiedHeaderBar pageType="translate" onBackPress={handleBackPress} />
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
