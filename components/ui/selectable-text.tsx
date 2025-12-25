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
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
  const textRef = useRef(text);
  const inputRef = useRef<TextInput>(null);

  // textが変更されたら更新
  textRef.current = text;

  // clearSelectionKey の前回値を保持
  const prevClearSelectionKey = useRef(clearSelectionKey);

  // clearSelectionKeyが変更されたら選択をクリア
  useEffect(() => {
    // 実際に値が変更された時のみクリア（初期マウント時は除外）
    if (prevClearSelectionKey.current !== clearSelectionKey && clearSelectionKey > 0) {
      setSelection({ start: 0, end: 0 });
      onSelectionCleared?.();
    }

    // 前回値を更新
    prevClearSelectionKey.current = clearSelectionKey;
  }, [clearSelectionKey]);

  const handleSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    const { start, end } = e.nativeEvent.selection;
    console.log('[SelectableText] handleSelectionChange', { start, end, hasSelection: start !== end });
    setSelection({ start, end });

    // テキストが選択されている場合は通知
    if (start !== end) {
      const selectedText = textRef.current.substring(start, end);
      console.log('[SelectableText] Selected text:', selectedText);

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
      console.log('[SelectableText] Selection cleared, calling onSelectionCleared');
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
      selectionColor="rgba(0, 122, 255, 0.2)" // 選択ハイライトの色（iOS標準の青）
      style={[
        style,
        {
          padding: 0,
          margin: 0,
          height: contentHeight,
        },
      ]}
      onSelectionChange={handleSelectionChange}
      selection={selection}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      onContentSizeChange={(e) => {
        setContentHeight(e.nativeEvent.contentSize.height);
      }}
      // 短いタップは親に伝播、長押しでテキスト選択
      delayLongPress={300}
    />
  );
}
