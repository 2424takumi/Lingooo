import React, { useState, useRef, useEffect } from 'react';
import { TextInput, TextStyle, NativeSyntheticEvent, TextInputSelectionChangeEventData } from 'react-native';

interface SelectableTextProps {
  text: string;
  style?: TextStyle;
  onSelectionChange?: (selectedText: string) => void;
  onSelectionCleared?: () => void;
  numberOfLines?: number;
}

/**
 * プラットフォーム別の選択可能なテキストコンポーネント
 * TextInputを使用して選択イベントを検出
 */
export function SelectableText({ text, style, onSelectionChange, onSelectionCleared, numberOfLines }: SelectableTextProps) {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const textRef = useRef(text);
  const inputRef = useRef<TextInput>(null);

  // textが変更されたら更新
  textRef.current = text;

  const handleSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    const { start, end } = e.nativeEvent.selection;
    setSelection({ start, end });

    // テキストが選択されている場合は通知
    if (start !== end) {
      const selectedText = textRef.current.substring(start, end);
      onSelectionChange?.(selectedText);
    } else {
      // 選択が解除された場合も通知
      onSelectionCleared?.();
    }
  };

  return (
    <TextInput
      ref={inputRef}
      value={text}
      editable={false}
      multiline
      scrollEnabled={false}
      style={[
        style,
        {
          padding: 0,
          margin: 0,
        },
      ]}
      onSelectionChange={handleSelectionChange}
      selection={selection}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      contextMenuHidden={false}
      inputAccessoryViewID={undefined}
    />
  );
}
