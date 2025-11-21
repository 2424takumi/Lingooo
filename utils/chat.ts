import type { ChatMessage, QAPair, QAPairStatus } from '@/types/chat';
import { logger } from '@/utils/logger';

interface ToQAPairsOptions {
  fallbackError?: string | null;
}

function normalizeStatus(status?: string): QAPairStatus {
  if (status === 'error') {
    return 'error';
  }
  if (status === 'streaming' || status === 'pending') {
    return 'pending';
  }
  return 'completed';
}

/**
 * Convert ordered chat messages into Q&A card pairs.
 * Invalid or empty utterances are skipped defensively.
 */
export function toQAPairs(
  messages: ChatMessage[],
  { fallbackError }: ToQAPairsOptions = {}
): QAPair[] {
  logger.info('[toQAPairs] Converting messages to QA pairs:', {
    messageCount: messages.length,
    messages: messages.map(m => ({ role: m.role, content: m.content?.substring(0, 50), status: m.status }))
  });

  const pairs: QAPair[] = [];
  let pendingUser: ChatMessage | null = null;

  for (const message of messages) {
    if (message.role === 'system') {
      continue;
    }

    if (message.role === 'user') {
      pendingUser = message;
      continue;
    }

    if (message.role === 'assistant' && pendingUser) {
      const status = normalizeStatus(message.status);
      const answerText = message.content?.trim() ?? '';

      pairs.push({
        id: `qa-${pendingUser.id}`,
        q: pendingUser.displayContent?.trim() || pendingUser.content?.trim() || '', // displayContentを優先
        a: answerText.length > 0 ? answerText : undefined,
        status,
        errorMessage: status === 'error' ? message.error ?? fallbackError ?? undefined : undefined,
      });

      pendingUser = null;
    }
  }

  if (pendingUser) {
    const status: QAPairStatus = fallbackError ? 'error' : 'pending';

    pairs.push({
      id: `qa-${pendingUser.id}`,
      q: pendingUser.displayContent?.trim() || pendingUser.content?.trim() || '', // displayContentを優先
      status,
      errorMessage: status === 'error' ? fallbackError ?? undefined : undefined,
    });
  }

  const filteredPairs = pairs.filter((pair) => pair.q);
  logger.info('[toQAPairs] Result:', {
    pairCount: filteredPairs.length,
    pairs: filteredPairs.map(p => ({ q: p.q?.substring(0, 30), a: p.a?.substring(0, 30), status: p.status }))
  });

  return filteredPairs;
}
