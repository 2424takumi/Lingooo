/**
 * HistoryTag Component
 * 検索履歴を表示する小さなタグコンポーネント
 * Figmaデザインに基づいて実装
 */

import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { SearchHistoryItem } from '@/types/search';

interface HistoryTagProps {
  item: SearchHistoryItem;
  onPress?: (text: string) => void;
}

export function HistoryTag({ item, onPress }: HistoryTagProps) {
  // テキストを短縮（最大20文字）
  const displayText = item.query.length > 20
    ? item.query.substring(0, 20) + '...'
    : item.query;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(item.query)}
      activeOpacity={0.7}
    >
      <Text style={styles.text} numberOfLines={1}>
        {displayText}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#242424',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
