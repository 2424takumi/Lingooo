import type {
  ChatCompletion,
  ChatRequest,
  ChatStreamEvent,
  ChatMessage,
} from '@/types/chat';
import { generateId } from '@/utils/id';
import { logger } from '@/utils/logger';
import { authenticatedFetch, getAuthHeaders } from './client';

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
    const response = await authenticatedFetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({
        sessionId: req.sessionId,
        scope: req.scope,
        identifier: req.identifier,
        messages: req.messages,
        context: req.context,
        detailLevel: req.detailLevel,
        targetLanguage: req.targetLanguage,
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

/**
 * チャットストリームのコントローラー
 * キャンセル機能を提供
 */
export class ChatStreamController {
  private xhr: XMLHttpRequest | null = null;

  /**
   * ストリームをキャンセル
   */
  cancel(): void {
    if (this.xhr && this.xhr.readyState !== XMLHttpRequest.DONE && this.xhr.readyState !== XMLHttpRequest.UNSENT) {
      logger.info('[Chat API] Cancelling chat stream');
      this.xhr.abort();
      this.xhr = null;
    }
  }

  /**
   * XHRをセット（内部用）
   */
  _setXhr(xhr: XMLHttpRequest): void {
    this.xhr = xhr;
  }
}

export async function* sendChatMessageStream(
  req: ChatRequest,
  controller?: ChatStreamController
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

  // 認証ヘッダーを取得
  const authHeaders = await getAuthHeaders();

  // XMLHttpRequestでストリーミングを受信
  const xhr = new XMLHttpRequest();
  let accumulatedContent = '';
  let followUps: string[] = [];
  let buffer = '';
  let lastProcessedIndex = 0;

  // コントローラーにXHRをセット
  if (controller) {
    controller._setXhr(xhr);
  }

  xhr.open('POST', `${BACKEND_URL}/api/chat/stream`);
  xhr.setRequestHeader('Content-Type', 'application/json');

  // 認証ヘッダーを設定
  if (authHeaders.Authorization) {
    xhr.setRequestHeader('Authorization', authHeaders.Authorization);
  }

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

  xhr.onabort = () => {
    logger.info('[Chat API] XHR aborted by user');
    pushEvent({ type: 'error', error: new Error('Request cancelled') });
    isComplete = true;
  };

  xhr.send(
    JSON.stringify({
      sessionId: req.sessionId,
      scope: req.scope,
      identifier: req.identifier,
      messages: req.messages,
      context: req.context,
      detailLevel: req.detailLevel,
      targetLanguage: req.targetLanguage,
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
  } finally {
    // クリーンアップ: XHRをabortしてリソースリークを防ぐ
    if (xhr.readyState !== XMLHttpRequest.DONE && xhr.readyState !== XMLHttpRequest.UNSENT) {
      logger.info('[Chat API] Aborting XHR connection');
      xhr.abort();
    }
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

  // WebSocketストリーミングを開始（awaitを追加してエラーをキャッチ）
  try {
    await wsClient.streamChat(requestId, {
      sessionId: req.sessionId,
      scope: req.scope,
      identifier: req.identifier,
      messages: req.messages,
      context: req.context,
      detailLevel: req.detailLevel,
      targetLanguage: req.targetLanguage,
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
  } catch (connectionError) {
    // WebSocket接続エラーをキャッチ
    logger.error('[Chat API WebSocket] Connection error:', connectionError);
    error = connectionError instanceof Error ? connectionError : new Error('WebSocket connection failed');
    isComplete = true;
  }

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
    } finally {
      // クリーンアップ: WebSocketストリームをキャンセルしてコールバックリークを防ぐ
      if (!isComplete) {
        logger.info('[Chat API WebSocket] Cleaning up WebSocket stream (generator abandoned)');
        wsClient.cancelStream(requestId);
      }
    }
  })();
}

/**
 * 追加質問専用のストリーミング関数（チャットコンテキストを経由しない）
 * QAカード内の追加質問機能で使用
 */
export async function* sendFollowUpQuestionStream(
  req: ChatRequest,
  onContent: (content: string) => void,
  onComplete: (fullAnswer: string) => void,
  onError: (error: Error) => void
): AsyncGenerator<string, void, void> {
  const requestBody = {
    sessionId: req.sessionId,
    scope: req.scope,
    identifier: req.identifier,
    messages: req.messages,
    context: req.context,
    detailLevel: req.detailLevel,
    targetLanguage: req.targetLanguage,
  };

  logger.info('[Chat API] sendFollowUpQuestionStream called:', {
    scope: req.scope,
    identifier: req.identifier,
    messageCount: req.messages.length,
    url: `${BACKEND_URL}/api/chat/stream`,
    // 最初のメッセージの一部をログ（デバッグ用）
    firstMessagePreview: req.messages[0]?.content.substring(0, 100),
  });

  // 認証ヘッダーを取得
  const authHeaders = await getAuthHeaders();

  const xhr = new XMLHttpRequest();
  let accumulatedContent = '';
  let buffer = '';
  let lastProcessedIndex = 0;

  xhr.open('POST', `${BACKEND_URL}/api/chat/stream`);
  xhr.setRequestHeader('Content-Type', 'application/json');

  // 認証ヘッダーを設定
  if (authHeaders.Authorization) {
    xhr.setRequestHeader('Authorization', authHeaders.Authorization);
  }

  xhr.onprogress = () => {
    const newText = xhr.responseText.substring(lastProcessedIndex);
    lastProcessedIndex = xhr.responseText.length;

    if (newText.length > 0) {
      logger.debug('[Chat API] Progress event, new text length:', newText.length);
    }

    buffer += newText;

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);

        if (data === '[DONE]') {
          logger.info('[Chat API] Received [DONE] signal');
          continue;
        }

        try {
          const event = JSON.parse(data);

          if (event.type === 'content') {
            accumulatedContent += event.content;
            logger.debug('[Chat API] Content event, accumulated length:', accumulatedContent.length);
            onContent(event.content);
          } else if (event.type === 'error') {
            logger.error('[Chat API] Error event:', event.error);
            onError(new Error(event.error));
            return;
          }
        } catch (parseError) {
          logger.error('[Chat API] Failed to parse SSE event:', parseError);
        }
      }
    }
  };

  xhr.onload = () => {
    logger.info('[Chat API] XHR onload, status:', xhr.status, 'accumulated length:', accumulatedContent.length);
    if (xhr.status >= 200 && xhr.status < 300) {
      onComplete(accumulatedContent);
    } else {
      // サーバーからのエラーメッセージを取得
      let errorMessage = `HTTP error! status: ${xhr.status}`;
      try {
        const errorData = JSON.parse(xhr.responseText);
        if (errorData.error) {
          errorMessage += ` - ${errorData.error}`;
        }
        if (errorData.details) {
          errorMessage += ` (${errorData.details})`;
        }
        logger.error('[Chat API] Server error details:', errorData);
      } catch (e) {
        // JSONパースに失敗した場合、レスポンステキストをそのままログに出力
        logger.error('[Chat API] Server error response:', xhr.responseText.substring(0, 500));
      }
      onError(new Error(errorMessage));
    }
  };

  xhr.onerror = () => {
    logger.error('[Chat API] XHR error occurred');
    onError(new Error('Network error'));
  };

  logger.info('[Chat API] Sending XHR request');
  xhr.send(JSON.stringify(requestBody));
}
