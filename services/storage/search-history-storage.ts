/**
 * 検索履歴ストレージ
 *
 * 検索履歴の保存・取得・管理を行う
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SearchHistoryItem } from '@/types/search';
import { logger } from '@/utils/logger';

const SEARCH_HISTORY_KEY = '@lingooo:search_history';
const MAX_HISTORY_ITEMS = 50; // 最大保存件数

/**
 * 検索履歴を全件取得
 */
export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  try {
    const jsonString = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    if (!jsonString) {
      return [];
    }

    const history = JSON.parse(jsonString) as SearchHistoryItem[];
    // 新しい順にソート
    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to load search history:', error);
    return [];
  }
}

/**
 * 特定の言語の検索履歴を取得
 */
export async function getSearchHistoryByLanguage(language: string): Promise<SearchHistoryItem[]> {
  const allHistory = await getSearchHistory();
  return allHistory.filter((item) => item.language === language);
}

/**
 * 検索履歴を追加または更新
 * - 同じ query と language の組み合わせが存在する場合は timestamp を更新
 * - 存在しない場合は新規追加
 * - 最大件数を超えた場合は古いものから削除
 */
export async function addSearchHistory(query: string, language: string): Promise<void> {
  try {
    const history = await getSearchHistory();

    // 同じ query と language の既存アイテムを探す
    const existingIndex = history.findIndex(
      (item) => item.query === query && item.language === language
    );

    if (existingIndex !== -1) {
      // 既存アイテムの timestamp を更新
      history[existingIndex].timestamp = Date.now();
    } else {
      // 新規アイテムを追加
      const newItem: SearchHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        query,
        language,
        timestamp: Date.now(),
      };
      history.push(newItem);
    }

    // 新しい順にソートして最大件数まで保持
    const sortedHistory = history
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_HISTORY_ITEMS);

    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(sortedHistory));

    logger.info('[SearchHistoryStorage] Added search history:', {
      query,
      language,
      totalCount: sortedHistory.length,
    });
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to add search history:', error);
    throw error;
  }
}

/**
 * 検索履歴を全削除
 */
export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    logger.info('[SearchHistoryStorage] Cleared all search history');
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to clear search history:', error);
    throw error;
  }
}

/**
 * 特定の履歴アイテムを削除
 */
export async function removeSearchHistoryItem(id: string): Promise<void> {
  try {
    const history = await getSearchHistory();
    const filteredHistory = history.filter((item) => item.id !== id);
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filteredHistory));

    logger.info('[SearchHistoryStorage] Removed search history item:', { id });
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to remove search history item:', error);
    throw error;
  }
}
