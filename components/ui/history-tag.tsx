/**
 * HistoryTag Component
 * 検索履歴を表示する小さなタグコンポーネント
 * Figmaデザインに基づいて実装
 */

import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { SearchHistoryItem } from '@/types/search';

interface HistoryTagProps {
  item: SearchHistoryItem;
  onPress?: (text: string) => void;
}

export function HistoryTag({ item, onPress }: HistoryTagProps) {
  const bgColor = useThemeColor({}, 'historyTagBackground');
  const textColor = useThemeColor({}, 'historyTagText');

  // テキストを短縮（最大20文字）
  const displayText = item.query.length > 20
    ? item.query.substring(0, 20) + '...'
    : item.query;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: bgColor }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(item.query);
      }}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
        {displayText}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});
