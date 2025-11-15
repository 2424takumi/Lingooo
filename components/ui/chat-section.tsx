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
  Dimensions,
  Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { QAPair } from '@/types/chat';
import { QuestionTag } from './question-tag';
import { QACardList } from './qa-card-list';
import { useAISettings } from '@/contexts/ai-settings-context';
import { logger } from '@/utils/logger';
import { useThemeColor } from '@/hooks/use-theme-color';

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
  prefilledInputText?: string | null;
  onPrefillConsumed?: () => void;
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
  const width = size;
  const height = (size * 18) / 20;
  return (
    <Svg width={width} height={height} viewBox="0 0 20 18" fill="none">
      <Path
        d="M7.75 14.75H18.75M0.75 14.75H3.75M3.75 14.75V16.75M3.75 14.75V12.75M17.75 8.75H18.75M0.75 8.75H13.75M13.75 8.75V10.75M13.75 8.75V6.75M11.75 2.75H18.75M0.75 2.75H7.75M7.75 2.75V4.75M7.75 2.75V0.75"
        stroke="#242424"
        strokeWidth={1.5}
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
        stroke="#FFFFFF"
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
  prefilledInputText,
  onPrefillConsumed,
}: ChatSectionProps) {
  const { customQuestions, addCustomQuestion } = useAISettings();
  const containerBackground = useThemeColor({}, 'chatSectionBackground');
  const inputBackground = useThemeColor({}, 'chatInputBackground');
  const placeholderColor = useThemeColor({}, 'textPlaceholder');

  // questionPresetsをローカル変数として保持（依存配列で使用するため）
  const questions = questionPresets;
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasManuallyClosedWithContent, setHasManuallyClosedWithContent] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isCustomQuestionModalOpen, setIsCustomQuestionModalOpen] = useState(false);
  const [customQuestionTitle, setCustomQuestionTitle] = useState('');
  const [customQuestionText, setCustomQuestionText] = useState('');
  const INPUT_LINE_HEIGHT = 22;
  const MAX_LINES = 5;
  const INPUT_TOP_PADDING = 6;
  const INPUT_BOTTOM_PADDING = 6;
  const MIN_INPUT_HEIGHT = INPUT_LINE_HEIGHT + INPUT_TOP_PADDING + INPUT_BOTTOM_PADDING;
  const MAX_INPUT_HEIGHT = MIN_INPUT_HEIGHT + INPUT_LINE_HEIGHT * (MAX_LINES - 1);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const prevQAPairsLengthRef = useRef(qaPairs.length);
  const lastCardYRef = useRef<number>(0);
  const prevIdentifierRef = useRef(identifier);
  const lastPrefilledValueRef = useRef<string | null>(null);

  // 画面の高さを取得し、チャットメッセージの最大高さを計算
  // JPsearchページの場合は上のマージンを72px、それ以外は98px
  // ボトムセクション（約150px）+ その他マージン（約50px）を引いた値
  const screenHeight = Dimensions.get('window').height;
  const topMargin = scope === 'jpSearch' ? 72 : 98;
  const calculatedMaxHeight = screenHeight - topMargin - 200;

  // アニメーション用の値
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  // チャットの開閉アニメーション
  useEffect(() => {
    if (isOpen) {
      // 開くアニメーション
      Animated.parallel([
        Animated.spring(animatedHeight, {
          toValue: calculatedMaxHeight,
          useNativeDriver: false,
          friction: 9,
          tension: 50,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // 閉じるアニメーション
      Animated.parallel([
        Animated.timing(animatedHeight, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isOpen, calculatedMaxHeight]);

  // 単語（identifier）が変わったときにチャットを閉じる
  useEffect(() => {
    if (identifier !== prevIdentifierRef.current) {
      setIsOpen(false);
      setHasManuallyClosedWithContent(false);
      setInputText('');
      prevIdentifierRef.current = identifier;
    }
  }, [identifier]);

  // 外部から指定されたテキストでインプットをプレフィル
  useEffect(() => {
    if (!prefilledInputText || !prefilledInputText.trim()) {
      if (lastPrefilledValueRef.current) {
        lastPrefilledValueRef.current = null;
      }
      return;
    }

    // 同じ値を繰り返し処理しない
    if (lastPrefilledValueRef.current === prefilledInputText) {
      return;
    }

    lastPrefilledValueRef.current = prefilledInputText;
    setInputText(prefilledInputText);
    setIsOpen(true);
    setHasManuallyClosedWithContent(false);

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    onPrefillConsumed?.();

    return () => clearTimeout(focusTimer);
  }, [prefilledInputText, onPrefillConsumed]);

  useEffect(() => {
    // 新しいQAペアが追加された場合のみ自動的に開く
    if (!isOpen && qaPairs.length > prevQAPairsLengthRef.current && qaPairs.length > 0) {
      setIsOpen(true);
      setHasManuallyClosedWithContent(false);
    }

    // 新しいQAペアが追加されたら即座にスクロール（生成中のカードを見せる）
    if (qaPairs.length > prevQAPairsLengthRef.current && isOpen) {
      const timerId = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // クリーンアップ関数でタイマーをクリア
      prevQAPairsLengthRef.current = qaPairs.length;
      return () => clearTimeout(timerId);
    }

    prevQAPairsLengthRef.current = qaPairs.length;
  }, [qaPairs.length, isOpen]);

  // 自動スクロール: 新しいメッセージやストリーミング中
  useEffect(() => {
    if (isOpen && qaPairs.length > 0 && lastCardYRef.current > 0) {
      // 少し遅延を入れてレンダリングを待つ
      const timerId = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: lastCardYRef.current, animated: false });
      }, 50);

      // クリーンアップ関数でタイマーをクリア
      return () => clearTimeout(timerId);
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
    const tags = [...customQuestions.map(cq => cq.title), ...questions];
    for (const item of followUps) {
      if (!tags.includes(item)) {
        tags.push(item);
      }
    }
    return tags;
  }, [customQuestions, questions, followUps]);

  // タイトルと実際の質問文のマッピングを作成
  const questionMap = useMemo(() => {
    const map = new Map<string, string>();
    // カスタム質問のマッピング
    customQuestions.forEach(cq => {
      map.set(cq.title, cq.question);
    });
    // デフォルト質問とフォローアップ質問はタイトル=質問文
    questions.forEach(q => map.set(q, q));
    followUps.forEach(q => map.set(q, q));
    return map;
  }, [customQuestions, questions, followUps]);

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
    <View style={[styles.container, { backgroundColor: containerBackground }, isOpen ? styles.containerOpen : styles.containerClosed]}>
      <Animated.View
        style={{
          height: animatedHeight,
          opacity: animatedOpacity,
          overflow: 'hidden',
        }}
      >
        <ScrollView
          ref={scrollViewRef}
          style={[styles.chatMessages, { maxHeight: calculatedMaxHeight, minHeight: calculatedMaxHeight }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            // コンテンツサイズが変更されたら最後のカードの位置にスクロール（ストリーミング中は即座に）
            if ((isStreaming || qaPairs.some(pair => pair.status === 'pending')) && lastCardYRef.current > 0) {
              scrollViewRef.current?.scrollTo({ y: lastCardYRef.current, animated: false });
            }
          }}
        >
          {qaPairs.length > 0 && (
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
      </Animated.View>

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
          <View style={[styles.whiteContainer, { backgroundColor: inputBackground }]}>
            <View style={styles.inputRow}>
              {/* Settings Icon Button */}
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => setIsSettingsMenuOpen(true)}
                disabled={isStreaming}
              >
                <SliderIcon size={20} />
              </TouchableOpacity>

              {/* Text Input */}
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={inputRef}
                  style={[
                    styles.input,
                    {
                      lineHeight: INPUT_LINE_HEIGHT,
                      paddingTop: INPUT_TOP_PADDING,
                      paddingBottom: INPUT_BOTTOM_PADDING,
                    },
                  ]}
                  placeholder={placeholder}
                  placeholderTextColor={placeholderColor}
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
                  scrollEnabled={false}
                  selectionColor="#242424"
                  selectTextOnFocus={false}
                  contextMenuHidden={false}
                />
              </View>

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
    marginBottom: 4,
  },
  chatMessages: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 512,
    marginBottom: 12,
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
    gap: 10, // 質問タグとテキストインプットの間隔
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
    paddingBottom: 12,
    marginBottom: 0, // テキストインプットの下のマージン
    overflow: 'hidden',
    flexShrink: 0,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 34,
  },
  settingsButton: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: -2,
  },
  inputWrapper: {
    flex: 1,
    width: 0,
  },
  input: {
    width: '100%',
    textAlignVertical: 'top',
    paddingHorizontal: 0,
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 1,
    backgroundColor: 'transparent',
    minHeight: 34, // MIN_INPUT_HEIGHT - 固定値
    maxHeight: 122, // MAX_INPUT_HEIGHT
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#242424',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: -2,
  },
  buttonDisabled: {
    opacity: 0.4,
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
    fontSize: 14,
  },
  retryInlineButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#CC0000',
    borderRadius: 8,
  },
  retryInlineButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#999999',
  },
  toggleOptionTextActive: {
    color: '#000000',
  },
  plusButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
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
    fontSize: 14,
    color: '#000000',
  },
  customQuestionInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#686868',
  },
  modalAddButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAddButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  modalAddButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
