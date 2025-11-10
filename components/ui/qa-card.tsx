import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { useThemeColor } from '@/hooks/use-theme-color';
import type { QAPair } from '@/types/chat';
import { TypingIndicator } from './typing-indicator';
import { CopyIcon } from '@/components/icons/copy-icon';
import { BookmarkIcon } from '@/components/icons/bookmark-icon';
import { addBookmark, removeBookmark, findBookmark } from '@/services/storage/bookmark-storage';
import { logger } from '@/utils/logger';

interface QACardProps {
  pair: QAPair;
  onRetry?: (question: string) => void;
  scope?: string;
  identifier?: string;
  hideActions?: boolean;
  onBookmarkAdded?: (bookmarkId: string) => void;
}

export function QACard({ pair, onRetry, scope = 'general', identifier = '', hideActions = false, onBookmarkAdded }: QACardProps) {
  const cardBackground = useThemeColor({ light: '#FAFCFB', dark: '#1C1C1E' }, 'background');
  const borderColor = useThemeColor({ light: '#FFFFFF', dark: '#3A3A3C' }, 'background');
  const questionColor = useThemeColor({ light: '#686868', dark: '#A1A1A6' }, 'icon');
  const answerBackground = useThemeColor({ light: '#E5F3E8', dark: '#2C2C2E' }, 'searchBackground');
  const answerTextColor = useThemeColor({ light: '#000000', dark: '#F2F2F2' }, 'text');
  const errorColor = useThemeColor({ light: '#D33', dark: '#FF6B6B' }, 'primary');
  const primaryColor = useThemeColor({}, 'primary');
  const iconColor = useThemeColor({ light: '#686868', dark: '#A1A1A6' }, 'icon');

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isCheckingBookmark, setIsCheckingBookmark] = useState(true);

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
        // ブックマークを追加
        logger.debug('[QACard] Adding bookmark...', { scope, identifier, question: pair.q });
        const newBookmark = await addBookmark({
          question: pair.q,
          answer: pair.a,
          scope,
          identifier,
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
                <Text style={[styles.answerText, { color: answerTextColor }]}>{pair.a}</Text>
              </Animated.View>
            ) : null}
            <TypingIndicator color="#2E7D32" dotSize={6} />
          </View>
        ) : (
          <Text style={[styles.answerText, { color: answerTextColor }]}>
            {pair.a ?? (pair.status === 'error' ? '回答を取得できませんでした。' : '')}
          </Text>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
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
    padding: 16,
    gap: 10,
    marginHorizontal: -10,
    marginBottom: -10,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 22,
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
});
