import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SuggestionItem } from '@/types/search';
import { normalizeQuery } from '@/services/utils/language-detect';
import { logger } from '@/utils/logger';

type SuggestionListener = (items: SuggestionItem[]) => void;

interface CacheEntry {
  items: SuggestionItem[];
  timestamp: number;
}

// In-memory cache for fast access
const suggestionCache = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<SuggestionListener>>();

// 🚀 PERSISTENCE OPTIMIZATION: Increased TTL from 5 minutes to 7 days
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// AsyncStorage key prefix for suggestions cache
const STORAGE_PREFIX = '@lingooo:suggestions:';

function toKey(query: string, languageCode: string = 'en'): string {
  return `${normalizeQuery(query)}:${languageCode}`;
}

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of suggestionCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      suggestionCache.delete(key);
      listeners.delete(key); // listenersも削除してメモリリークを防ぐ
    }
  }
}

/**
 * Get cached suggestions (checks in-memory cache first, then AsyncStorage)
 *
 * 🚀 OPTIMIZATION: Hybrid cache strategy for maximum performance
 */
export async function getCachedSuggestions(query: string, languageCode: string = 'en'): Promise<SuggestionItem[] | undefined> {
  cleanup();
  const key = toKey(query, languageCode);

  // Fast path: Check in-memory cache first
  const memoryEntry = suggestionCache.get(key);
  if (memoryEntry) {
    logger.debug('[SuggestionCache] Cache hit (memory):', key);
    return memoryEntry.items;
  }

  // Slow path: Check AsyncStorage
  try {
    const storageKey = STORAGE_PREFIX + key;
    const stored = await AsyncStorage.getItem(storageKey);
    if (stored) {
      const entry: CacheEntry = JSON.parse(stored);

      // Check if still valid
      const now = Date.now();
      if (now - entry.timestamp <= CACHE_TTL) {
        logger.debug('[SuggestionCache] Cache hit (AsyncStorage):', key);
        // Restore to in-memory cache for faster future access
        suggestionCache.set(key, entry);
        return entry.items;
      } else {
        // Expired, remove from AsyncStorage
        logger.debug('[SuggestionCache] Cache expired (AsyncStorage):', key);
        await AsyncStorage.removeItem(storageKey);
      }
    }
  } catch (error) {
    logger.error('[SuggestionCache] Error reading from AsyncStorage:', error);
  }

  return undefined;
}

/**
 * Synchronous version for backward compatibility (only checks in-memory)
 * @deprecated Use async getCachedSuggestions instead for full persistence support
 */
export function getCachedSuggestionsSync(query: string, languageCode: string = 'en'): SuggestionItem[] | undefined {
  cleanup();
  const key = toKey(query, languageCode);
  const entry = suggestionCache.get(key);
  return entry?.items;
}

/**
 * Set cached suggestions (saves to both in-memory and AsyncStorage)
 *
 * 🚀 OPTIMIZATION: Dual-write for performance + persistence
 */
export function setCachedSuggestions(query: string, items: SuggestionItem[], languageCode: string = 'en'): void {
  const key = toKey(query, languageCode);
  const entry: CacheEntry = {
    items,
    timestamp: Date.now(),
  };

  // Write to in-memory cache (instant)
  suggestionCache.set(key, entry);

  // Write to AsyncStorage (background, fire-and-forget)
  const storageKey = STORAGE_PREFIX + key;
  AsyncStorage.setItem(storageKey, JSON.stringify(entry)).catch((error) => {
    logger.error('[SuggestionCache] Error writing to AsyncStorage:', error);
  });

  // Notify listeners
  const subs = listeners.get(key);
  if (!subs) {
    return;
  }

  for (const listener of subs) {
    try {
      listener(items);
    } catch (error) {
      logger.error('[SuggestionCache] Listener error', error);
    }
  }
}

/**
 * Set cached suggestions with await support for AsyncStorage persistence
 *
 * Use this when you need to ensure data is persisted before continuing
 */
export async function setCachedSuggestionsAsync(query: string, items: SuggestionItem[], languageCode: string = 'en'): Promise<void> {
  const key = toKey(query, languageCode);
  const entry: CacheEntry = {
    items,
    timestamp: Date.now(),
  };

  // Write to in-memory cache (instant)
  suggestionCache.set(key, entry);

  // Write to AsyncStorage (await completion)
  const storageKey = STORAGE_PREFIX + key;
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
    logger.debug('[SuggestionCache] Persisted to AsyncStorage:', key);
  } catch (error) {
    logger.error('[SuggestionCache] Error writing to AsyncStorage:', error);
  }

  // Notify listeners
  const subs = listeners.get(key);
  if (!subs) {
    return;
  }

  for (const listener of subs) {
    try {
      listener(items);
    } catch (error) {
      logger.error('[SuggestionCache] Listener error', error);
    }
  }
}

export function subscribeSuggestions(query: string, listener: SuggestionListener, languageCode: string = 'en'): () => void {
  const key = toKey(query, languageCode);
  const current = listeners.get(key) ?? new Set<SuggestionListener>();
  current.add(listener);
  listeners.set(key, current);

  return () => {
    const target = listeners.get(key);
    if (!target) {
      return;
    }
    target.delete(listener);
    if (target.size === 0) {
      listeners.delete(key);
    }
  };
}

export function clearSuggestionCache(): void {
  suggestionCache.clear();
  listeners.clear();
}
