import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { QAPair } from '@/types/chat';
import { QuestionTag } from './question-tag';
import { QACardList } from './qa-card-list';
import { useAISettings } from '@/contexts/ai-settings-context';
import { logger } from '@/utils/logger';

interface ChatSectionProps {
  placeholder?: string;
  qaPairs?: QAPair[];
  followUps?: string[];
  isStreaming?: boolean;
  error?: string | null;
  detailLevel?: 'concise' | 'detailed';
  onSend?: (text: string) => Promise<void> | void;
  onQuickQuestion?: (question: string) => Promise<void> | void;
  onRetry?: () => void;
  onRetryQuestion?: (question: string) => void;
  onDetailLevelChange?: (level: 'concise' | 'detailed') => void;
  questionPresets?: string[];
  scope?: string;
  identifier?: string;
  onBookmarkAdded?: (bookmarkId: string) => void;
  expandedMaxHeight?: number; // 展開時のchatMessagesの最大高さ（デフォルト: 512）
  onFollowUpQuestion?: (pairId: string, question: string) => Promise<void>;
}

function ExpandIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M7.5 14.25H3.75V10.5M10.5 3.75H14.25V7.5"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShrinkIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M4.58333 12.8334H9.16666V17.4167M17.4167 9.16671H12.8333V4.58337"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SendIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SliderIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 18H21M3 18H6M6 18V20M6 18V16M20 12H21M3 12H16M16 12V14M16 12V10M14 6H21M3 6H10M10 6V8M10 6V4"
        stroke="#686868"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke="#00AA69"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const DEFAULT_QUESTIONS = ['語源', '類義語', '対義語', '使用例'];

export function ChatSection({
  placeholder = 'この単語について質問をする...',
  qaPairs = [],
  followUps = [],
  isStreaming = false,
  error = null,
  detailLevel = 'concise',
  onSend,
  onQuickQuestion,
  onRetry,
  onRetryQuestion,
  onDetailLevelChange,
  questionPresets = DEFAULT_QUESTIONS,
  scope,
  identifier,
  onBookmarkAdded,
  expandedMaxHeight = 512,
  onFollowUpQuestion,
}: ChatSectionProps) {
  const { customQuestions, addCustomQuestion } = useAISettings();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasManuallyClosedWithContent, setHasManuallyClosedWithContent] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isCustomQuestionModalOpen, setIsCustomQuestionModalOpen] = useState(false);
  const [customQuestionTitle, setCustomQuestionTitle] = useState('');
  const [customQuestionText, setCustomQuestionText] = useState('');
  const [inputContentHeight, setInputContentHeight] = useState(0);
  const [isInputScrollEnabled, setIsInputScrollEnabled] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const prevQAPairsLengthRef = useRef(qaPairs.length);
  const lastCardYRef = useRef<number>(0);
  const prevIdentifierRef = useRef(identifier);

  const MAX_INPUT_HEIGHT = 110; // 約5行分

  // 単語（identifier）が変わったときにチャットを閉じる
  useEffect(() => {
    if (identifier !== prevIdentifierRef.current) {
      setIsOpen(false);
      setHasManuallyClosedWithContent(false);
      setInputText('');
      prevIdentifierRef.current = identifier;
    }
  }, [identifier]);

  useEffect(() => {
    // 新しいQAペアが追加された場合のみ自動的に開く
    if (!isOpen && qaPairs.length > prevQAPairsLengthRef.current && qaPairs.length > 0) {
      setIsOpen(true);
      setHasManuallyClosedWithContent(false);
    }

    // 新しいQAペアが追加されたら即座にスクロール（生成中のカードを見せる）
    if (qaPairs.length > prevQAPairsLengthRef.current && isOpen) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }

    prevQAPairsLengthRef.current = qaPairs.length;
  }, [qaPairs.length, isOpen]);

  // 自動スクロール: 新しいメッセージやストリーミング中
  useEffect(() => {
    if (isOpen && qaPairs.length > 0 && lastCardYRef.current > 0) {
      // 少し遅延を入れてレンダリングを待つ
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: lastCardYRef.current, animated: false });
      }, 50);
    }
  }, [qaPairs, isStreaming, isOpen]);

  const handleSubmit = async (text: string) => {
    if (!text.trim() || !onSend) {
      return;
    }
    try {
      setIsSubmitting(true);
      setIsOpen(true); // 送信時に開く
      await onSend(text.trim());
      setInputText(''); // テキストをクリアすれば高さも自動的にリセットされる
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActionButtonPress = () => {
    if (isInputFocused && inputText.trim().length > 0) {
      void handleSubmit(inputText);
      return;
    }

    if (isStreaming) {
      return; // 応答中は閉じない
    }

    // 縮小ボタンを押した場合は必ず閉じる
    if (isOpen) {
      inputRef.current?.blur();
      setIsInputFocused(false);
      setHasManuallyClosedWithContent(qaPairs.length > 0);
      setIsOpen(false);
      setInputText('');
      return;
    }

    // 拡大ボタンを押した場合は開く
    setHasManuallyClosedWithContent(false);
    setIsOpen(true);
  };

  const combinedQuestions = useMemo(() => {
    // カスタム質問のタイトルを先頭に、次にデフォルト質問、最後にフォローアップ質問
    const tags = [...customQuestions.map(cq => cq.title), ...questionPresets];
    for (const item of followUps) {
      if (!tags.includes(item)) {
        tags.push(item);
      }
    }
    return tags;
  }, [customQuestions, questionPresets, followUps]);

  // タイトルと実際の質問文のマッピングを作成
  const questionMap = useMemo(() => {
    const map = new Map<string, string>();
    // カスタム質問のマッピング
    customQuestions.forEach(cq => {
      map.set(cq.title, cq.question);
    });
    // デフォルト質問とフォローアップ質問はタイトル=質問文
    questionPresets.forEach(q => map.set(q, q));
    followUps.forEach(q => map.set(q, q));
    return map;
  }, [customQuestions, questionPresets, followUps]);

  const handleAddCustomQuestion = async () => {
    const title = customQuestionTitle.trim();
    const question = customQuestionText.trim();
    if (!title || !question) {
      return;
    }
    try {
      await addCustomQuestion(title, question);
      setCustomQuestionTitle('');
      setCustomQuestionText('');
      setIsCustomQuestionModalOpen(false);
    } catch (error) {
      logger.error('Failed to add custom question:', error);
    }
  };

  return (
    <View style={[styles.container, isOpen ? styles.containerOpen : styles.containerClosed]}>
      {isOpen && (
        <ScrollView
          ref={scrollViewRef}
          style={[styles.chatMessages, { maxHeight: expandedMaxHeight }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            // コンテンツサイズが変更されたら最後のカードの位置にスクロール（ストリーミング中は即座に）
            if ((isStreaming || qaPairs.some(pair => pair.status === 'pending')) && lastCardYRef.current > 0) {
              scrollViewRef.current?.scrollTo({ y: lastCardYRef.current, animated: false });
            }
          }}
        >
          {qaPairs.length > 0 ? (
            <View style={styles.qaCardList}>
              <QACardList
                pairs={qaPairs}
                onRetry={onRetryQuestion}
                scope={scope}
                identifier={identifier}
                onLastCardLayout={(y) => {
                  lastCardYRef.current = y;
                }}
                onBookmarkAdded={onBookmarkAdded}
                onFollowUpQuestion={onFollowUpQuestion}
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>Lingoooチャットを試してみましょう</Text>
              <Text style={styles.emptyStateText}>
                上の質問タグをタップするか、気になることを入力してみてください。
              </Text>
            </View>
          )}
          {qaPairs.length === 0 && error && !isStreaming && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
              {onRetry && (
                <TouchableOpacity style={styles.retryInlineButton} onPress={onRetry}>
                  <Text style={styles.retryInlineButtonText}>再試行</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Spacer to push tags and input to bottom when open */}
      {isOpen && <View style={styles.spacer} />}

      {/* Bottom Section: Question Tags + Input */}
      <View style={styles.bottomSection}>
          {/* Question Tags */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.questionScrollView}
            contentContainerStyle={styles.questionList}
          >
            {/* Plus button for adding custom questions */}
            <TouchableOpacity
              style={styles.plusButton}
              onPress={() => setIsCustomQuestionModalOpen(true)}
            >
              <PlusIcon size={20} />
            </TouchableOpacity>

            {combinedQuestions.map((label, index) => (
              <QuestionTag
                key={`${label}-${index}`}
                label={label}
                onPress={() => {
                  setIsOpen(true);
                  // questionMapから実際の質問文を取得して送信
                  const actualQuestion = questionMap.get(label) || label;
                  onQuickQuestion?.(actualQuestion);
                }}
              />
            ))}
          </ScrollView>

          {/* White Container: Settings Icon + Input + Action Button (1 row) */}
          <View style={styles.whiteContainer}>
            <View style={styles.inputRow}>
              {/* Settings Icon Button */}
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => setIsSettingsMenuOpen(true)}
                disabled={isStreaming}
              >
                <SliderIcon size={24} />
              </TouchableOpacity>

              {/* Text Input */}
            <TextInput
              ref={inputRef}
              style={[styles.input, { maxHeight: MAX_INPUT_HEIGHT }]}
              placeholder={placeholder}
              placeholderTextColor="#ACACAC"
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => {
                setIsInputFocused(true);
              }}
              onBlur={() => {
                setIsInputFocused(false);
              }}
              editable={!isStreaming}
              multiline
              textAlignVertical="top"
              scrollEnabled={isInputScrollEnabled}
              onContentSizeChange={(event) => {
                const nextHeight = event.nativeEvent.contentSize.height;
                setInputContentHeight(nextHeight);
                setIsInputScrollEnabled(nextHeight > MAX_INPUT_HEIGHT);
              }}
              selectionColor="#00AA69"
              selectTextOnFocus={false}
              contextMenuHidden={false}
            />

              {/* Action Button */}
              <TouchableOpacity
                style={[
                  styles.button,
                  (isStreaming || isSubmitting) && styles.buttonDisabled,
                ]}
                onPress={handleActionButtonPress}
                disabled={isStreaming || isSubmitting}
              >
                {isInputFocused && inputText.trim().length > 0 ? (
                  <SendIcon size={20} />
                ) : isOpen ? (
                  <ShrinkIcon size={22} />
                ) : (
                  <ExpandIcon size={18} />
                )}
              </TouchableOpacity>
            </View>
          </View>
      </View>

        {/* Settings Menu Modal */}
        <Modal
          visible={isSettingsMenuOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsSettingsMenuOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsSettingsMenuOpen(false)}
          >
            <View style={styles.menuContainer} onStartShouldSetResponder={() => true}>
              <Text style={styles.menuItemLabel}>詳細レベル</Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleOption,
                    detailLevel === 'concise' && styles.toggleOptionActive,
                  ]}
                  onPress={() => {
                    onDetailLevelChange?.('concise');
                  }}
                >
                  <Text
                    style={[
                      styles.toggleOptionText,
                      detailLevel === 'concise' && styles.toggleOptionTextActive,
                    ]}
                  >
                    簡潔
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleOption,
                    detailLevel === 'detailed' && styles.toggleOptionActive,
                  ]}
                  onPress={() => {
                    onDetailLevelChange?.('detailed');
                  }}
                >
                  <Text
                    style={[
                      styles.toggleOptionText,
                      detailLevel === 'detailed' && styles.toggleOptionTextActive,
                    ]}
                  >
                    詳細
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Custom Question Modal */}
        <Modal
          visible={isCustomQuestionModalOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsCustomQuestionModalOpen(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => {
                setIsCustomQuestionModalOpen(false);
                setCustomQuestionTitle('');
                setCustomQuestionText('');
              }}
            >
              <ScrollView
                contentContainerStyle={styles.scrollViewContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.customQuestionModalContainer} onStartShouldSetResponder={() => true}>
                  <Text style={styles.modalTitle}>カスタム質問を追加</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>タイトル（タグに表示）</Text>
                    <TextInput
                      style={styles.customQuestionTitleInput}
                      placeholder="例: 例文"
                      placeholderTextColor="#ACACAC"
                      value={customQuestionTitle}
                      onChangeText={setCustomQuestionTitle}
                      autoFocus
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>質問文</Text>
                    <TextInput
                      style={styles.customQuestionInput}
                      placeholder="例: この単語の例文を3つ教えて"
                      placeholderTextColor="#ACACAC"
                      value={customQuestionText}
                      onChangeText={setCustomQuestionText}
                      multiline
                    />
                  </View>

                  <View style={styles.modalButtonsRow}>
                    <TouchableOpacity
                      style={styles.modalCancelButton}
                      onPress={() => {
                        setIsCustomQuestionModalOpen(false);
                        setCustomQuestionTitle('');
                        setCustomQuestionText('');
                      }}
                    >
                      <Text style={styles.modalCancelButtonText}>キャンセル</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modalAddButton,
                        (!customQuestionTitle.trim() || !customQuestionText.trim()) && styles.modalAddButtonDisabled,
                      ]}
                      onPress={handleAddCustomQuestion}
                      disabled={!customQuestionTitle.trim() || !customQuestionText.trim()}
                    >
                      <Text style={styles.modalAddButtonText}>追加</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#DCF0E1',
    borderRadius: 18,
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 10,
    overflow: 'hidden',
    alignSelf: 'stretch',
    flexShrink: 0,
  },
  containerClosed: {
    minHeight: 116, // 最低でも閉じた高さは維持
    marginBottom: 4,
  },
  containerOpen: {
    paddingBottom: 10,
  },
  chatMessages: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 512,
    marginBottom: 10,
    minHeight: 0,
  },
  qaCardList: {
    gap: 20,
    paddingTop: 4,
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    flexShrink: 0,
    paddingTop: 0,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12, // 質問タグとテキストインプットの間隔
  },
  questionScrollView: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 0,
    marginTop: 0,
    paddingBottom: 0,
    paddingTop: 0,
    height: 32,
  },
  questionList: {
    gap: 8,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  whiteContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 9,
    paddingBottom: 9,
    marginBottom: 0, // テキストインプットの下のマージン
    overflow: 'hidden',
    flexShrink: 0,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    minHeight: 34,
  },
  settingsButton: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: 0,
  },
  input: {
    flex: 1,
    width: 0, // 折り返し維持のため
    minHeight: 34, // 1行分
    textAlignVertical: 'top',
    paddingVertical: 7,
    paddingHorizontal: 0,
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 1,
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#686868',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: 0,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  emptyState: {
    paddingVertical: 0,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  emptyStateText: {
    fontSize: 13,
    color: '#686868',
    lineHeight: 18,
  },
  errorBanner: {
    marginTop: 12,
    backgroundColor: '#FFEAEA',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  errorBannerText: {
    flex: 1,
    color: '#CC0000',
    fontSize: 13,
  },
  retryInlineButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#CC0000',
    borderRadius: 8,
  },
  retryInlineButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  menuContainer: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    width: '60%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    padding: 3,
    gap: 3,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOptionActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999999',
  },
  toggleOptionTextActive: {
    color: '#000000',
  },
  plusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  customQuestionModalContainer: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  customQuestionTitleInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#000000',
  },
  customQuestionInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
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
  modalAddButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#00AA69',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAddButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  modalAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
