import type { ChatMessage, ChatSessionKey, ChatSessionState } from '@/types/chat';

interface CacheEntry {
  sessionId: string;
  messages: ChatMessage[];
  followUps: string[];
  updatedAt: number;
}

const chatCache = new Map<string, CacheEntry>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_MESSAGES = 10; // user + assistant の5往復分

function toKey({ scope, identifier }: ChatSessionKey): string {
  return `${scope}:${identifier.toLowerCase()}`;
}

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of chatCache.entries()) {
    if (now - entry.updatedAt > CACHE_TTL) {
      chatCache.delete(key);
    }
  }
}

function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_MESSAGES) {
    return messages;
  }
  return messages.slice(messages.length - MAX_MESSAGES);
}

export function getChatSession(key: ChatSessionKey): ChatSessionState | undefined {
  cleanup();
  const cacheKey = toKey(key);
  const entry = chatCache.get(cacheKey);
  if (!entry) {
    return undefined;
  }

  return {
    key,
    sessionId: entry.sessionId,
    messages: entry.messages,
    followUps: entry.followUps,
    isStreaming: false,
    error: null,
  };
}

export function setChatSession(
  key: ChatSessionKey,
  messages: ChatMessage[],
  followUps: string[] = [],
  sessionId?: string
): void {
  const cacheKey = toKey(key);
  const nextSessionId = sessionId ?? chatCache.get(cacheKey)?.sessionId ?? `session-${Date.now()}`;
  chatCache.set(cacheKey, {
    sessionId: nextSessionId,
    messages: trimMessages(messages),
    followUps,
    updatedAt: Date.now(),
  });
}

export function appendChatMessage(
  key: ChatSessionKey,
  message: ChatMessage,
  followUps?: string[]
): void {
  const cacheKey = toKey(key);
  const entry = chatCache.get(cacheKey);
  const messages = entry ? [...entry.messages, message] : [message];

  chatCache.set(cacheKey, {
    sessionId: entry?.sessionId ?? `session-${Date.now()}`,
    messages: trimMessages(messages),
    followUps: followUps ?? entry?.followUps ?? [],
    updatedAt: Date.now(),
  });
}

export function clearChatSession(key: ChatSessionKey): void {
  const cacheKey = toKey(key);
  chatCache.delete(cacheKey);
}

export function clearChatCache(): void {
  chatCache.clear();
}
