import type { SuggestionItem } from '@/types/search';
import { normalizeQuery } from '@/services/utils/language-detect';
import { logger } from '@/utils/logger';

type SuggestionListener = (items: SuggestionItem[]) => void;

interface CacheEntry {
  items: SuggestionItem[];
  timestamp: number;
}

const suggestionCache = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<SuggestionListener>>();
const CACHE_TTL = 5 * 60 * 1000;

function toKey(query: string): string {
  return normalizeQuery(query);
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

export function getCachedSuggestions(query: string): SuggestionItem[] | undefined {
  cleanup();
  const key = toKey(query);
  const entry = suggestionCache.get(key);
  return entry?.items;
}

export function setCachedSuggestions(query: string, items: SuggestionItem[]): void {
  const key = toKey(query);
  suggestionCache.set(key, {
    items,
    timestamp: Date.now(),
  });

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

export function subscribeSuggestions(query: string, listener: SuggestionListener): () => void {
  const key = toKey(query);
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
