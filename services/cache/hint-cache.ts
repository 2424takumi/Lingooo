/**
 * Hintテキストのローカルキャッシュ
 *
 * AsyncStorageベースで7日間のTTLを持つ。
 * 同じ単語のHintを2回目以降は即座に表示できる。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const CACHE_PREFIX = '@lingooo:hint:';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7日間

interface HintCacheEntry {
  text: string;
  timestamp: number;
}

function getCacheKey(word: string, targetLang: string, nativeLang: string): string {
  return `${CACHE_PREFIX}${word.trim().toLowerCase()}:${targetLang}:${nativeLang}`;
}

/**
 * キャッシュからHintテキストを取得
 */
export async function getCachedHint(
  word: string,
  targetLang: string,
  nativeLang: string
): Promise<string | null> {
  try {
    const key = getCacheKey(word, targetLang, nativeLang);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const entry: HintCacheEntry = JSON.parse(raw);

    if (Date.now() - entry.timestamp > CACHE_TTL) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    logger.debug('[HintCache] Hit:', { word, targetLang, nativeLang });
    return entry.text;
  } catch (error) {
    logger.error('[HintCache] Read error:', error);
    return null;
  }
}

/**
 * Hintテキストをキャッシュに保存
 */
export async function setCachedHint(
  word: string,
  targetLang: string,
  nativeLang: string,
  text: string
): Promise<void> {
  try {
    const key = getCacheKey(word, targetLang, nativeLang);
    const entry: HintCacheEntry = { text, timestamp: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    logger.debug('[HintCache] Saved:', { word, targetLang, nativeLang });
  } catch (error) {
    logger.error('[HintCache] Write error:', error);
  }
}
