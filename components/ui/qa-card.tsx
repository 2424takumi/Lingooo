import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, Alert, TextInput, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path } from 'react-native-svg';

import { useThemeColor } from '@/hooks/use-theme-color';
import type { QAPair } from '@/types/chat';
import { TypingIndicator } from './typing-indicator';
import { CopyIcon } from '@/components/icons/copy-icon';
import { BookmarkIcon } from '@/components/icons/bookmark-icon';
import { SelectableText } from './selectable-text';
import { addBookmark, removeBookmark, findBookmark } from '@/services/storage/bookmark-storage';
import { logger } from '@/utils/logger';

interface QACardProps {
  pair: QAPair;
  onRetry?: (question: string) => void;
  scope?: string;
  identifier?: string;
  hideActions?: boolean;
  onBookmarkAdded?: (bookmarkId: string) => void;
  onFollowUpQuestion?: (question: string) => Promise<void>;
  onEnterFollowUpMode?: (pairId: string, question: string) => void;
  isFollowUpActive?: boolean;
  onScrollToFollowUpInput?: () => void;
  onTextSelected?: (text: string) => void;
  onSelectionCleared?: () => void;
}

function SendIcon({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MessagePlusIcon({ size = 19, color = '#ACACAC' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 19 19" fill="none">
      <Path
        d="M9.25 12V9.25M9.25 9.25V6.5M9.25 9.25H6.5M9.25 9.25H12M9.25012 17.5C7.75126 17.5 6.34577 17.1002 5.1344 16.4016C5.01472 16.3326 4.95481 16.2981 4.89852 16.2826C4.84613 16.2681 4.79935 16.2632 4.74513 16.2669C4.68732 16.2708 4.62752 16.2908 4.50863 16.3304L2.39156 17.0361L2.38989 17.0369C1.94318 17.1858 1.7194 17.2603 1.57068 17.2073C1.4411 17.1611 1.33898 17.0588 1.29277 16.9293C1.23977 16.7806 1.31412 16.5576 1.46282 16.1115L1.4637 16.1087L2.16846 13.9945L2.17013 13.99C2.20942 13.8722 2.2293 13.8126 2.23324 13.755C2.23695 13.7008 2.23201 13.6537 2.21752 13.6013C2.20217 13.5457 2.16827 13.487 2.10105 13.3704L2.09834 13.3657C1.39971 12.1544 1 10.7489 1 9.25C1 4.69365 4.69365 1 9.25 1C13.8063 1 17.5 4.69365 17.5 9.25C17.5 13.8063 13.8065 17.5 9.25012 17.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronIcon({ size = 16, color = '#ACACAC', expanded = false }: { size?: number; color?: string; expanded?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ transform: [{ rotate: expanded ? '-90deg' : '90deg' }] }}>
      <Path
        d="M6 12L10 8L6 4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseIcon({ size = 16, color = '#242424' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M4 4L12 12M12 4L4 12"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function QACard({ pair, onRetry, scope = 'general', identifier = '', hideActions = false, onBookmarkAdded, onFollowUpQuestion, onEnterFollowUpMode, isFollowUpActive = false, onScrollToFollowUpInput, onTextSelected, onSelectionCleared }: QACardProps) {
  // ブックマークページ用の配色（hideActions=trueの時）
  const cardBackground = useThemeColor(
    { light: hideActions ? '#F8F8F8' : '#FAFCFB', dark: '#1C1C1E' },
    'background'
  );
  const borderColor = useThemeColor({ light: '#FFFFFF', dark: '#3A3A3C' }, 'background');
  const questionColor = useThemeColor({ light: '#686868', dark: '#A1A1A6' }, 'icon');
  const answerBackground = useThemeColor(
    { light: hideActions ? '#FFFFFF' : '#F1F1F1', dark: '#2C2C2E' },
    'searchBackground'
  );
  const answerTextColor = useThemeColor({ light: '#000000', dark: '#F2F2F2' }, 'text');
  const errorColor = useThemeColor({ light: '#D33', dark: '#FF6B6B' }, 'primary');
  const primaryColor = useThemeColor({ light: '#111111', dark: '#FFFFFF' }, 'text');
  const iconColor = useThemeColor({ light: '#686868', dark: '#A1A1A6' }, 'icon');
  const placeholderColor = useThemeColor({ light: '#ACACAC', dark: '#8E8E93' }, 'icon');
  const inputBackground = useThemeColor({ light: '#FFFFFF', dark: '#2C2C2E' }, 'background');

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isCheckingBookmark, setIsCheckingBookmark] = useState(true);
  // 追加質問の開閉状態を管理（初期状態は全て開いている）
  const [expandedFollowUps, setExpandedFollowUps] = useState<Record<string, boolean>>({});
  // 前回の追加質問数を記録
  const prevFollowUpCountRef = useRef(0);

  const showRetry = pair.status === 'error' && typeof onRetry === 'function';
  const showActions = pair.status === 'completed' && pair.a;

  // アニメーション: テキストが上から徐々に表示される（初回のみ）
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (pair.a && !hasAnimatedRef.current) {
      // 初回表示時のみアニメーション
      hasAnimatedRef.current = true;
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (pair.status === 'completed' && !hasAnimatedRef.current) {
      // 完了時は即座に表示
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      hasAnimatedRef.current = true;
    }
  }, [pair.a, pair.status, fadeAnim, slideAnim]);

  // ブックマーク状態の確認
  useEffect(() => {
    async function checkBookmarkStatus() {
      if (pair.a && pair.status === 'completed') {
        setIsCheckingBookmark(true);
        const bookmark = await findBookmark(pair.q, pair.a);
        setIsBookmarked(!!bookmark);
        setIsCheckingBookmark(false);
      }
    }
    void checkBookmarkStatus();
  }, [pair.q, pair.a, pair.status]);

  // 新しい追加質問が追加されたら自動的に展開
  useEffect(() => {
    const currentFollowUps = pair.followUpQAs || [];
    const currentCount = currentFollowUps.length;

    // 追加質問が追加された場合
    if (currentCount > prevFollowUpCountRef.current) {
      // 新しく追加された追加質問のIDを取得
      const newFollowUps = currentFollowUps.slice(prevFollowUpCountRef.current);

      // 新しい追加質問を展開状態にする
      setExpandedFollowUps((prev) => {
        const updated = { ...prev };
        newFollowUps.forEach((followUp) => {
          updated[followUp.id] = true;
        });
        return updated;
      });
    } else if (currentCount > 0 && Object.keys(expandedFollowUps).length === 0) {
      // 初期表示時に既存のフォローアップがあれば全て開く
      const initialExpanded: Record<string, boolean> = {};
      currentFollowUps.forEach(fu => {
        initialExpanded[fu.id] = true;
      });
      setExpandedFollowUps(initialExpanded);
    }

    prevFollowUpCountRef.current = currentCount;
  }, [pair.followUpQAs]);

  // 追加質問モードがアクティブになったらスクロール
  useEffect(() => {
    if (isFollowUpActive && onScrollToFollowUpInput) {
      onScrollToFollowUpInput();
    }
  }, [isFollowUpActive, onScrollToFollowUpInput]);

  // コピー機能
  const handleCopy = async () => {
    if (!pair.a) return;

    try {
      const textToCopy = `Q: ${pair.q}\n\nA: ${pair.a}`;
      await Clipboard.setStringAsync(textToCopy);
      Alert.alert('コピーしました', '質問と回答をクリップボードにコピーしました');
    } catch (error) {
      logger.error('Failed to copy:', error);
      Alert.alert('エラー', 'コピーに失敗しました');
    }
  };

  // ブックマーク機能
  const handleBookmark = async () => {
    if (!pair.a) return;

    try {
      if (isBookmarked) {
        // ブックマークを削除
        logger.debug('[QACard] Removing bookmark...');
        const bookmark = await findBookmark(pair.q, pair.a);
        if (bookmark) {
          await removeBookmark(bookmark.id);
          setIsBookmarked(false);
          logger.debug('[QACard] Bookmark removed');
        }
      } else {
        // ブックマークを追加（追加質問も含める）
        logger.debug('[QACard] Adding bookmark...', { scope, identifier, question: pair.q });
        const newBookmark = await addBookmark({
          question: pair.q,
          answer: pair.a,
          scope,
          identifier,
          followUpQAs: pair.followUpQAs?.filter(fu => fu.status === 'completed').map(fu => ({
            id: fu.id,
            q: fu.q,
            a: fu.a || '',
            status: fu.status,
            errorMessage: fu.errorMessage,
          })),
        });
        logger.debug('[QACard] Bookmark added:', newBookmark.id);
        setIsBookmarked(true);

        // トースト通知を表示するためのコールバック
        if (onBookmarkAdded) {
          onBookmarkAdded(newBookmark.id);
        }
      }
    } catch (error) {
      logger.error('[QACard] Failed to bookmark:', error);
      Alert.alert('エラー', 'ブックマークの操作に失敗しました');
    }
  };

  // アコーディオンの開閉を切り替え
  const toggleFollowUp = (followUpId: string) => {
    setExpandedFollowUps((prev) => ({
      ...prev,
      [followUpId]: !prev[followUpId],
    }));
  };

  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.container,
        {
          backgroundColor: cardBackground,
          borderColor,
        },
      ]}
    >
      {/* 質問部分とアクション */}
      <View style={styles.questionRow}>
        <Text style={[styles.questionText, { color: questionColor }]}>{pair.q}</Text>

        {/* Copy and Bookmark Actions - Next to question */}
        {showActions && !hideActions && (
          <View style={styles.actionsContainer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="コピー"
              hitSlop={8}
              onPress={handleCopy}
              style={styles.actionButton}
            >
              <CopyIcon size={18} color={iconColor} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isBookmarked ? 'ブックマーク削除' : 'ブックマーク'}
              hitSlop={8}
              onPress={handleBookmark}
              style={styles.actionButton}
              disabled={isCheckingBookmark}
            >
              <BookmarkIcon size={18} color={iconColor} filled={isBookmarked} />
            </Pressable>
          </View>
        )}
      </View>

      {/* 回答部分 */}
      <View style={[styles.answerContainer, { backgroundColor: answerBackground }]}>
        {pair.status === 'pending' ? (
          <View style={styles.pendingContainer}>
            {pair.a ? (
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
              >
                <SelectableText text={pair.a} style={[styles.answerText, { color: answerTextColor }] as any} onSelectionChange={onTextSelected} onSelectionCleared={onSelectionCleared} />
              </Animated.View>
            ) : null}
            <TypingIndicator color="#2C2C2C" dotSize={6} />
          </View>
        ) : (
          <SelectableText
            text={pair.a ?? (pair.status === 'error' ? '回答を取得できませんでした。' : '')}
            style={[styles.answerText, { color: answerTextColor }] as any}
            onSelectionChange={onTextSelected}
            onSelectionCleared={onSelectionCleared}
          />
        )}

        {pair.status === 'error' && pair.errorMessage ? (
          <Text style={[styles.errorText, { color: errorColor }]}>{pair.errorMessage}</Text>
        ) : null}

        {showRetry && (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => onRetry?.(pair.q)}
            style={styles.retryButton}
          >
            <Text style={[styles.retryText, { color: primaryColor }]}>再試行</Text>
          </Pressable>
        )}

        {/* 追加質問ボタン - 回答完了後、アンサーボックス内に表示 */}
        {pair.status === 'completed' && pair.a && !hideActions && onEnterFollowUpMode && (
          <View style={styles.askQuestionSection}>
            <View
              style={[
                styles.askQuestionButton,
                isFollowUpActive && styles.askQuestionButtonActive,
              ]}
            >
              <TouchableOpacity
                onPress={() => onEnterFollowUpMode(pair.id, pair.q)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="追加で質問"
              >
                <View style={styles.askQuestionButtonContent}>
                  <MessagePlusIcon size={16} color="#000000" />
                  <Text style={styles.askQuestionButtonText}>追加で質問</Text>
                </View>
              </TouchableOpacity>

              {/* ×ボタン - アクティブ時のみ表示 */}
              {isFollowUpActive && (
                <TouchableOpacity
                  onPress={() => onEnterFollowUpMode(pair.id, pair.q)}
                  hitSlop={8}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="閉じる"
                >
                  <CloseIcon size={14} color="#242424" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* 追加質問のQAペアを表示 - カード内部に移動 */}
      {pair.status === 'completed' && pair.a && pair.followUpQAs && pair.followUpQAs.length > 0 && (
          <View style={styles.followUpSection}>
            <View style={styles.followUpList}>
              {pair.followUpQAs.map((followUp, index) => {
                const isExpanded = expandedFollowUps[followUp.id] !== false; // デフォルトはtrue

                return (
                  <View key={followUp.id} style={styles.followUpItem}>
                    {/* フォローアップの質問（破線と横並び） */}
                    <TouchableOpacity
                      style={styles.followUpQuestionRow}
                      onPress={() => toggleFollowUp(followUp.id)}
                      activeOpacity={0.7}
                    >
                      {/* 左側の破線 */}
                      <View style={styles.followUpLineContainer}>
                        <Svg width={2} height={20} style={styles.followUpLineSvg}>
                          <Path
                            d="M1 0 L1 20"
                            stroke="#E0E0E0"
                            strokeWidth={2}
                            strokeDasharray="4,4"
                          />
                        </Svg>
                      </View>

                      <Text style={[styles.followUpQuestionText, { color: questionColor }]}>
                        {followUp.q}
                      </Text>
                      <ChevronIcon size={16} color={iconColor} expanded={isExpanded} />
                    </TouchableOpacity>

                    {/* 回答はアコーディオンで表示（通常の回答と同じ横幅） */}
                    {isExpanded && (
                      <View style={[styles.followUpAnswerContainer, { backgroundColor: answerBackground }]}>
                        {followUp.status === 'pending' ? (
                          <View style={styles.followUpPendingContainer}>
                            {followUp.a ? (
                              <SelectableText
                                text={followUp.a}
                                style={[styles.answerText, { color: answerTextColor }] as any}
                                onSelectionChange={onTextSelected}
                                onSelectionCleared={onSelectionCleared}
                              />
                            ) : null}
                            <TypingIndicator color="#2C2C2C" dotSize={6} />
                          </View>
                        ) : (
                          <SelectableText
                            text={followUp.a ?? (followUp.status === 'error' ? '回答を取得できませんでした。' : '')}
                            style={[styles.answerText, { color: answerTextColor, marginBottom: -10 }] as any}
                            onSelectionChange={onTextSelected}
                            onSelectionCleared={onSelectionCleared}
                          />
                        )}

                        {followUp.status === 'error' && followUp.errorMessage && (
                          <Text style={[styles.errorText, { color: errorColor }]}>
                            {followUp.errorMessage}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
  );
}

const styles = StyleSheet.create({
        container: {
        borderRadius: 14,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 12,
      gap: 12,
  },
      questionRow: {
        flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
  },
      questionText: {
        flex: 1,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '500',
  },
      answerContainer: {
        borderRadius: 8,
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 5,
      marginHorizontal: -4,
      marginBottom: -4,
  },
      answerText: {
        fontSize: 14,
      lineHeight: 24,
      fontWeight: '400',
      letterSpacing: 0.3,
  },
      errorText: {
        fontSize: 12,
      marginTop: 8,
  },
      pendingContainer: {
        gap: 8,
  },
      retryButton: {
        paddingHorizontal: 8,
      paddingVertical: 4,
      marginTop: 8,
  },
      retryText: {
        fontSize: 12,
      fontWeight: '600',
  },
      actionsContainer: {
        flexDirection: 'row',
      gap: 4,
      alignItems: 'center',
  },
      actionButton: {
        padding: 2,
  },
      followUpSection: {
        marginTop: 8,
  },
      followUpList: {
        gap: 16,
      marginBottom: -4,
  },
      followUpItem: {
        gap: 8,
  },
      followUpQuestionRow: {
        flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
      followUpLineContainer: {
        width: 2,
      paddingTop: 2,
  },
      followUpLineSvg: {
        width: 2,
  },
      followUpQuestionText: {
        flex: 1,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
      letterSpacing: 0.5,
  },
      followUpAnswerContainer: {
        borderRadius: 8,
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: 6,
      gap: 5,
      marginHorizontal: -4,
  },
      followUpPendingContainer: {
        gap: 8,
  },
      askQuestionSection: {
        marginTop: 3,
  },
      askQuestionButton: {
        flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 12,
      paddingLeft: 10,
      paddingRight: 6,
      paddingVertical: 4,
      alignSelf: 'flex-start',
  },
      askQuestionButtonActive: {
        backgroundColor: '#FFFFFF',
  },
      closeButton: {
        padding: 2,
      marginLeft: 3,
  },
      askQuestionButtonContent: {
        flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
  },
      askQuestionButtonText: {
        fontSize: 12,
      lineHeight: 22,
      letterSpacing: 1,
      color: '#000000',
  },
});
