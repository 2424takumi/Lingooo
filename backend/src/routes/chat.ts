import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { traceGeminiCall, logGeneration } from '../utils/langfuse';
import { getPrompt } from '../utils/prompt-loader';

const router = Router();

// Gemini クライアントを初期化
function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  return new GoogleGenerativeAI(apiKey);
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  sessionId: string;
  scope: string;
  identifier: string;
  messages: ChatMessage[];
  context?: {
    searchSuggestions?: Array<{
      lemma: string;
      shortSenseJa: string;
    }>;
  };
}

/**
 * チャット用のプロンプトを構築
 */
function buildChatPrompt(req: ChatRequest): string {
  const { scope, identifier, messages, context } = req;

  // Load system prompt from file
  const systemPrompt = getPrompt('chat', 'system', { identifier });

  const conversationHistory = messages
    .map(msg => `${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${msg.content}`)
    .join('\n\n');

  return `${systemPrompt}\n\n【会話履歴】\n${conversationHistory}\n\nアシスタント: `;
}

/**
 * フォローアップ質問を生成
 */
function generateFollowUps(question: string): string[] {
  const defaultFollowUps = ['類義語', '対義語', '語源', '例文'];

  // 質問内容に基づいてフォローアップを調整
  const asked = new Set<string>();

  if (question.includes('類義語')) asked.add('類義語');
  if (question.includes('対義語')) asked.add('対義語');
  if (question.includes('語源')) asked.add('語源');
  if (question.includes('例文')) asked.add('例文');

  return defaultFollowUps.filter(q => !asked.has(q));
}

/**
 * POST /api/chat
 * チャット応答（非ストリーミング）
 */
router.post('/', async (req: Request, res: Response) => {
  // Langfuse tracing
  const trace = traceGeminiCall({
    name: 'chat-completion',
    sessionId: req.body.sessionId,
    metadata: {
      scope: req.body.scope,
      identifier: req.body.identifier,
    },
  });

  const startTime = Date.now();

  try {
    const chatRequest: ChatRequest = req.body;

    if (!chatRequest.messages || chatRequest.messages.length === 0) {
      return res.status(400).json({ error: 'messages are required' });
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const temperature = parseFloat(process.env.GEMINI_TEMPERATURE || '0.7');
    const maxTokens = parseInt(process.env.GEMINI_MAX_TOKENS || '2048');

    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: temperature,
      },
    });

    const prompt = buildChatPrompt(chatRequest);

    // 通常の生成
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const endTime = Date.now();

    // Log to Langfuse
    if (trace) {
      logGeneration({
        trace,
        name: 'gemini-chat',
        model: modelName,
        prompt,
        completion: text,
        startTime,
        endTime,
        metadata: {
          temperature,
          maxTokens,
          latency: endTime - startTime,
          scope: chatRequest.scope,
          identifier: chatRequest.identifier,
        },
      });
    }

    // 最後のユーザーメッセージを取得してフォローアップを生成
    const lastUserMessage = chatRequest.messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'user');

    const followUps = lastUserMessage
      ? generateFollowUps(lastUserMessage.content)
      : ['類義語', '対義語', '語源', '例文'];

    res.json({
      message: {
        content: text,
        role: 'assistant',
      },
      followUps,
    });
  } catch (error) {
    console.error('Error in /chat:', error);

    // Log error to Langfuse
    if (trace) {
      trace.update({
        level: 'ERROR',
        statusMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    res.status(500).json({
      error: 'Failed to generate chat response',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/chat/stream
 * チャット応答（ストリーミング）
 */
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const chatRequest: ChatRequest = req.body;

    if (!chatRequest.messages || chatRequest.messages.length === 0) {
      return res.status(400).json({ error: 'messages are required' });
    }

    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      generationConfig: {
        maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '2048'),
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
      },
    });

    const prompt = buildChatPrompt(chatRequest);

    // Server-Sent Events (SSE) でストリーミング
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      // コンテンツチャンクを送信
      res.write(`data: ${JSON.stringify({ type: 'content', content: chunkText })}\n\n`);
    }

    // 最後のユーザーメッセージを取得してフォローアップを生成
    const lastUserMessage = chatRequest.messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'user');

    const followUps = lastUserMessage
      ? generateFollowUps(lastUserMessage.content)
      : ['類義語', '対義語', '語源', '例文'];

    // メタデータ（フォローアップ質問）を送信
    res.write(`data: ${JSON.stringify({ type: 'metadata', followUps })}\n\n`);

    // ストリーム終了
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error in /chat/stream:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate chat response',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } else {
      // エラーイベントを送信
      res.write(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
      res.end();
    }
  }
});

export default router;
