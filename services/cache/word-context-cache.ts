import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

/**
 * Word context cache entry structure
 */
interface WordContextCacheEntry {
  translation: string;
  partOfSpeech: string[];
  nuance: string;
  sourceLang: string;
  targetLang: string;
  cachedAt: number; // Unix timestamp
}

/**
 * Cache configuration
 */
const CACHE_PREFIX = 'wordcontext_';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a simple hash from a string
 * Used to create a short, consistent key from context text
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to base36 for shorter representation
  return Math.abs(hash).toString(36);
}

/**
 * Generate cache key for word context
 */
function getCacheKey(
  word: string,
  context: string,
  sourceLang: string,
  targetLang: string
): string {
  const contextHash = hashString(context);
  const normalizedWord = word.toLowerCase().trim();
  return `${CACHE_PREFIX}${normalizedWord}_${contextHash}_${sourceLang}_${targetLang}`;
}

/**
 * Get cached word context if available and not expired
 */
export async function getWordContextCache(
  word: string,
  context: string,
  sourceLang: string,
  targetLang: string
): Promise<WordContextCacheEntry | null> {
  try {
    const key = getCacheKey(word, context, sourceLang, targetLang);
    const cached = await AsyncStorage.getItem(key);

    if (!cached) {
      logger.debug('[WordContextCache] Cache miss for word:', word);
      return null;
    }

    const entry: WordContextCacheEntry = JSON.parse(cached);

    // Check if cache is expired
    const now = Date.now();
    if (now - entry.cachedAt > CACHE_EXPIRY_MS) {
      logger.info('[WordContextCache] Cache expired for word:', word);
      // Remove expired cache
      await AsyncStorage.removeItem(key);
      return null;
    }

    logger.info('[WordContextCache] Cache hit for word:', word, {
      age: Math.floor((now - entry.cachedAt) / 1000 / 60), // minutes
      contextHash: hashString(context).substring(0, 8),
    });

    return entry;
  } catch (error) {
    logger.error('[WordContextCache] Error reading cache:', error);
    return null;
  }
}

/**
 * Save word context to cache
 */
export async function setWordContextCache(
  word: string,
  context: string,
  sourceLang: string,
  targetLang: string,
  contextInfo: {
    translation: string;
    partOfSpeech: string[];
    nuance: string;
  }
): Promise<void> {
  try {
    const key = getCacheKey(word, context, sourceLang, targetLang);
    const entry: WordContextCacheEntry = {
      ...contextInfo,
      sourceLang,
      targetLang,
      cachedAt: Date.now(),
    };

    await AsyncStorage.setItem(key, JSON.stringify(entry));

    logger.info('[WordContextCache] Cached word context:', word, {
      contextHash: hashString(context).substring(0, 8),
      translationLength: contextInfo.translation.length,
      nuanceLength: contextInfo.nuance.length,
    });
  } catch (error) {
    logger.error('[WordContextCache] Error saving cache:', error);
    // Non-critical error, continue without caching
  }
}

/**
 * Clear all word context cache
 * Useful for debugging or when user wants to free up storage
 */
export async function clearWordContextCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));

    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      logger.info('[WordContextCache] Cleared all cache entries:', cacheKeys.length);
    }
  } catch (error) {
    logger.error('[WordContextCache] Error clearing cache:', error);
  }
}

/**
 * Clear expired cache entries
 * Can be called periodically to free up storage
 */
export async function clearExpiredWordContextCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    const now = Date.now();
    let expiredCount = 0;

    for (const key of cacheKeys) {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const entry: WordContextCacheEntry = JSON.parse(cached);
          if (now - entry.cachedAt > CACHE_EXPIRY_MS) {
            await AsyncStorage.removeItem(key);
            expiredCount++;
          }
        }
      } catch (error) {
        // Corrupted cache entry, remove it
        await AsyncStorage.removeItem(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.info('[WordContextCache] Cleared expired entries:', expiredCount);
    }
  } catch (error) {
    logger.error('[WordContextCache] Error clearing expired cache:', error);
  }
}
