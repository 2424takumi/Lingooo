import type {
  ChatCompletion,
  ChatRequest,
  ChatStreamEvent,
  ChatMessage,
} from '@/types/chat';
import { generateId } from '@/utils/id';
import { logger } from '@/utils/logger';

const BACKEND_URL = (() => {
  const url = process.env.EXPO_PUBLIC_BACKEND_URL;

  if (url) return url;

  if (__DEV__) {
    logger.warn('[Chat API] EXPO_PUBLIC_BACKEND_URL not set, using localhost');
    return 'http://localhost:3000';
  }

  throw new Error(
    'EXPO_PUBLIC_BACKEND_URL environment variable must be set in production. ' +
    'Please add it to your .env file or deployment configuration.'
  );
})();

function createAssistantMessage(content: string): ChatMessage {
  return {
    id: generateId('chat'),
    role: 'assistant',
    content,
    createdAt: Date.now(),
    status: 'completed',
  };
}

export async function sendChatMessage(req: ChatRequest): Promise<ChatCompletion> {
  logger.info('[Chat API] sendChatMessage called:', {
    scope: req.scope,
    identifier: req.identifier,
    backendUrl: BACKEND_URL,
  });

  try {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: req.sessionId,
        scope: req.scope,
        identifier: req.identifier,
        messages: req.messages,
        context: req.context,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    logger.info('[Chat API] Response received:', {
      contentLength: data.message?.content?.length ?? 0,
      followUpCount: data.followUps?.length ?? 0,
    });

    const message = createAssistantMessage(data.message.content);

    return {
      message,
      followUps: data.followUps ?? [],
    };
  } catch (error) {
    logger.error('[Chat API] Error in sendChatMessage:', error);
    throw error;
  }
}

export async function* sendChatMessageStream(
  req: ChatRequest
): AsyncGenerator<ChatStreamEvent, ChatCompletion, void> {
  logger.info('[Chat API] sendChatMessageStream called:', {
    scope: req.scope,
    identifier: req.identifier,
    messageCount: req.messages.length,
    backendUrl: BACKEND_URL,
  });

  // イベントキューを使ってXMLHttpRequestとAsyncGeneratorを接続
  const eventQueue: Array<ChatStreamEvent | { type: 'done'; result: ChatCompletion } | { type: 'error'; error: Error }> = [];
  let resolveNext: ((value: { done: boolean; value?: any }) => void) | null = null;
  let isComplete = false;

  const pushEvent = (event: any) => {
    eventQueue.push(event);
    if (resolveNext) {
      const resolve = resolveNext;
      resolveNext = null;
      resolve({ done: false, value: eventQueue.shift() });
    }
  };

  // XMLHttpRequestでストリーミングを受信
  const xhr = new XMLHttpRequest();
  let accumulatedContent = '';
  let followUps: string[] = [];
  let buffer = '';
  let lastProcessedIndex = 0;

  xhr.open('POST', `${BACKEND_URL}/api/chat/stream`);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onprogress = () => {
    const newText = xhr.responseText.substring(lastProcessedIndex);
    lastProcessedIndex = xhr.responseText.length;

    buffer += newText;

    // 改行で分割してイベントを処理
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // 最後の不完全な行はバッファに残す

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6); // "data: " を削除

        if (data === '[DONE]') {
          continue;
        }

        try {
          const event = JSON.parse(data);

          if (event.type === 'content') {
            accumulatedContent += event.content;
            pushEvent({ type: 'content', content: event.content } satisfies ChatStreamEvent);
          } else if (event.type === 'metadata') {
            followUps = event.followUps || [];
            pushEvent({ type: 'metadata', followUps } satisfies ChatStreamEvent);
          } else if (event.type === 'error') {
            pushEvent({ type: 'error', error: new Error(event.error) });
            return;
          }
        } catch (parseError) {
          logger.error('[Chat API] Failed to parse SSE event:', parseError);
        }
      }
    }
  };

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      const message = createAssistantMessage(accumulatedContent);
      const result: ChatCompletion = {
        message,
        followUps,
      };
      pushEvent({ type: 'done', result });
      isComplete = true;
    } else {
      pushEvent({ type: 'error', error: new Error(`HTTP error! status: ${xhr.status}`) });
      isComplete = true;
    }
  };

  xhr.onerror = () => {
    logger.error('[Chat API] XHR error occurred');
    pushEvent({ type: 'error', error: new Error('Network error') });
    isComplete = true;
  };

  xhr.send(
    JSON.stringify({
      sessionId: req.sessionId,
      scope: req.scope,
      identifier: req.identifier,
      messages: req.messages,
      context: req.context,
    })
  );

  // AsyncGeneratorとしてイベントをyield
  try {
    while (true) {
      let event: any;

      if (eventQueue.length > 0) {
        event = eventQueue.shift();
      } else if (isComplete) {
        break;
      } else {
        // 次のイベントを待つ
        event = await new Promise<any>((resolve) => {
          resolveNext = (result) => resolve(result.value);
        });
      }

      if (!event) continue;

      if (event.type === 'done') {
        return event.result;
      } else if (event.type === 'error') {
        throw event.error;
      } else {
        yield event as ChatStreamEvent;
      }
    }

    // 最終結果を返す
    const message = createAssistantMessage(accumulatedContent);
    return {
      message,
      followUps,
    };
  } catch (error) {
    logger.error('[Chat API] Error in sendChatMessageStream:', error);
    throw error;
  }
}

/**
 * WebSocket経由でチャットメッセージをストリーミング送信（新実装）
 *
 * @param req - チャットリクエスト
 * @returns チャット完了レスポンス
 */
export async function sendChatMessageStreamWebSocket(
  req: ChatRequest
): Promise<AsyncGenerator<ChatStreamEvent, ChatCompletion, undefined>> {
  const { wsClient } = await import('@/services/websocket/client');

  logger.info('[Chat API WebSocket] sendChatMessageStreamWebSocket called:', {
    scope: req.scope,
    identifier: req.identifier,
  });

  let accumulatedContent = '';
  let followUps: string[] = [];
  const eventQueue: ChatStreamEvent[] = [];
  let resolveNext: ((value: ChatStreamEvent) => void) | null = null;
  let isComplete = false;
  let error: Error | null = null;

  const requestId = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // WebSocketストリーミングを開始
  wsClient.streamChat(requestId, {
    sessionId: req.sessionId,
    scope: req.scope,
    identifier: req.identifier,
    messages: req.messages,
    context: req.context,
  }, {
    onChunk: (data) => {
      if (data.content) {
        accumulatedContent += data.content;
        const event: ChatStreamEvent = {
          type: 'content',
          content: data.content,
        };

        if (resolveNext) {
          resolveNext(event);
          resolveNext = null;
        } else {
          eventQueue.push(event);
        }
      }
    },
    onMetadata: (data) => {
      if (data.followUps) {
        followUps = data.followUps;
        const event: ChatStreamEvent = {
          type: 'metadata',
          followUps: data.followUps,
        };

        if (resolveNext) {
          resolveNext(event);
          resolveNext = null;
        } else {
          eventQueue.push(event);
        }
      }
    },
    onDone: () => {
      logger.info('[Chat API WebSocket] Stream completed');
      isComplete = true;
      if (resolveNext) {
        resolveNext({ type: 'metadata', followUps: [] });
        resolveNext = null;
      }
    },
    onError: (err) => {
      logger.error('[Chat API WebSocket] Stream error:', err);
      error = err;
      isComplete = true;
      if (resolveNext) {
        resolveNext({ type: 'metadata', followUps: [] });
        resolveNext = null;
      }
    },
  });

  // AsyncGeneratorとしてイベントをyield
  return (async function*() {
    try {
      while (true) {
        let event: ChatStreamEvent;

        if (eventQueue.length > 0) {
          event = eventQueue.shift()!;
        } else if (isComplete) {
          break;
        } else {
          // 次のイベントを待つ
          event = await new Promise<ChatStreamEvent>((resolve) => {
            resolveNext = resolve;
          });
        }

        if (error) {
          throw error;
        }

        yield event;
      }

      // 最終結果を返す
      const message = createAssistantMessage(accumulatedContent);
      return {
        message,
        followUps,
      };
    } catch (err) {
      logger.error('[Chat API WebSocket] Error in sendChatMessageStreamWebSocket:', err);
      throw err;
    }
  })();
}
