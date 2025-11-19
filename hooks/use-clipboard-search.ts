/**
 * クリップボード監視フック
 *
 * PDFの仕様に基づいた実装:
 * 1. Clipboard.hasString()で事前チェック（iOS 14+の通知を回避）
 * 2. ユーザーに確認ダイアログを表示
 * 3. ユーザーが「貼り付け」を選択した場合のみClipboard.getString()で取得
 * 4. AppStateの変化を監視してフォアグラウンド復帰時にもチェック
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const LAST_CLIPBOARD_KEY = '@lingooo/lastClipboard';
const MAX_SEARCH_LENGTH = 500; // 検索可能な最大文字数
const MIN_SEARCH_LENGTH = 1; // 検索可能な最小文字数

interface UseClipboardSearchOptions {
  enabled?: boolean; // クリップボード監視を有効にするか
  onPaste?: (text: string) => void; // ペースト実行時のコールバック
}

interface ClipboardSearchResult {
  isChecking: boolean; // チェック中かどうか
}

export function useClipboardSearch(
  options: UseClipboardSearchOptions = {}
): ClipboardSearchResult {
  const { enabled = true, onPaste } = options;

  const [isChecking, setIsChecking] = useState(false);

  const lastCheckedText = useRef<string>('');
  const appState = useRef(AppState.currentState);
  const isPromptShowing = useRef(false); // ダイアログ表示中フラグ

  // onPasteをrefで保持して、useEffect依存配列から除外
  const onPasteRef = useRef(onPaste);

  // onPasteが変更されたら最新版をrefに保存
  useEffect(() => {
    onPasteRef.current = onPaste;
  }, [onPaste]);

  /**
   * クリップボードの内容が検索可能かチェック
   */
  const isValidSearchText = (text: string): boolean => {
    if (!text || typeof text !== 'string') return false;

    const trimmed = text.trim();

    // 長さチェック
    if (trimmed.length < MIN_SEARCH_LENGTH || trimmed.length > MAX_SEARCH_LENGTH) {
      return false;
    }

    // 特殊文字だけの場合は除外
    if (/^[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/.test(trimmed)) {
      return false;
    }

    return true;
  };

  /**
   * 確認ダイアログを表示してクリップボードから貼り付け
   */
  const checkClipboardAndPrompt = async () => {
    if (!enabled || isPromptShowing.current) return;

    try {
      setIsChecking(true);
      logger.info('[ClipboardSearch] Checking clipboard...');

      // 1. hasStringAsync()でクリップボードにテキストがあるかチェック
      //    iOS 14+では、この方法だと通知が表示されない
      const hasContent = await Clipboard.hasStringAsync();

      if (!hasContent) {
        logger.info('[ClipboardSearch] Clipboard is empty or no string content');
        setIsChecking(false);
        return;
      }

      // 実際のクリップボード内容を取得して有効性をチェック
      const clipboardText = await Clipboard.getStringAsync();
      const text = clipboardText?.trim() ?? '';

      // 内容が空の場合はスキップ
      if (!text) {
        logger.info('[ClipboardSearch] Clipboard content is empty');
        setIsChecking(false);
        return;
      }

      // 前回と同じ内容ならスキップ
      if (text === lastCheckedText.current) {
        logger.info('[ClipboardSearch] Same as last processed text, skipping');
        setIsChecking(false);
        return;
      }

      // 検索可能なテキストかチェック
      if (!isValidSearchText(text)) {
        logger.info('[ClipboardSearch] Invalid search text, skipping');
        setIsChecking(false);
        return;
      }

      // 2. 最後にダイアログを表示した時刻をチェック
      const lastPromptTime = await AsyncStorage.getItem('@lingooo/lastPromptTime');
      const now = Date.now();

      if (lastPromptTime) {
        const timeSinceLastPrompt = now - parseInt(lastPromptTime, 10);
        if (timeSinceLastPrompt < 3000) { // 3秒以内なら再表示しない
          logger.info('[ClipboardSearch] Prompt shown recently, skipping');
          setIsChecking(false);
          return;
        }
      }

      // ダイアログ表示中フラグを設定
      isPromptShowing.current = true;
      await AsyncStorage.setItem('@lingooo/lastPromptTime', now.toString());

      // 3. 確認ダイアログを表示
      Alert.alert(
        'クリップボードから貼り付け',
        `"${text.length > 50 ? text.substring(0, 50) + '...' : text}" を検索欄に貼り付けますか？`,
        [
          {
            text: 'キャンセル',
            style: 'cancel',
            onPress: () => {
              logger.info('[ClipboardSearch] User cancelled paste');
              // キャンセルした場合、次回も同じ内容で表示しないように記録
              lastCheckedText.current = text;
              isPromptShowing.current = false;
              setIsChecking(false);
            },
          },
          {
            text: '貼り付け',
            onPress: async () => {
              try {
                logger.info('[ClipboardSearch] User approved paste:', text.substring(0, 50));

                // テキスト入力に設定
                lastCheckedText.current = text;
                await AsyncStorage.setItem(LAST_CLIPBOARD_KEY, text);
                await AsyncStorage.setItem(`${LAST_CLIPBOARD_KEY}_time`, Date.now().toString());

                if (onPasteRef.current) {
                  onPasteRef.current(text);
                }

                isPromptShowing.current = false;
                setIsChecking(false);
              } catch (error) {
                logger.error('[ClipboardSearch] Error setting clipboard text:', error);
                isPromptShowing.current = false;
                setIsChecking(false);
              }
            },
          },
        ]
      );

      setIsChecking(false);
    } catch (error) {
      logger.error('[ClipboardSearch] Error checking clipboard:', error);
      isPromptShowing.current = false;
      setIsChecking(false);
    }
  };

  /**
   * AppStateの変化を監視
   */
  useEffect(() => {
    if (!enabled) return;

    // 初期化：前回処理したテキストをAsyncStorageから読み込む
    const initialize = async () => {
      try {
        const lastText = await AsyncStorage.getItem(LAST_CLIPBOARD_KEY);
        const lastTextTime = await AsyncStorage.getItem(`${LAST_CLIPBOARD_KEY}_time`);

        // 前回のテキストが24時間以内のものなら使用
        if (lastText && lastTextTime) {
          const timeSinceLastText = Date.now() - parseInt(lastTextTime, 10);
          if (timeSinceLastText < 24 * 60 * 60 * 1000) { // 24時間
            lastCheckedText.current = lastText;
            logger.info('[ClipboardSearch] Initialized with last text (within 24h):', lastText.substring(0, 50));
          } else {
            // 24時間以上経過している場合はクリア
            logger.info('[ClipboardSearch] Last text is too old, clearing');
            await AsyncStorage.removeItem(LAST_CLIPBOARD_KEY);
            await AsyncStorage.removeItem(`${LAST_CLIPBOARD_KEY}_time`);
          }
        }
      } catch (error) {
        logger.error('[ClipboardSearch] Error loading last text:', error);
      }

      // 初回マウント時もチェック
      checkClipboardAndPrompt();
    };

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // バックグラウンド → フォアグラウンドに移行したときにチェック
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        logger.info('[ClipboardSearch] App became active, checking clipboard');
        checkClipboardAndPrompt();
      }

      appState.current = nextAppState;
    });

    initialize();

    return () => {
      subscription.remove();
    };
  }, [enabled]); // onPasteを依存配列から削除（refで管理）

  return {
    isChecking,
  };
}
