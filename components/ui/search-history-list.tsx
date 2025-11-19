import { StyleSheet, View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { SearchHistoryItem } from '@/types/search';
import { getSearchHistoryByLanguage } from '@/services/storage/search-history-storage';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import { logger } from '@/utils/logger';

interface SearchHistoryListProps {
  onItemPress: (query: string) => void;
  maxItems?: number; // 表示する最大件数
  showTitle?: boolean; // タイトルを表示するか（デフォルト: true）
}

export function SearchHistoryList({ onItemPress, maxItems = 20, showTitle = true }: SearchHistoryListProps) {
  const { currentLanguage } = useLearningLanguages();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const titleColor = useThemeColor({ light: '#686868', dark: '#A1A1A6' }, 'text');
  const itemTextColor = useThemeColor({ light: '#000000', dark: '#F2F2F2' }, 'text');

  const loadHistory = useCallback(async () => {
    try {
      const items = await getSearchHistoryByLanguage(currentLanguage.code);
      logger.debug('[SearchHistoryList] Loaded history:', {
        language: currentLanguage.code,
        count: items.length,
        items: items.slice(0, 5).map(i => i.query),
      });
      setHistory(items.slice(0, maxItems));
    } catch (error) {
      logger.error('[SearchHistoryList] Failed to load history:', error);
      setHistory([]);
    }
  }, [currentLanguage.code, maxItems]);

  // 検索履歴を読み込む（言語変更時）
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 画面がフォーカスされた時に履歴を再読み込み
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  // 履歴が空の場合は何も表示しない
  if (history.length === 0) {
    return null;
  }

  const renderItem = ({ item }: { item: SearchHistoryItem }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => onItemPress(item.query)}
    >
      <Text style={[styles.historyText, { color: itemTextColor }]} numberOfLines={1}>
        {item.query}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {showTitle && (
        <Text style={[styles.title, { color: titleColor }]}>
          最近の検索
        </Text>
      )}
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false} // ホーム画面のスクロールに委ねる
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  list: {
    overflow: 'hidden',
  },
  historyItem: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  historyText: {
    fontSize: 15,
    fontWeight: '400',
  },
});
