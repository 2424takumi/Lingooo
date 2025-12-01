import { useCallback, useMemo } from 'react';

import { useChatContext } from '@/contexts/chat-context';
import { useAISettings } from '@/contexts/ai-settings-context';
import { useLearningLanguages } from '@/contexts/learning-languages-context';
import type { ChatRequestContext, ChatScope } from '@/types/chat';
import { logger } from '@/utils/logger';

interface UseChatSessionOptions {
  scope: ChatScope;
  identifier: string;
  context?: ChatRequestContext;
  targetLanguage?: string;
}

export function useChatSession({ scope, identifier, context, targetLanguage }: UseChatSessionOptions) {
  const chat = useChatContext();
  const { aiDetailLevel } = useAISettings();
  const { nativeLanguage } = useLearningLanguages();

  const normalizedIdentifier = identifier.trim();
  const sessionKey = useMemo(
    () => ({ scope, identifier: normalizedIdentifier }),
    [scope, normalizedIdentifier]
  );

  const session = normalizedIdentifier ? chat.getSession(sessionKey) : null;

  const sendMessage = useCallback(
    async (text: string, displayText?: string) => {
      logger.info('[useChatSession] sendMessage called:', {
        text,
        displayText,
        scope,
        identifier: normalizedIdentifier,
        detailLevel: aiDetailLevel,
        targetLanguage,
        nativeLanguage: nativeLanguage.code,
      });

      if (!normalizedIdentifier || !text.trim()) {
        logger.warn('[useChatSession] Skipping: empty identifier or text');
        return;
      }

      logger.info('[useChatSession] Calling chat.sendMessage...');
      await chat.sendMessage({
        scope,
        identifier: normalizedIdentifier,
        text,
        displayText,
        context,
        streaming: true,
        detailLevel: aiDetailLevel,
        targetLanguage,
        nativeLanguage: nativeLanguage.code,
      });
      logger.info('[useChatSession] chat.sendMessage completed');
    },
    [chat, scope, normalizedIdentifier, context, aiDetailLevel, targetLanguage, nativeLanguage]
  );

  const sendQuickQuestion = useCallback(
    (question: string, displayQuestion?: string) => {
      return sendMessage(question, displayQuestion);
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
