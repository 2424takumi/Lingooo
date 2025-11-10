/**
 * クリップボード監視フック
 *
 * アプリがフォアグラウンドになったときにクリップボードをチェックし、
 * 新しいテキストがあれば自動的に検索を実行する
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const LAST_CLIPBOARD_KEY = '@lingooo/lastClipboard';
const MAX_SEARCH_LENGTH = 100; // 検索可能な最大文字数
const MIN_SEARCH_LENGTH = 1; // 検索可能な最小文字数

interface UseClipboardSearchOptions {
  enabled?: boolean; // クリップボード監視を有効にするか
  onSearch?: (text: string) => void; // 検索実行時のコールバック
  autoSearch?: boolean; // 自動検索を有効にするか（falseの場合は通知のみ）
}

interface ClipboardSearchResult {
  clipboardText: string | null; // 現在のクリップボードテキスト
  shouldSearch: boolean; // 検索すべきかどうか
  isChecking: boolean; // チェック中かどうか
  clearClipboard: () => Promise<void>; // クリップボードをクリア
}

export function useClipboardSearch(
  options: UseClipboardSearchOptions = {}
): ClipboardSearchResult {
  const { enabled = true, onSearch, autoSearch = true } = options;

  const [clipboardText, setClipboardText] = useState<string | null>(null);
  const [shouldSearch, setShouldSearch] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const lastCheckedText = useRef<string>('');
  const appState = useRef(AppState.currentState);

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

    // URLや複数行テキストは除外
    if (trimmed.includes('http://') || trimmed.includes('https://')) {
      return false;
    }
    if (trimmed.includes('\n')) {
      return false;
    }

    // 特殊文字だけの場合は除外
    if (/^[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/.test(trimmed)) {
      return false;
    }

    return true;
  };

  /**
   * クリップボードをチェックして検索を実行
   */
  const checkClipboard = async () => {
    if (!enabled) return;

    try {
      setIsChecking(true);
      logger.info('[ClipboardSearch] Checking clipboard...');

      // クリップボードから取得
      const text = await Clipboard.getStringAsync();

      if (!text) {
        logger.info('[ClipboardSearch] Clipboard is empty');
        setIsChecking(false);
        return;
      }

      // 前回チェックした内容と同じなら何もしない
      if (text === lastCheckedText.current) {
        logger.info('[ClipboardSearch] Same as last check, skipping');
        setIsChecking(false);
        return;
      }

      // AsyncStorageから前回保存した内容を取得
      const lastSavedText = await AsyncStorage.getItem(LAST_CLIPBOARD_KEY);
      if (text === lastSavedText) {
        logger.info('[ClipboardSearch] Already processed this clipboard content');
        lastCheckedText.current = text;
        setIsChecking(false);
        return;
      }

      // 検索可能なテキストかチェック
      if (!isValidSearchText(text)) {
        logger.info('[ClipboardSearch] Invalid search text', { text: text.substring(0, 50) });
        lastCheckedText.current = text;
        await AsyncStorage.setItem(LAST_CLIPBOARD_KEY, text);
        setIsChecking(false);
        return;
      }

      // 検索実行
      logger.info('[ClipboardSearch] New valid text found:', { text: text.substring(0, 50) });
      setClipboardText(text.trim());
      setShouldSearch(true);

      // 保存して次回スキップ
      lastCheckedText.current = text;
      await AsyncStorage.setItem(LAST_CLIPBOARD_KEY, text);

      // 自動検索が有効な場合はコールバック実行
      if (autoSearch && onSearch) {
        onSearch(text.trim());
      }

      setIsChecking(false);
    } catch (error) {
      logger.error('[ClipboardSearch] Error checking clipboard:', error);
      setIsChecking(false);
    }
  };

  /**
   * クリップボードをクリア（ユーザーが明示的に閉じた場合）
   */
  const clearClipboard = async () => {
    setClipboardText(null);
    setShouldSearch(false);
  };

  /**
   * AppStateの変化を監視
   */
  useEffect(() => {
    if (!enabled) return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // バックグラウンド → フォアグラウンドに移行したときにチェック
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        logger.info('[ClipboardSearch] App became active, checking clipboard');
        checkClipboard();
      }

      appState.current = nextAppState;
    });

    // 初回マウント時もチェック
    checkClipboard();

    return () => {
      subscription.remove();
    };
  }, [enabled, autoSearch, onSearch]);

  return {
    clipboardText,
    shouldSearch,
    isChecking,
    clearClipboard,
  };
}
