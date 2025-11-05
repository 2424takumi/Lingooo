/**
 * 単語詳細データのメモリキャッシュ
 *
 * Pre-flight request用：検索結果をタップした瞬間にAPI呼び出しを開始し、
 * 詳細画面に遷移した時点で既にデータが準備できている状態を目指す
 */

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

// キャッシュの有効期限（5分）
const CACHE_TTL = 5 * 60 * 1000;

/**
 * キャッシュをクリア（古いエントリを削除）
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

/**
 * キャッシュからデータを取得
 *
 * @param word - 単語
 * @returns キャッシュされたデータ、または undefined
 */
export function getCachedWordDetail(word: string): WordDetailResponse | undefined {
  cleanupCache();

  const entry = cache.get(word);
  if (!entry) return undefined;

  // データが完了している場合は返す
  if (entry.data) {
    logger.debug('[Cache] HIT:', word);
    return entry.data;
  }

  logger.debug('[Cache] Pending:', word);
  return undefined;
}

/**
 * 実行中のPromiseを取得
 *
 * @param word - 単語
 * @returns 実行中のPromise、または undefined
 */
export function getPendingPromise(word: string): Promise<WordDetailResponse> | undefined {
  const entry = cache.get(word);
  return entry?.promise;
}

/**
 * Pre-flight request: API呼び出しを開始してキャッシュに保存
 *
 * @param word - 単語
 * @param fetchFn - データ取得関数
 */
export function prefetchWordDetail(
  word: string,
  fetchFn: () => Promise<WordDetailResponse>
): void {
  // 既にキャッシュされている場合はスキップ
  if (cache.has(word)) {
    logger.debug('[Cache] Already cached or pending:', word);
    return;
  }

  logger.debug('[Cache] PRE-FLIGHT STARTED:', word);

  // Promiseを開始してキャッシュに保存
  const promise = fetchFn();

  cache.set(word, {
    promise,
    timestamp: Date.now(),
  });

  // 完了したらデータをキャッシュに保存
  promise
    .then((data) => {
      logger.debug('[Cache] PRE-FLIGHT COMPLETED:', word);
      cache.set(word, {
        data,
        promise,
        timestamp: Date.now(),
      });
    })
    .catch((error) => {
      logger.error('[Cache] PRE-FLIGHT FAILED:', word, error);
      // エラーの場合はキャッシュから削除
      cache.delete(word);
    });
}

/**
 * キャッシュをクリア（テスト用）
 */
export function clearCache(): void {
  cache.clear();
  logger.debug('[Cache] Cleared');
}
