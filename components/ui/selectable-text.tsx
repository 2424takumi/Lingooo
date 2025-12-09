import React, { useState, useRef, useEffect } from 'react';
import { TextInput, TextStyle, NativeSyntheticEvent, TextInputSelectionChangeEventData, Platform } from 'react-native';

export interface SelectionInfo {
  text: string;
  isSingleWord: boolean;
  startIndex: number;
  endIndex: number;
}

interface SelectableTextProps {
  text: string;
  style?: TextStyle;
  onSelectionChange?: (selectedText: string) => void;
  onSelectionChangeWithInfo?: (selectionInfo: SelectionInfo) => void;
  onSelectionCleared?: () => void;
  numberOfLines?: number;
  clearSelectionKey?: number; // 値が変わると選択がクリアされる
}

/**
 * 選択されたテキストが単語かどうかを判定
 */
function isSingleWord(text: string): boolean {
  const trimmed = text.trim();

  // 空文字列の場合はfalse
  if (!trimmed) return false;

  // スペースや改行が含まれている場合は複数単語
  if (/[\s\n]/.test(trimmed)) return false;

  // 句読点のみの場合はfalse
  if (/^[.,!?;:、。！？；：\-\–\—]+$/.test(trimmed)) return false;

  // それ以外は単語とみなす
  return true;
}

/**
 * プラットフォーム別の選択可能なテキストコンポーネント
 * TextInputを使用して選択イベントを検出
 */
export function SelectableText({
  text,
  style,
  onSelectionChange,
  onSelectionChangeWithInfo,
  onSelectionCleared,
  numberOfLines,
  clearSelectionKey
}: SelectableTextProps) {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const textRef = useRef(text);
  const inputRef = useRef<TextInput>(null);

  // textが変更されたら更新
  textRef.current = text;

  // clearSelectionKeyが変更されたら選択をクリア
  useEffect(() => {
    if (clearSelectionKey !== undefined && clearSelectionKey > 0) {
      setSelection({ start: 0, end: 0 });
      onSelectionCleared?.();
    }
  }, [clearSelectionKey]);

  const handleSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    const { start, end } = e.nativeEvent.selection;
    setSelection({ start, end });

    // テキストが選択されている場合は通知
    if (start !== end) {
      const selectedText = textRef.current.substring(start, end);

      // 旧APIとの互換性のため両方呼び出す
      onSelectionChange?.(selectedText);

      // 新しいAPI: 単語判定情報と位置情報も含める
      if (onSelectionChangeWithInfo) {
        const selectionInfo: SelectionInfo = {
          text: selectedText,
          isSingleWord: isSingleWord(selectedText),
          startIndex: start,
          endIndex: end,
        };
        onSelectionChangeWithInfo(selectionInfo);
      }
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
      showSoftInputOnFocus={false} // キーボードを表示しない
      caretHidden={true} // カーソルを非表示
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
      // 短いタップは親に伝播、長押しでテキスト選択
      delayLongPress={300}
    />
  );
}
