import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { QAPair } from '@/types/chat';
import { QuestionTag } from './question-tag';
import { QACardList } from './qa-card-list';

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

function DetailModeIcon({ size = 24, active = false }: { size?: number; active?: boolean }) {
  const color = active ? '#4CAF50' : '#686868';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* 虫眼鏡 */}
      <Path
        d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* プラスマーク */}
      <Path
        d="M11 8v6M8 11h6"
        stroke={color}
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
}: ChatSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasManuallyClosedWithContent, setHasManuallyClosedWithContent] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const prevQAPairsLengthRef = useRef(qaPairs.length);

  useEffect(() => {
    // 新しいQAペアが追加された場合のみ自動的に開く
    if (!isOpen && qaPairs.length > prevQAPairsLengthRef.current && qaPairs.length > 0) {
      setIsOpen(true);
      setHasManuallyClosedWithContent(false);
    }
    prevQAPairsLengthRef.current = qaPairs.length;
  }, [qaPairs.length, isOpen]);

  // 自動スクロール: 新しいメッセージやストリーミング中
  useEffect(() => {
    if (isOpen && qaPairs.length > 0) {
      // 少し遅延を入れてレンダリングを待つ
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
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
      setInputText('');
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
    const tags = [...questionPresets];
    for (const item of followUps) {
      if (!tags.includes(item)) {
        tags.push(item);
      }
    }
    return tags;
  }, [questionPresets, followUps]);

  return (
    <View style={[styles.container, isOpen && styles.containerOpen]}>
      {isOpen && (
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatMessages}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            // コンテンツサイズが変更されたら自動的に下にスクロール（ストリーミング中は即座に）
            if (isStreaming || qaPairs.some(pair => pair.status === 'pending')) {
              scrollViewRef.current?.scrollToEnd({ animated: false });
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
          {combinedQuestions.map((label, index) => (
            <QuestionTag
              key={`${label}-${index}`}
              label={label}
              onPress={() => {
                setIsOpen(true);
                onQuickQuestion?.(label);
              }}
            />
          ))}
        </ScrollView>

        {/* White Container: Input + Mode Icon */}
        <View style={styles.whiteContainer}>
          {/* Input Row */}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor="#ACACAC"
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => {
                setIsInputFocused(true);
              }}
              editable={!isStreaming}
              onSubmitEditing={(e) => {
                const text = e.nativeEvent.text.trim();
                if (text) {
                  void handleSubmit(text);
                }
              }}
            />
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

          {/* Mode Icon Row */}
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={styles.modeIconButton}
              onPress={() => {
                const newLevel = detailLevel === 'concise' ? 'detailed' : 'concise';
                onDetailLevelChange?.(newLevel);
              }}
              disabled={isStreaming}
            >
              <View style={styles.modeIconContainer}>
                <DetailModeIcon size={24} active={detailLevel === 'detailed'} />
                {detailLevel === 'detailed' && (
                  <Text style={styles.modeLabel}>詳細モード</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    height: 170, // 質問タグ(32) + margin(10) + 白コンテナ(約110) + padding(20)
  },
  containerOpen: {
    height: '100%',
    paddingBottom: 10, // 横の余白とバランスを取る
  },
  chatMessages: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 512,
    marginBottom: 0,
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
    marginTop: 4,
    paddingTop: 0,
  },
  questionScrollView: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 0,
    marginTop: 0,
    paddingBottom: 0,
    paddingTop: 0,
    height: 32, // 質問タグの高さを固定
  },
  questionList: {
    gap: 8,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  whiteContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingLeft: 12,
    paddingRight: 8,
    paddingTop: 9,
    paddingBottom: 9,
    marginTop: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modeIconButton: {
    flexShrink: 0,
  },
  modeIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  input: {
    flex: 1,
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
});
