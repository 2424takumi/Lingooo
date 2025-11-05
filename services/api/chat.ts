import type {
  ChatCompletion,
  ChatRequest,
  ChatStreamEvent,
  ChatMessage,
} from '@/types/chat';
import { generateId } from '@/utils/id';
import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

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

  // 非ストリーミング版を使って完全な応答を取得
  const completion = await sendChatMessage(req);

  // チャンク単位でyieldして、ストリーミングのように見せかける
  const CHUNK_SIZE = 32;
  const content = completion.message.content;
  const chunks = content.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) ?? [content];

  for (const chunk of chunks) {
    // 少し遅延を入れてストリーミングのような体験を提供
    await new Promise(resolve => setTimeout(resolve, 50));
    yield { type: 'content', content: chunk } satisfies ChatStreamEvent;
  }

  // メタデータ（フォローアップ質問）を送信
  yield { type: 'metadata', followUps: completion.followUps } satisfies ChatStreamEvent;

  return completion;
}
