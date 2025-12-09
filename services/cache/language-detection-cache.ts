/**
 * 言語判定キャッシュサービス
 *
 * AI言語判定の結果をキャッシュして、非決定性を防止し、パフォーマンスを向上させます。
 * キャッシュTTL: 7日間（単語の言語は変わらないため）
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const CACHE_PREFIX = 'lang_detect_';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7日間 (ミリ秒)

interface LanguageDetectionCache {
  language: string;
  confidence: number;
  timestamp: number;
  provider?: string;
}

/**
 * キャッシュから言語判定結果を取得
 *
 * @param word - 検索単語
 * @returns キャッシュされた言語コード、またはnull（キャッシュミス/期限切れ）
 */
export async function getCachedLanguage(word: string): Promise<string | null> {
  try {
    const normalizedWord = word.trim().toLowerCase();
    const cacheKey = `${CACHE_PREFIX}${normalizedWord}`;

    const cachedData = await AsyncStorage.getItem(cacheKey);

    if (!cachedData) {
      logger.info('[LangDetectCache] Cache miss:', { word: normalizedWord });
      return null;
    }

    const cache: LanguageDetectionCache = JSON.parse(cachedData);

    // TTLチェック
    const now = Date.now();
    const age = now - cache.timestamp;

    if (age > CACHE_TTL) {
      logger.info('[LangDetectCache] Cache expired:', {
        word: normalizedWord,
        age: Math.round(age / 1000 / 60 / 60), // 時間単位
        ttl: CACHE_TTL / 1000 / 60 / 60,
      });
      // 期限切れのキャッシュを削除
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    logger.info('[LangDetectCache] Cache hit:', {
      word: normalizedWord,
      language: cache.language,
      confidence: cache.confidence,
      provider: cache.provider,
      age: Math.round(age / 1000 / 60), // 分単位
    });

    return cache.language;
  } catch (error) {
    logger.error('[LangDetectCache] Error reading cache:', error);
    return null;
  }
}

/**
 * 言語判定結果をキャッシュに保存
 *
 * @param word - 検索単語
 * @param language - 判定された言語コード
 * @param confidence - 信頼度（0-1）
 * @param provider - AI プロバイダー名（オプション）
 */
export async function setCachedLanguage(
  word: string,
  language: string,
  confidence: number,
  provider?: string
): Promise<void> {
  try {
    const normalizedWord = word.trim().toLowerCase();
    const cacheKey = `${CACHE_PREFIX}${normalizedWord}`;

    const cache: LanguageDetectionCache = {
      language,
      confidence,
      timestamp: Date.now(),
      provider,
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));

    logger.info('[LangDetectCache] Cache saved:', {
      word: normalizedWord,
      language,
      confidence,
      provider,
    });
  } catch (error) {
    logger.error('[LangDetectCache] Error saving cache:', error);
    // キャッシュ保存失敗は致命的ではないので、エラーを投げずに続行
  }
}

/**
 * 言語判定キャッシュをクリア
 *
 * @param word - 特定の単語のキャッシュをクリア（省略時は全キャッシュをクリア）
 */
export async function clearLanguageCache(word?: string): Promise<void> {
  try {
    if (word) {
      // 特定の単語のキャッシュのみクリア
      const normalizedWord = word.trim().toLowerCase();
      const cacheKey = `${CACHE_PREFIX}${normalizedWord}`;
      await AsyncStorage.removeItem(cacheKey);
      logger.info('[LangDetectCache] Cache cleared for word:', normalizedWord);
    } else {
      // 全言語判定キャッシュをクリア
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      logger.info('[LangDetectCache] All cache cleared:', { count: cacheKeys.length });
    }
  } catch (error) {
    logger.error('[LangDetectCache] Error clearing cache:', error);
  }
}

/**
 * キャッシュ統計情報を取得（デバッグ用）
 *
 * @returns キャッシュエントリ数と合計サイズ
 */
export async function getCacheStats(): Promise<{
  count: number;
  totalSize: number;
}> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));

    let totalSize = 0;
    for (const key of cacheKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    }

    return {
      count: cacheKeys.length,
      totalSize,
    };
  } catch (error) {
    logger.error('[LangDetectCache] Error getting cache stats:', error);
    return { count: 0, totalSize: 0 };
  }
}
