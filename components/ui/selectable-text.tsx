import React from 'react';
import { Platform, Text, TextStyle } from 'react-native';
import { UITextView } from 'react-native-uitextview';

interface SelectableTextProps {
  text: string;
  style?: TextStyle;
  onSelectionChange?: (selectedText: string) => void;
}

/**
 * プラットフォーム別の選択可能なテキストコンポーネント
 * - iOS: UITextView（ネイティブのテキスト選択体験）
 * - Android: 標準のText（selectable=true）
 */
export function SelectableText({ text, style, onSelectionChange }: SelectableTextProps) {
  if (Platform.OS === 'ios') {
    return (
      <UITextView
        selectable
        style={style}
      >
        {text}
      </UITextView>
    );
  }

  // Android
  return (
    <Text
      selectable
      style={style}
      onLongPress={() => {
        // Androidではネイティブの選択メニューを使用
        // onSelectionChangeは呼ばれない
      }}
    >
      {text}
    </Text>
  );
}
