import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';
import type { TranslateResponse } from '@/services/api/translate';

interface CacheEntry {
  result: TranslateResponse;
  timestamp: number;
}

// In-memory cache for fast access
const translateCache = new Map<string, CacheEntry>();

// Cache TTL: 7 days (same as suggestion cache)
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

// AsyncStorage key prefix for translation cache
const STORAGE_PREFIX = '@lingooo:translate:';

/**
 * Generate cache key from text and language pair
 */
function toKey(text: string, sourceLang: string, targetLang: string): string {
  // Normalize text (trim and lowercase for consistency)
  const normalizedText = text.trim().toLowerCase();
  return `${normalizedText}:${sourceLang}:${targetLang}`;
}

/**
 * Cleanup expired cache entries
 */
function cleanup() {
  const now = Date.now();
  for (const [key, entry] of translateCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      translateCache.delete(key);
    }
  }
}

/**
 * Get cached translation (checks in-memory cache first, then AsyncStorage)
 */
export async function getCachedTranslation(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslateResponse | undefined> {
  cleanup();
  const key = toKey(text, sourceLang, targetLang);

  // Fast path: Check in-memory cache first
  const memoryEntry = translateCache.get(key);
  if (memoryEntry) {
    logger.debug('[TranslateCache] Cache hit (memory):', key);
    return memoryEntry.result;
  }

  // Slow path: Check AsyncStorage
  try {
    const storageKey = `${STORAGE_PREFIX}${key}`;
    const stored = await AsyncStorage.getItem(storageKey);
    if (stored) {
      const entry: CacheEntry = JSON.parse(stored);
      const now = Date.now();

      // Check if expired
      if (now - entry.timestamp > CACHE_TTL) {
        logger.debug('[TranslateCache] Cache expired (storage):', key);
        await AsyncStorage.removeItem(storageKey);
        return undefined;
      }

      // Restore to memory cache
      translateCache.set(key, entry);
      logger.debug('[TranslateCache] Cache hit (storage):', key);
      return entry.result;
    }
  } catch (error) {
    logger.error('[TranslateCache] Failed to read from AsyncStorage:', error);
  }

  return undefined;
}

/**
 * Save translation to cache (both memory and AsyncStorage)
 */
export async function setCachedTranslation(
  text: string,
  sourceLang: string,
  targetLang: string,
  result: TranslateResponse
): Promise<void> {
  const key = toKey(text, sourceLang, targetLang);
  const entry: CacheEntry = {
    result,
    timestamp: Date.now(),
  };

  // Save to memory cache
  translateCache.set(key, entry);
  logger.debug('[TranslateCache] Saved to memory cache:', key);

  // Save to AsyncStorage (persistent)
  try {
    const storageKey = `${STORAGE_PREFIX}${key}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
    logger.debug('[TranslateCache] Saved to storage:', key);
  } catch (error) {
    logger.error('[TranslateCache] Failed to save to AsyncStorage:', error);
  }
}

/**
 * Clear all translation cache
 */
export async function clearTranslateCache(): Promise<void> {
  translateCache.clear();

  try {
    const keys = await AsyncStorage.getAllKeys();
    const translateKeys = keys.filter(key => key.startsWith(STORAGE_PREFIX));
    if (translateKeys.length > 0) {
      await AsyncStorage.multiRemove(translateKeys);
      logger.info('[TranslateCache] Cleared all cache:', translateKeys.length, 'entries');
    }
  } catch (error) {
    logger.error('[TranslateCache] Failed to clear AsyncStorage:', error);
  }
}
