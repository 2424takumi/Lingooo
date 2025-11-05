import { useCallback, useMemo } from 'react';

import { useChatContext } from '@/contexts/chat-context';
import type { ChatRequestContext, ChatScope } from '@/types/chat';
import { logger } from '@/utils/logger';

interface UseChatSessionOptions {
  scope: ChatScope;
  identifier: string;
  context?: ChatRequestContext;
}

export function useChatSession({ scope, identifier, context }: UseChatSessionOptions) {
  const chat = useChatContext();

  const normalizedIdentifier = identifier.trim();
  const sessionKey = useMemo(
    () => ({ scope, identifier: normalizedIdentifier }),
    [scope, normalizedIdentifier]
  );

  const session = normalizedIdentifier ? chat.getSession(sessionKey) : null;

  const sendMessage = useCallback(
    async (text: string) => {
      logger.info('[useChatSession] sendMessage called:', { text, scope, identifier: normalizedIdentifier });

      if (!normalizedIdentifier || !text.trim()) {
        logger.warn('[useChatSession] Skipping: empty identifier or text');
        return;
      }

      logger.info('[useChatSession] Calling chat.sendMessage...');
      await chat.sendMessage({
        scope,
        identifier: normalizedIdentifier,
        text,
        context,
        streaming: true,
      });
      logger.info('[useChatSession] chat.sendMessage completed');
    },
    [chat, scope, normalizedIdentifier, context]
  );

  const sendQuickQuestion = useCallback(
    (question: string) => {
      return sendMessage(question);
    },
    [sendMessage]
  );

  const clearSession = useCallback(() => {
    if (!normalizedIdentifier) return;
    chat.clearSession(sessionKey);
  }, [chat, sessionKey, normalizedIdentifier]);

  return {
    messages: session?.messages ?? [],
    followUps: session?.followUps ?? [],
    isStreaming: session?.isStreaming ?? false,
    error: session?.error ?? null,
    sessionId: session?.sessionId ?? null,
    sendMessage,
    sendQuickQuestion,
    clearSession,
  };
}
