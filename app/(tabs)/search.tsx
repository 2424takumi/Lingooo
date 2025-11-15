import { useEffect, useMemo, useState, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Modal, TouchableOpacity, TextInput, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { ThemedView } from '@/components/themed-view';
import { UnifiedHeaderBar } from '@/components/ui/unified-header-bar';
import { WordCard } from '@/components/ui/word-card';
import { ChatSection } from '@/components/ui/chat-section';
import { ShimmerSuggestions } from '@/components/ui/shimmer';
import { BookmarkToast } from '@/components/ui/bookmark-toast';
import { loadFolders, updateBookmarkFolder, addFolder, type BookmarkFolder } from '@/services/storage/bookmark-storage';
import { useChatSession } from '@/hooks/use-chat-session';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { useAISettings } from '@/contexts/ai-settings-context';
import { getCachedSuggestions, subscribeSuggestions } from '@/services/cache/suggestion-cache';
import { prefetchWordDetail } from '@/services/cache/word-detail-cache';
import { getWordDetailStream, searchJaToEn } from '@/services/api/search';
import { addSearchHistory } from '@/services/storage/search-history-storage';
import { toQAPairs } from '@/utils/chat';
import { logger } from '@/utils/logger';
import { getNuanceType } from '@/utils/nuance';
import type { SuggestionItem } from '@/types/search';
import { generateId } from '@/utils/id';
import type { QAPair } from '@/types/chat';

export default function SearchScreen() {
  const pageBackground = useThemeColor({}, 'pageBackground');
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentLanguage, nativeLanguage } = useLearningLanguages();
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

  // ブックマークトースト & フォルダ選択
  const [toastVisible, setToastVisible] = useState(false);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null);
  const [isFolderSelectModalOpen, setIsFolderSelectModalOpen] = useState(false);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // queryまたは言語が変わったら再検索
  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    // initialResultsがある場合は先に設定（フォールバック用）
    if (initialResults.length > 0) {
      logger.debug('[Search] Using initialResults as fallback');
      setSuggestions(initialResults);
    } else {
      setSuggestions([]);
    }
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

  // QAPairsをstateとして管理（追加質問をサポートするため）
  const [qaPairs, setQAPairs] = useState<QAPair[]>([]);

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

  // フォルダを読み込む
  const fetchFolders = async () => {
    try {
      const data = await loadFolders();
      setFolders(data);
    } catch (error) {
      logger.error('[Search] Failed to load folders:', error);
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
      logger.debug('[Search] Bookmark added to folder:', folderId);
    } catch (error) {
      logger.error('[Search] Failed to add bookmark to folder:', error);
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
      logger.debug('[Search] Created new folder:', newFolder.id, newFolder.name);

      // 2. ブックマークを新しいフォルダに追加
      await updateBookmarkFolder(selectedBookmarkId, newFolder.id);
      logger.debug('[Search] Bookmark added to new folder:', selectedBookmarkId, newFolder.id);

      // 3. フォルダリストを再読み込み
      await fetchFolders();

      // 4. モーダルを閉じてステートをリセット
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
      setToastVisible(false);
      setSelectedBookmarkId(null);
    } catch (error) {
      logger.error('[Search] Failed to create folder:', error);
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

    try {
      const generator = sendFollowUpQuestionStream(
        {
          sessionId: generateId('session'),
          scope: 'search',
          identifier: query,
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
        },
        // onError: エラー時
        (error) => {
          logger.error('[Search] Follow-up question error:', error);
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
      logger.error('[Search] Failed to send follow-up question:', error);
    }
  };

  const handleWordCardPress = async (item: SuggestionItem) => {
    // 単語詳細画面でデータ取得後にトークン数と一緒に検索履歴に保存されるため、
    // ここでは保存しない

    prefetchWordDetail(item.lemma, (onProgress) => getWordDetailStream(item.lemma, currentLanguage.code, nativeLanguage.code, 'concise', onProgress));

    router.push({
      pathname: '/(tabs)/word-detail',
      params: {
        word: item.lemma,
        targetLanguage: currentLanguage.code, // 言語コードを渡す
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
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                        gender={item.gender}
                        definitions={[item.shortSenseJa]}
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
        </View>
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
            onBookmarkAdded={handleBookmarkAdded}
            onFollowUpQuestion={handleFollowUpQuestion}
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
    paddingTop: 61,
    paddingHorizontal: 16,
    paddingBottom: 220, // ChatSection分のスペースを確保（高さ116 + 余裕104）
  },
  headerContainer: {
    marginBottom: 16,
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
    paddingHorizontal: 8,
    paddingBottom: 22,
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
