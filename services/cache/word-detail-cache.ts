/**
 * 単語詳細データのキャッシュ（メモリ + AsyncStorage永続化）
 *
 * - メモリキャッシュ: 5分TTL（Pre-flight用、高速アクセス）
 * - AsyncStorageキャッシュ: 7日TTL（アプリ再起動後も即表示）
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WordDetailResponse } from '@/types/search';
import { logger } from '@/utils/logger';

// キャッシュエントリの型
interface CacheEntry {
  data?: WordDetailResponse;  // 完了したデータ
  promise?: Promise<WordDetailResponse>;  // 実行中のPromise
  timestamp: number;  // キャッシュした時刻
}

// メモリキャッシュ（単語 → データ）
const cache = new Map<string, CacheEntry>();

// メモリキャッシュの有効期限（5分）
const MEMORY_CACHE_TTL = 5 * 60 * 1000;

// AsyncStorageキャッシュの有効期限（7日）
const STORAGE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = '@lingooo:word_detail:';

interface StorageCacheEntry {
  data: WordDetailResponse;
  timestamp: number;
}

/**
 * キャッシュをクリア（古いエントリを削除）
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > MEMORY_CACHE_TTL) {
      cache.delete(key);
    }
  }
}

/**
 * メモリキャッシュからデータを取得
 */
export function getCachedWordDetail(word: string): WordDetailResponse | undefined {
  cleanupCache();

  const entry = cache.get(word);
  if (!entry) return undefined;

  if (entry.data) {
    logger.debug('[Cache] HIT:', word);
    return entry.data;
  }

  logger.debug('[Cache] Pending:', word);
  return undefined;
}

/**
 * AsyncStorageから永続キャッシュを取得
 */
export async function getCachedWordDetailAsync(word: string): Promise<WordDetailResponse | undefined> {
  // まずメモリキャッシュを確認
  const memCached = getCachedWordDetail(word);
  if (memCached) return memCached;

  // AsyncStorageを確認
  try {
    const key = `${STORAGE_PREFIX}${word.trim().toLowerCase()}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return undefined;

    const entry: StorageCacheEntry = JSON.parse(raw);

    if (Date.now() - entry.timestamp > STORAGE_CACHE_TTL) {
      await AsyncStorage.removeItem(key);
      return undefined;
    }

    logger.debug('[Cache] AsyncStorage HIT:', word);
    // メモリキャッシュにも復元
    cache.set(word, { data: entry.data, timestamp: Date.now() });
    return entry.data;
  } catch (error) {
    logger.error('[Cache] AsyncStorage read error:', error);
    return undefined;
  }
}

/**
 * AsyncStorageに永続キャッシュとして保存
 */
async function persistToStorage(word: string, data: WordDetailResponse): Promise<void> {
  try {
    const key = `${STORAGE_PREFIX}${word.trim().toLowerCase()}`;
    const entry: StorageCacheEntry = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    logger.debug('[Cache] Persisted to AsyncStorage:', word);
  } catch (error) {
    logger.error('[Cache] AsyncStorage write error:', error);
  }
}

/**
 * 実行中のPromiseを取得
 */
export function getPendingPromise(word: string): Promise<WordDetailResponse> | undefined {
  const entry = cache.get(word);
  return entry?.promise;
}

/**
 * Pre-flight request: API呼び出しを開始してキャッシュに保存
 */
export function prefetchWordDetail(
  word: string,
  fetchFn: (onProgress?: (progress: number, partialData?: Partial<WordDetailResponse>) => void) => Promise<{ data: WordDetailResponse; tokensUsed: number }>
): void {
  if (cache.has(word)) {
    logger.debug('[Cache] Already cached or pending:', word);
    return;
  }

  logger.debug('[Cache] PRE-FLIGHT STARTED (2-stage):', word);

  const promise = fetchFn((progress, partialData) => {
    if (progress >= 30 && partialData && partialData.headword) {
      logger.debug('[Cache] PRE-FLIGHT basic info ready:', word, progress);
      const currentEntry = cache.get(word);
      if (currentEntry) {
        cache.set(word, {
          ...currentEntry,
          data: partialData as WordDetailResponse,
          timestamp: Date.now(),
        });
      }
    }
  }).then(result => result.data);

  cache.set(word, {
    promise,
    timestamp: Date.now(),
  });

  promise
    .then((data) => {
      logger.debug('[Cache] PRE-FLIGHT COMPLETED (full data):', word);
      cache.set(word, {
        data,
        promise,
        timestamp: Date.now(),
      });
      // 完了データをAsyncStorageに永続化
      persistToStorage(word, data);
    })
    .catch((error) => {
      logger.error('[Cache] PRE-FLIGHT FAILED:', word, error);
      cache.delete(word);
    });
}

/**
 * データをキャッシュに保存（メモリ + AsyncStorage）
 */
export function setCachedWordDetail(word: string, data: WordDetailResponse): void {
  cache.set(word, { data, timestamp: Date.now() });
  persistToStorage(word, data);
}

/**
 * キャッシュをクリア（テスト用）
 */
export function clearCache(): void {
  cache.clear();
  logger.debug('[Cache] Cleared');
}
