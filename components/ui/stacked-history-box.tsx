/**
 * StackedHistoryBox Component
 * 検索履歴を積み上げて表示するボックスコンポーネント
 * 新しい履歴は上から落下するアニメーション付き
 * Figmaデザインに基づいて実装
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { HistoryTag } from './history-tag';
import { getSearchHistory } from '@/services/storage/search-history-storage';
import type { SearchHistoryItem } from '@/types/search';
import { logger } from '@/utils/logger';

interface StackedHistoryBoxProps {
  onItemPress?: (text: string) => void;
  refreshTrigger?: number; // 履歴更新のトリガー
}

export function StackedHistoryBox({ onItemPress, refreshTrigger }: StackedHistoryBoxProps) {
  const insets = useSafeAreaInsets();
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([]);
  const [newItemId, setNewItemId] = useState<string | null>(null);

  // 履歴を読み込む（表示可能な件数に制限）
  const loadHistory = useCallback(async () => {
    try {
      // テスト用モックデータ
      const mockHistory: SearchHistoryItem[] = [
        { id: '1', query: 'hello', timestamp: Date.now(), type: 'word' },
        { id: '2', query: 'こんにちは', timestamp: Date.now(), type: 'word' },
        { id: '3', query: 'Bom dia', timestamp: Date.now(), type: 'word' },
        { id: '4', query: 'extraordinary', timestamp: Date.now(), type: 'word' },
        { id: '5', query: '素晴らしい', timestamp: Date.now(), type: 'word' },
        { id: '6', query: 'maravilhoso', timestamp: Date.now(), type: 'word' },
        { id: '7', query: 'cat', timestamp: Date.now(), type: 'word' },
        { id: '8', query: 'dog', timestamp: Date.now(), type: 'word' },
        { id: '9', query: 'incomprehensibility', timestamp: Date.now(), type: 'word' },
        { id: '10', query: 'AI', timestamp: Date.now(), type: 'word' },
        { id: '11', query: 'おはようございます', timestamp: Date.now(), type: 'word' },
        { id: '12', query: 'Até logo', timestamp: Date.now(), type: 'word' },
        { id: '13', query: 'beautiful', timestamp: Date.now(), type: 'word' },
        { id: '14', query: '愛', timestamp: Date.now(), type: 'word' },
        { id: '15', query: 'amor', timestamp: Date.now(), type: 'word' },
        { id: '16', query: 'Constantinople', timestamp: Date.now(), type: 'word' },
        { id: '17', query: 'ok', timestamp: Date.now(), type: 'word' },
        { id: '18', query: 'antidisestablishmentarianism', timestamp: Date.now(), type: 'word' },
        { id: '19', query: '今日はいい天気ですね', timestamp: Date.now(), type: 'translation' },
        { id: '20', query: 'yes', timestamp: Date.now(), type: 'word' },
      ];

      const history = mockHistory; // 本番: await getSearchHistory()
      const previousFirstId = historyItems.length > 0 ? historyItems[0].id : null;
      const currentFirstId = history.length > 0 ? history[0].id : null;

      // 新しいアイテムが追加された場合、アニメーションをトリガー
      if (previousFirstId !== currentFirstId && currentFirstId) {
        setNewItemId(currentFirstId);
        // アニメーション完了後にリセット
        setTimeout(() => setNewItemId(null), 600);
      }

      // 最大20件まで表示（画面に収まる範囲）
      setHistoryItems(history.slice(0, 20));
    } catch (error) {
      logger.error('[StackedHistoryBox] Failed to load history:', error);
    }
  }, [historyItems]);

  useEffect(() => {
    loadHistory();
  }, [refreshTrigger]);

  if (historyItems.length === 0) {
    return (
      <View style={[styles.emptyContainer, { paddingBottom: insets.bottom }]}>
        <Text style={styles.emptyText}>検索した内容がここに表示されます</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
      <View style={styles.tagsWrapper} pointerEvents="box-none">
        <View style={styles.tagsContainer}>
          {historyItems.map((item, index) => {
            const isNew = item.id === newItemId;
            return (
              <AnimatedHistoryTag
                key={item.id}
                item={item}
                onPress={onItemPress}
                isNew={isNew}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// アニメーション付きHistoryTag
interface AnimatedHistoryTagProps {
  item: SearchHistoryItem;
  onPress?: (text: string) => void;
  isNew: boolean;
}

function AnimatedHistoryTag({ item, onPress, isNew }: AnimatedHistoryTagProps) {
  const translateY = useSharedValue(isNew ? -100 : 0);
  const opacity = useSharedValue(isNew ? 0 : 1);

  useEffect(() => {
    if (isNew) {
      // 落下アニメーション
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [isNew]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <HistoryTag item={item} onPress={onPress} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 24,
    height: 550,
    overflow: 'hidden',
  },
  tagsWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-end',
    justifyContent: 'flex-start',
    rowGap: 1,
    columnGap: 1,
  },
  emptyContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 24,
    height: 550,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#A1A1A6',
    textAlign: 'center',
  },
});
