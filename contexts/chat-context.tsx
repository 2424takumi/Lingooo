import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import { clearChatSession, getChatSession, setChatSession } from '@/services/cache/chat-cache';
import { sendChatMessage, sendChatMessageStream, sendChatMessageStreamWebSocket } from '@/services/api/chat';
import type {
  ChatMessage,
  ChatRequestContext,
  ChatScope,
  ChatSessionKey,
  ChatSessionState,
} from '@/types/chat';
import { generateId } from '@/utils/id';
import { logger } from '@/utils/logger';

/**
 * WebSocketストリーミングの有効化フラグ
 *
 * true: WebSocketを使用（低レイテンシ、リアルタイム）
 * false: XHRポーリングを使用（安定性重視）
 */
const USE_WEBSOCKET_STREAMING = false;

interface ChatContextValue {
  getSession: (key: ChatSessionKey) => ChatSessionState;
  sendMessage: (
    params: {
      scope: ChatScope;
      identifier: string;
      text: string;
      context?: ChatRequestContext;
      streaming?: boolean;
      detailLevel?: 'concise' | 'detailed';
      targetLanguage?: string;
    }
  ) => Promise<void>;
  clearSession: (key: ChatSessionKey) => void;
}

type SessionsState = Record<string, ChatSessionState>;

type SessionAction =
  | { type: 'UPSERT'; key: string; session: ChatSessionState }
  | { type: 'CLEAR'; key: string };

function toKey({ scope, identifier }: ChatSessionKey): string {
  return `${scope}:${identifier.toLowerCase()}`;
}

function reducer(state: SessionsState, action: SessionAction): SessionsState {
  switch (action.type) {
    case 'UPSERT':
      return {
        ...state,
        [action.key]: action.session,
      };
    case 'CLEAR': {
      if (!state[action.key]) {
        return state;
      }
      const next = { ...state };
      delete next[action.key];
      return next;
    }
    default:
      return state;
  }
}

interface ChatContextValueInternal extends ChatContextValue {
  sessions: SessionsState;
}

const ChatContext = createContext<ChatContextValueInternal | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

function createEmptySession(key: ChatSessionKey): ChatSessionState {
  return {
    key,
    sessionId: generateId('session'),
    messages: [],
    followUps: [],
    isStreaming: false,
    error: null,
  };
}

function createUserMessage(text: string): ChatMessage {
  return {
    id: generateId('msg'),
    role: 'user',
    content: text,
    createdAt: Date.now(),
    status: 'completed',
  };
}

function createAssistantPlaceholder(): ChatMessage {
  return {
    id: generateId('msg'),
    role: 'assistant',
    content: '',
    createdAt: Date.now(),
    status: 'streaming',
  };
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [sessions, dispatch] = useReducer(reducer, {});

  const ensureSession = useCallback(
    (key: ChatSessionKey): ChatSessionState => {
      const mapKey = toKey(key);
      const existing = sessions[mapKey];

      logger.info('[ChatContext] ensureSession called:', {
        mapKey,
        hasExisting: !!existing,
        existingMessageCount: existing?.messages?.length ?? 0,
      });

      if (existing) {
        logger.info('[ChatContext] Returning existing session:', {
          messageCount: existing.messages.length,
          isStreaming: existing.isStreaming,
        });
        return existing;
      }

      const cached = getChatSession(key);
      logger.info('[ChatContext] Cached session:', {
        hasCached: !!cached,
        cachedMessageCount: cached?.messages?.length ?? 0,
      });

      const session = cached ?? createEmptySession(key);

      dispatch({ type: 'UPSERT', key: mapKey, session });
      if (!cached) {
        setChatSession(key, session.messages, session.followUps, session.sessionId);
      }

      logger.info('[ChatContext] Created/restored session:', {
        messageCount: session.messages.length,
        sessionId: session.sessionId,
      });

      return session;
    },
    [sessions]
  );

  const patchSession = useCallback(
    (key: ChatSessionKey, updater: (session: ChatSessionState) => ChatSessionState) => {
      const mapKey = toKey(key);
      const current = ensureSession(key);
      const next = updater(current);

      logger.info('[ChatContext] patchSession:', {
        mapKey,
        currentMessageCount: current.messages.length,
        nextMessageCount: next.messages.length,
        isStreaming: next.isStreaming,
      });

      dispatch({ type: 'UPSERT', key: mapKey, session: next });
      return next;
    },
    [ensureSession]
  );

  const getSession = useCallback(
    (key: ChatSessionKey) => {
      const mapKey = toKey(key);
      const existing = sessions[mapKey];

      if (existing) {
        logger.info('[ChatContext] getSession returning existing:', {
          mapKey,
          messageCount: existing.messages.length,
          isStreaming: existing.isStreaming,
        });
        return existing;
      }

      // セッションがない場合はキャッシュをチェック
      const cached = getChatSession(key);
      if (cached) {
        logger.info('[ChatContext] getSession returning cached:', {
          mapKey,
          messageCount: cached.messages.length,
        });
        return cached;
      }

      // どちらもない場合は空のセッションを返す（dispatchは呼ばない）
      logger.info('[ChatContext] getSession returning empty (no dispatch):', {
        mapKey,
      });
      return createEmptySession(key);
    },
    [sessions]
  );

  const clearSession = useCallback((key: ChatSessionKey) => {
    const mapKey = toKey(key);
    dispatch({ type: 'CLEAR', key: mapKey });
    clearChatSession(key);
  }, []);

  const sendMessage = useCallback<ChatContextValue['sendMessage']>(
    async ({ scope, identifier, text, context, streaming = true, detailLevel, targetLanguage }) => {
      const key: ChatSessionKey = { scope, identifier };
      const sessionBefore = ensureSession(key);

      logger.info('[ChatContext] sendMessage start:', {
        scope,
        identifier,
        text,
        detailLevel,
        sessionBeforeMessageCount: sessionBefore.messages.length,
      });

      const userMessage = createUserMessage(text);
      const assistantPlaceholder = createAssistantPlaceholder();

      let workingSession = {
        ...sessionBefore,
        messages: [...sessionBefore.messages, userMessage, assistantPlaceholder],
        isStreaming: streaming,
        error: null as string | null,
      };

      logger.info('[ChatContext] Created working session with messages:', {
        messageCount: workingSession.messages.length,
        messages: workingSession.messages.map(m => ({ role: m.role, content: m.content?.substring(0, 20) })),
      });

      dispatch({ type: 'UPSERT', key: toKey(key), session: workingSession });
      setChatSession(key, workingSession.messages, workingSession.followUps, workingSession.sessionId);

      const requestMessages = workingSession.messages.filter((msg) => msg.role !== 'assistant' || msg.id !== assistantPlaceholder.id);

      const request = {
        sessionId: workingSession.sessionId,
        scope,
        identifier,
        messages: requestMessages,
        context,
        detailLevel,
        targetLanguage,
      };

      const updateAssistant = (updater: (message: ChatMessage) => ChatMessage) => {
        const messages = workingSession.messages.map((msg) =>
          msg.id === assistantPlaceholder.id ? updater(msg) : msg
        );
        workingSession = {
          ...workingSession,
          messages,
        };

        logger.info('[ChatContext] updateAssistant:', {
          messageCount: workingSession.messages.length,
          assistantContent: workingSession.messages.find(m => m.id === assistantPlaceholder.id)?.content?.substring(0, 30),
        });

        dispatch({ type: 'UPSERT', key: toKey(key), session: workingSession });
        setChatSession(key, workingSession.messages, workingSession.followUps, workingSession.sessionId);
      };

      const finalizeSession = (session: ChatSessionState) => {
        setChatSession(key, session.messages, session.followUps, session.sessionId);
      };

      try {
        if (streaming) {
          // フィーチャーフラグに基づいてストリーミング方式を選択
          logger.info('[ChatContext] Starting streaming:', {
            method: USE_WEBSOCKET_STREAMING ? 'WebSocket' : 'XHR',
          });

          const stream = USE_WEBSOCKET_STREAMING
            ? await sendChatMessageStreamWebSocket(request)
            : sendChatMessageStream(request);
          let completion = null;

          while (true) {
            const { value, done } = await stream.next();
            if (done) {
              completion = value;
              break;
            }

            const event = value;
            if (!event) continue;

            if (event.type === 'content' && event.content) {
              updateAssistant((msg) => ({
                ...msg,
                content: msg.content + event.content,
              }));
            } else if (event.type === 'metadata') {
              workingSession = {
                ...workingSession,
                followUps: event.followUps ?? workingSession.followUps,
              };
              logger.info('[ChatContext] metadata update:', {
                followUpCount: workingSession.followUps.length,
              });
              dispatch({ type: 'UPSERT', key: toKey(key), session: workingSession });
              setChatSession(key, workingSession.messages, workingSession.followUps, workingSession.sessionId);
            }
          }

          if (completion) {
            const messages = workingSession.messages.map((msg) =>
              msg.id === assistantPlaceholder.id
                ? {
                    ...msg,
                    content: completion.message.content,
                    status: 'completed' as const,
                  }
                : msg
            );

            workingSession = {
              ...workingSession,
              messages,
              followUps: completion.followUps ?? workingSession.followUps,
              isStreaming: false,
              error: null,
            };

            logger.info('[ChatContext] streaming completed:', {
              messageCount: workingSession.messages.length,
              finalContent: completion.message.content?.substring(0, 50),
            });

            dispatch({ type: 'UPSERT', key: toKey(key), session: workingSession });
            finalizeSession(workingSession);
            return;
          }
        }

        // streaming をスキップする or completion が得られない場合
        const completion = await sendChatMessage(request);
        const messages = workingSession.messages.map((msg) =>
          msg.id === assistantPlaceholder.id
            ? {
                ...msg,
                content: completion.message.content,
                status: 'completed' as const,
              }
            : msg
        );
        workingSession = {
          ...workingSession,
          messages,
          followUps: completion.followUps ?? workingSession.followUps,
          isStreaming: false,
          error: null,
        };

        logger.info('[ChatContext] non-streaming completed:', {
          messageCount: workingSession.messages.length,
        });

        dispatch({ type: 'UPSERT', key: toKey(key), session: workingSession });
        finalizeSession(workingSession);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'チャットでエラーが発生しました';
        const messages = workingSession.messages.map((msg) =>
          msg.id === assistantPlaceholder.id
            ? {
                ...msg,
                status: 'error' as const,
                error: message,
              }
            : msg
        );
        workingSession = {
          ...workingSession,
          messages,
          isStreaming: false,
          error: message,
        };

        logger.error('[ChatContext] error occurred:', { error: message });

        dispatch({ type: 'UPSERT', key: toKey(key), session: workingSession });
        finalizeSession(workingSession);
      }
    },
    [ensureSession]
  );

  const value: ChatContextValueInternal = useMemo(
    () => ({
      getSession,
      sendMessage,
      clearSession,
      sessions,
    }),
    [getSession, sendMessage, clearSession, sessions]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextValueInternal {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
