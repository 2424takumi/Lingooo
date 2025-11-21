/**
 * 検索履歴ストレージ（AsyncStorage版）
 *
 * 検索履歴の保存・取得・管理を行う
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SearchHistoryItem } from '@/types/search';
import { logger } from '@/utils/logger';

const STORAGE_KEY = '@lingooo_search_history';
const MAX_HISTORY_ITEMS = 50; // 最大保存件数

/**
 * 全ての履歴をローカルストレージから読み込む
 */
async function loadAllHistory(): Promise<SearchHistoryItem[]> {
  try {
    const jsonString = await AsyncStorage.getItem(STORAGE_KEY);
    if (!jsonString) {
      return [];
    }
    const history = JSON.parse(jsonString) as SearchHistoryItem[];
    return history;
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to load history:', error);
    return [];
  }
}

/**
 * 全ての履歴をローカルストレージに保存
 */
async function saveAllHistory(history: SearchHistoryItem[]): Promise<void> {
  try {
    const jsonString = JSON.stringify(history);
    await AsyncStorage.setItem(STORAGE_KEY, jsonString);
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to save history:', error);
    throw error;
  }
}

/**
 * 検索履歴を全件取得
 */
export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  try {
    const history = await loadAllHistory();
    return history.slice(0, MAX_HISTORY_ITEMS);
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to get search history:', error);
    return [];
  }
}

/**
 * 特定の言語の検索履歴を取得
 */
export async function getSearchHistoryByLanguage(language: string): Promise<SearchHistoryItem[]> {
  try {
    const history = await loadAllHistory();
    const filtered = history
      .filter(item => item.language === language)
      .slice(0, MAX_HISTORY_ITEMS);
    return filtered;
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to get search history by language:', error);
    return [];
  }
}

/**
 * 特定の言語の単語・フレーズ履歴を取得（翻訳を除外）
 */
export async function getWordHistoryByLanguage(language: string): Promise<SearchHistoryItem[]> {
  try {
    const history = await loadAllHistory();
    const filtered = history
      .filter(item =>
        item.language === language &&
        item.searchType &&
        ['word', 'phrase'].includes(item.searchType)
      )
      .slice(0, MAX_HISTORY_ITEMS);
    return filtered;
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to get word history by language:', error);
    return [];
  }
}

/**
 * 特定の言語の翻訳履歴を取得（長文翻訳のみ）
 */
export async function getTranslationHistoryByLanguage(language: string): Promise<SearchHistoryItem[]> {
  try {
    const history = await loadAllHistory();
    logger.debug('[SearchHistoryStorage] All history items:', {
      total: history.length,
      items: history.map(item => ({ query: item.query.substring(0, 30), lang: item.language, type: item.searchType }))
    });

    const filtered = history
      .filter(item =>
        item.language === language &&
        item.searchType === 'translation'
      )
      .slice(0, MAX_HISTORY_ITEMS);

    logger.debug('[SearchHistoryStorage] Filtered translation history:', {
      language,
      count: filtered.length,
      items: filtered.map(item => ({ query: item.query.substring(0, 30), type: item.searchType }))
    });

    return filtered;
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to get translation history by language:', error);
    return [];
  }
}

/**
 * 検索履歴を追加
 */
export async function addSearchHistory(
  query: string,
  language: string,
  aiResponse?: any,
  tokensUsed?: number,
  searchType?: 'word' | 'phrase' | 'translation'
): Promise<void> {
  try {
    // search_typeを推定（明示的に指定されていない場合のみ）
    const finalSearchType: 'word' | 'phrase' | 'translation' = searchType ||
      (query.length > 50 ? 'translation' : query.includes(' ') ? 'phrase' : 'word');

    const history = await loadAllHistory();

    // 新しい履歴アイテムを作成
    const newItem: SearchHistoryItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      query,
      language,
      timestamp: Date.now(),
      searchType: finalSearchType,
    };

    // 同じクエリと言語の履歴があれば削除（重複を避ける）
    const filteredHistory = history.filter(
      item => !(item.query === query && item.language === language)
    );

    // 新しいアイテムを先頭に追加
    const updatedHistory = [newItem, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);

    // 保存
    await saveAllHistory(updatedHistory);

    logger.info('[SearchHistoryStorage] Added search history:', {
      query,
      language,
      searchType: finalSearchType,
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
    await AsyncStorage.removeItem(STORAGE_KEY);
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
    const history = await loadAllHistory();
    const filtered = history.filter(item => item.id !== id);
    await saveAllHistory(filtered);
    logger.info('[SearchHistoryStorage] Removed search history item:', { id });
  } catch (error) {
    logger.error('[SearchHistoryStorage] Failed to remove search history item:', error);
    throw error;
  }
}
